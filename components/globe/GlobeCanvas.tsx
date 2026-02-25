'use client'

import { memo, useRef, useEffect, useState, useCallback, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { feature } from 'topojson-client'
import { MeshPhongMaterial, Color } from 'three'
import type { Contact, ContactConnection, ContactCountryConnection, Trip } from '@/lib/db/schema'
import { countryNames, buildCountryLabels, normalizeToGlobeName } from './data/country-centroids'
import type { DisplayOptions } from '@/types/display'
import ClusterPopup from './ClusterPopup'
import { useTheme } from '@/components/providers'
import { GLASS } from '@/lib/constants/ui'
import { TRAVEL_COLORS, NETWORK_COLORS, CONNECTION_COLORS, POLYGON_COLORS } from '@/lib/constants/globe-colors'

const GlobeGL = dynamic(() => import('react-globe.gl'), { ssr: false })

interface GlobePoint {
  id: string
  lat: number
  lng: number
  name: string
  city?: string | null
  color: string
  size: number
  isUser?: boolean
  isCluster?: boolean
  count?: number
}

interface GlobeArc {
  startLat: number
  startLng: number
  endLat: number
  endLng: number
  color: string | [string, string]
  type?: 'contact' | 'country'
  isTravel?: boolean
}

interface ClusterData {
  contacts: Contact[]
  x: number
  y: number
  city: string
  key: string
}

interface GlobeCanvasProps {
  contacts: Contact[]
  selectedContact: Contact | null
  flyTarget: { lat: number; lng: number; ts: number } | null
  onContactClick: (contact: Contact) => void
  onCountryClick?: (country: string, event: { x: number; y: number }) => void
  onTripPointClick?: (tripId: string) => void
  display: DisplayOptions
  visitedCountries?: Set<string>
  wishlistCountries?: Map<string, { id: string }>
  connections?: ContactConnection[]
  countryConnections?: ContactCountryConnection[]
  highlightedContactIds?: Set<string>
  trips?: Trip[]
  selectedTripId?: string | null
  readOnly?: boolean
}

const EMPTY_ARCS: GlobeArc[] = []
const EXIT_MS = 150

export default memo(function GlobeCanvas({
  contacts,
  selectedContact,
  flyTarget,
  onContactClick,
  onCountryClick,
  onTripPointClick,
  display,
  visitedCountries,
  wishlistCountries,
  connections = [],
  countryConnections = [],
  highlightedContactIds,
  trips = [],
  selectedTripId,
  readOnly = false,
}: GlobeCanvasProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const globeRef = useRef<any>(null)
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 })
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [userCountry, setUserCountry] = useState<string | null>(null)
  const globeReady = useRef(false)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [countries, setCountries] = useState<any[]>([])

  const [clusterData, setClusterData] = useState<ClusterData | null>(null)
  const [clusterOpen, setClusterOpen] = useState(false)
  const closingTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clusterMapRef = useRef<Map<string, Contact[]>>(new Map())

  const { theme } = useTheme()
  const isDark = theme === 'dark' || (theme === 'system' && typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches)

  const globeMaterial = useMemo(() => {
    if (isDark) {
      return new MeshPhongMaterial({
        color: new Color('#080d25'),
        emissive: new Color('#040818'),
        emissiveIntensity: 0.8,
        shininess: 5,
      })
    }
    return new MeshPhongMaterial({
      color: new Color('#b8c8e0'),
      emissive: new Color('#a0b4d0'),
      emissiveIntensity: 0.3,
      shininess: 15,
    })
  }, [isDark])

  const countryContactCount = useMemo(() => {
    const counts = new Map<string, number>()
    for (const c of contacts) {
      if (c.country) {
        const name = normalizeToGlobeName(c.country)
        counts.set(name, (counts.get(name) || 0) + 1)
      }
    }
    return counts
  }, [contacts])

  const hasCountryContacts = useMemo(() => countryContactCount.size > 0, [countryContactCount])

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    import('world-atlas/countries-110m.json').then((worldData: any) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const countriesGeo = feature(worldData, worldData.objects.countries) as any
      setCountries(countriesGeo.features)
    })
  }, [])

  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect
      setDimensions({ width, height })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    if (readOnly) return
    const fetchSaved = () => {
      fetch('/api/me/location').then((r) => r.json()).then((d) => {
        if (d.lat != null && d.lng != null) setUserLocation({ lat: d.lat, lng: d.lng })
      }).catch(() => {})
    }
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude }
          setUserLocation(loc)
          fetch('/api/me/location', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(loc),
          }).catch(() => {})
        },
        fetchSaved,
        { enableHighAccuracy: false, timeout: 10000 }
      )
    } else {
      fetchSaved()
    }
  }, [readOnly])

  useEffect(() => {
    if (!userLocation || countries.length === 0) return
    import('d3-geo').then((mod) => {
      for (const feat of countries) {
        if (mod.geoContains(feat, [userLocation.lng, userLocation.lat])) {
          const name = countryNames[String(feat.id)]
          if (name) setUserCountry(name)
          break
        }
      }
    })
  }, [userLocation, countries])

  useEffect(() => {
    const init = () => {
      if (!globeRef.current) return false
      const renderer = globeRef.current.renderer()
      if (!renderer) return false
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
      const controls = globeRef.current.controls()
      controls.enableDamping = true
      controls.autoRotate = display.autoRotate
      controls.autoRotateSpeed = 0.5
      globeReady.current = true
      const target = userLocation || { lat: 20, lng: 0 }
      globeRef.current.pointOfView({ ...target, altitude: 2.2 }, 1000)
      return true
    }
    if (init()) return
    const interval = setInterval(() => {
      if (init()) clearInterval(interval)
    }, 100)
    return () => clearInterval(interval)
  }, [userLocation])

  useEffect(() => {
    if (!globeRef.current || !globeReady.current) return
    const controls = globeRef.current.controls()
    if (controls) controls.autoRotate = display.autoRotate
  }, [display.autoRotate])

  useEffect(() => {
    if (selectedContact?.lat != null && selectedContact?.lng != null && globeRef.current) {
      globeRef.current.pointOfView(
        { lat: selectedContact.lat, lng: selectedContact.lng, altitude: 1.5 },
        1000
      )
    }
  }, [selectedContact])

  useEffect(() => {
    if (flyTarget && globeRef.current) {
      globeRef.current.pointOfView(
        { lat: flyTarget.lat, lng: flyTarget.lng, altitude: 1.5 },
        1000
      )
    }
  }, [flyTarget])

  const openCluster = useCallback((data: ClusterData) => {
    if (closingTimer.current) clearTimeout(closingTimer.current)
    setClusterData(data)
    requestAnimationFrame(() => setClusterOpen(true))
  }, [])

  const closeCluster = useCallback(() => {
    setClusterOpen(false)
    closingTimer.current = setTimeout(() => setClusterData(null), EXIT_MS)
  }, [])

  const hasHighlights = highlightedContactIds && highlightedContactIds.size > 0

  const points: GlobePoint[] = useMemo(() => {
    const grouped = new Map<string, Contact[]>()
    contacts.filter((c) => c.lat && c.lng).forEach((c) => {
      const key = `${c.lat},${c.lng}`
      const arr = grouped.get(key) || []
      arr.push(c)
      grouped.set(key, arr)
    })

    clusterMapRef.current = grouped

    const pts: GlobePoint[] = []
    grouped.forEach((group, key) => {
      if (group.length === 1) {
        const c = group[0]
        const isHighlighted = hasHighlights && highlightedContactIds!.has(c.id)
        pts.push({
          id: c.id,
          lat: c.lat!,
          lng: c.lng!,
          name: c.name,
          city: c.city,
          color: isHighlighted ? NETWORK_COLORS.pointHighlighted : NETWORK_COLORS.point,
          size: isHighlighted ? 0.65 : 0.45,
        })
      } else {
        const highlightedInCluster = hasHighlights
          ? group.filter((c) => highlightedContactIds!.has(c.id)).length
          : 0
        const allHighlighted = hasHighlights && highlightedInCluster === group.length
        const someHighlighted = highlightedInCluster > 0
        pts.push({
          id: `cluster:${key}`,
          lat: group[0].lat!,
          lng: group[0].lng!,
          name: `${group.length} contacts`,
          city: group[0].city,
          color: allHighlighted ? NETWORK_COLORS.pointHighlighted : someHighlighted ? NETWORK_COLORS.pointClusterPartial : NETWORK_COLORS.pointCluster,
          size: (someHighlighted ? 0.55 : 0.45) + Math.min(group.length * 0.12, 0.6),
          isCluster: true,
          count: group.length,
        })
      }
    })

    return pts
  }, [contacts, hasHighlights, highlightedContactIds])

  const arcs: GlobeArc[] = useMemo(() => {
    const noMainArcs = display.arcMode === 'off'
    if (noMainArcs && !selectedContact) return EMPTY_ARCS

    const contactMap = new Map(contacts.filter((c) => c.lat && c.lng).map((c) => [c.id, c]))

    if (userLocation) {
      for (const c of contacts) {
        if (c.isSelf && !contactMap.has(c.id)) {
          contactMap.set(c.id, { ...c, lat: userLocation.lat, lng: userLocation.lng })
        }
      }
    }

    const result: GlobeArc[] = []
    const selectedId = selectedContact?.id

    for (const conn of connections) {
      const source = contactMap.get(conn.sourceContactId)
      const target = contactMap.get(conn.targetContactId)
      if (!source || !target) continue

      const involvesSelected = selectedId != null &&
        (source.id === selectedId || target.id === selectedId)

      if (noMainArcs && !involvesSelected) continue

      result.push({
        startLat: source.lat!,
        startLng: source.lng!,
        endLat: target.lat!,
        endLng: target.lng!,
        color: involvesSelected
          ? NETWORK_COLORS.selectedArc
          : CONNECTION_COLORS[conn.connectionType] || NETWORK_COLORS.defaultArc,
      })
    }
    return result
  }, [contacts, connections, display.arcMode, selectedContact, userLocation])

  const countryCentroids = useMemo(() => {
    const map = new Map<string, { lat: number; lng: number }>()
    for (const label of buildCountryLabels(countries)) {
      map.set(label.text, { lat: label.lat, lng: label.lng })
    }
    return map
  }, [countries])

  const indirectOnlyCountries = useMemo(() => {
    const ccCountries = new Set(countryConnections.map((cc) => normalizeToGlobeName(cc.country)))
    const directCountries = new Set<string>()
    for (const c of contacts) {
      if (c.country) directCountries.add(normalizeToGlobeName(c.country))
    }
    const result = new Set<string>()
    for (const country of ccCountries) {
      if (!directCountries.has(country)) result.add(country)
    }
    return result
  }, [countryConnections, contacts])

  const countryConnectionCountMap = useMemo(() => {
    const map = new Map<string, number>()
    for (const cc of countryConnections) {
      const name = normalizeToGlobeName(cc.country)
      map.set(name, (map.get(name) || 0) + 1)
    }
    return map
  }, [countryConnections])

  const tripCountsByCountry = useMemo(() => {
    const map = new Map<string, number>()
    for (const t of trips) {
      const name = normalizeToGlobeName(t.country)
      map.set(name, (map.get(name) || 0) + 1)
    }
    return map
  }, [trips])

  const countryArcs: GlobeArc[] = useMemo(() => {
    if (countryConnections.length === 0) return EMPTY_ARCS
    const noMainArcs = display.arcMode === 'off'
    const contactMap = new Map(contacts.filter((c) => c.lat && c.lng).map((c) => [c.id, c]))
    const selectedId = selectedContact?.id
    const result: GlobeArc[] = []

    for (const cc of countryConnections) {
      const contact = contactMap.get(cc.contactId)
      const centroid = countryCentroids.get(cc.country)
      if (!contact || !centroid) continue

      const involvesSelected = selectedId != null && contact.id === selectedId
      if (noMainArcs && !involvesSelected) continue

      result.push({
        startLat: contact.lat!,
        startLng: contact.lng!,
        endLat: centroid.lat,
        endLng: centroid.lng,
        color: involvesSelected
          ? NETWORK_COLORS.countryArcSelected
          : NETWORK_COLORS.countryArcDefault,
        type: 'country',
      })
    }
    return result
  }, [countryConnections, contacts, countryCentroids, display.arcMode, selectedContact])

  const { showNetwork, showTravel } = display

  const now = useMemo(() => new Date(), [])

  const travelPoints: GlobePoint[] = useMemo(() => {
    if (!showTravel || trips.length === 0) return []
    const sorted = [...trips].sort((a, b) => new Date(a.arrivalDate).getTime() - new Date(b.arrivalDate).getTime())
    return sorted
      .filter((t) => t.lat != null && t.lng != null)
      .map((t) => {
        const arrival = new Date(t.arrivalDate)
        const departure = t.departureDate ? new Date(t.departureDate) : arrival
        const isCurrent = arrival <= now && departure >= now
        const isFuture = arrival > now

        let color: string
        let size = 0.5
        if (t.id === selectedTripId) {
          color = TRAVEL_COLORS.selectedPoint
          size = 0.6
        } else if (isCurrent) {
          color = TRAVEL_COLORS.currentPoint
          size = 0.6
        } else if (isFuture) {
          color = TRAVEL_COLORS.futurePoint
        } else {
          color = TRAVEL_COLORS.pastPoint
        }

        return {
          id: `trip:${t.id}`,
          lat: t.lat!,
          lng: t.lng!,
          name: t.city,
          city: t.country,
          color,
          size,
        }
      })
  }, [showTravel, trips, now, selectedTripId])

  const travelArcs: GlobeArc[] = useMemo(() => {
    if (!showTravel || trips.length === 0) return EMPTY_ARCS
    const sorted = [...trips]
      .filter((t) => t.lat != null && t.lng != null)
      .sort((a, b) => new Date(a.arrivalDate).getTime() - new Date(b.arrivalDate).getTime())

    const currentTripIds = new Set<string>()
    for (const t of sorted) {
      const arrival = new Date(t.arrivalDate)
      const departure = t.departureDate ? new Date(t.departureDate) : arrival
      if (arrival <= now && departure >= now) currentTripIds.add(t.id)
    }

    const result: GlobeArc[] = []
    for (let i = 0; i < sorted.length - 1; i++) {
      const fromId = sorted[i].id
      const toId = sorted[i + 1].id
      const involvesSelected = selectedTripId != null && (fromId === selectedTripId || toId === selectedTripId)
      const involvesCurrent = currentTripIds.has(fromId) || currentTripIds.has(toId)
      const nextIsFuture = new Date(sorted[i + 1].arrivalDate) > now

      let color: string
      if (involvesSelected) {
        color = TRAVEL_COLORS.selectedArc
      } else if (involvesCurrent) {
        color = TRAVEL_COLORS.currentArc
      } else if (nextIsFuture) {
        color = TRAVEL_COLORS.futureArc
      } else {
        color = TRAVEL_COLORS.pastArc
      }

      result.push({
        startLat: sorted[i].lat!,
        startLng: sorted[i].lng!,
        endLat: sorted[i + 1].lat!,
        endLng: sorted[i + 1].lng!,
        color,
        isTravel: true,
      })
    }
    return result
  }, [showTravel, trips, now, selectedTripId])

  const pastTravelCountries = useMemo(() => {
    if (!showTravel) return new Set<string>()
    return new Set(trips.filter((t) => new Date(t.arrivalDate) <= now).map((t) => normalizeToGlobeName(t.country)))
  }, [showTravel, trips, now])

  const futureTravelCountries = useMemo(() => {
    if (!showTravel) return new Set<string>()
    const future = new Set(trips.filter((t) => new Date(t.arrivalDate) > now).map((t) => normalizeToGlobeName(t.country)))
    for (const c of pastTravelCountries) future.delete(c)
    return future
  }, [showTravel, trips, now, pastTravelCountries])

  const userPoint = useMemo(() => {
    if (!userLocation) return null
    return {
      id: 'user',
      lat: userLocation.lat,
      lng: userLocation.lng,
      name: 'You',
      city: null,
      color: NETWORK_COLORS.userPoint,
      size: 0.55,
      isUser: true,
    } as GlobePoint
  }, [userLocation])

  const activePoints = useMemo(() => {
    let pts: GlobePoint[]
    if (showNetwork && showTravel) pts = [...points, ...travelPoints]
    else if (showTravel) pts = [...travelPoints]
    else pts = [...points]
    if (userPoint && !pts.some((p) => p.id === 'user')) pts.unshift(userPoint)
    return pts
  }, [showNetwork, showTravel, points, travelPoints, userPoint])

  const allArcs = useMemo(() => {
    const result: GlobeArc[] = []
    if (showNetwork) result.push(...arcs, ...countryArcs)
    if (showTravel) result.push(...travelArcs)
    return result
  }, [showNetwork, showTravel, travelArcs, arcs, countryArcs])

  const getArcStroke = useCallback((arc: object) => {
    if ((arc as GlobeArc).isTravel) return 1.2
    return (arc as GlobeArc).type === 'country' ? 0.25 : 0.4
  }, [])

  const getArcDashLength = useCallback((arc: object) => {
    if ((arc as GlobeArc).isTravel) return 1
    if ((arc as GlobeArc).type === 'country') return 0.3
    return display.arcMode === 'static' ? 1 : 0.5
  }, [display.arcMode])

  const getArcDashGap = useCallback((arc: object) => {
    if ((arc as GlobeArc).isTravel) return 0
    if ((arc as GlobeArc).type === 'country') return 0.2
    return display.arcMode === 'static' ? 0 : 0.3
  }, [display.arcMode])

  const handlePointClick = useCallback(
    (point: object, event: MouseEvent) => {
      const p = point as GlobePoint
      if (p.isUser) return

      if (p.id.startsWith('trip:')) {
        const tripId = p.id.replace('trip:', '')
        onTripPointClick?.(tripId)
        return
      }

      if (p.isCluster) {
        const key = p.id.replace('cluster:', '')
        if (clusterData?.key === key && clusterOpen) {
          closeCluster()
          return
        }
        const group = clusterMapRef.current.get(key)
        if (group) {
          openCluster({
            contacts: group,
            x: event.clientX,
            y: event.clientY,
            city: p.city || '',
            key,
          })
        }
        return
      }

      closeCluster()
      const contact = contacts.find((c) => c.id === p.id)
      if (contact) onContactClick(contact)
    },
    [contacts, onContactClick, onTripPointClick, clusterData, clusterOpen, openCluster, closeCluster]
  )

  const handleClusterSelect = useCallback(
    (contact: Contact) => {
      closeCluster()
      onContactClick(contact)
    },
    [onContactClick, closeCluster]
  )

  const handlePolygonClick = useCallback(
    (feat: object, event: MouseEvent) => {
      if (!onCountryClick) return
      const f = feat as { id?: string }
      const name = countryNames[String(f.id)]
      if (!name) return
      closeCluster()
      onCountryClick(name, { x: event.clientX, y: event.clientY })
    },
    [onCountryClick, closeCluster]
  )

  const getPointLabel = useCallback((point: object) => {
    const p = point as GlobePoint
    const base = 'padding:5px 10px;border-radius:6px;font-size:11px;backdrop-filter:blur(12px);font-family:system-ui,sans-serif;line-height:1.4'
    const dark = `background:rgba(0,0,0,0.8);color:rgba(255,255,255,0.95);border:1px solid rgba(255,255,255,0.1);${base}`
    if (p.isUser) return `<div style="background:rgba(34,197,94,0.9);color:white;font-weight:600;${base}">You</div>`
    if (p.isCluster) return `<div style="${dark}"><b>${p.count} contacts</b>${p.city ? `<br/><span style="opacity:0.55;font-size:10px">${p.city}</span>` : ''}</div>`
    return `<div style="${dark}"><b>${p.name}</b>${p.city ? `<br/><span style="opacity:0.55;font-size:10px">${p.city}</span>` : ''}</div>`
  }, [])

  const getPolygonLabel = useCallback((feat: object) => {
    const f = feat as { id?: string }
    const name = countryNames[String(f.id)]
    if (!name) return ''
    const bg = isDark ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.9)'
    const textColor = isDark ? 'rgba(255,255,255,0.95)' : 'rgba(20,30,50,0.9)'
    const border = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'
    const parts: string[] = [`<b>${name}</b>`]
    if (showNetwork) {
      const count = countryContactCount.get(name) || 0
      const indirectCount = countryConnectionCountMap.get(name) || 0
      if (count > 0) parts.push(`${count} contact${count === 1 ? '' : 's'}`)
      if (indirectCount > 0) parts.push(`${indirectCount} indirect tie${indirectCount === 1 ? '' : 's'}`)
    }
    if (showTravel) {
      const tripCount = tripCountsByCountry.get(name) || 0
      if (tripCount > 0) parts.push(`${tripCount} trip${tripCount === 1 ? '' : 's'}`)
      if (futureTravelCountries.has(name)) parts.push('Upcoming')
    }
    if (visitedCountries?.has(name)) parts.push('Visited')
    if (wishlistCountries?.has(name)) parts.push('Wishlist')
    if (userCountry && name === userCountry) parts.push('Your location')
    const label = parts.join(' <span style="opacity:0.4">&middot;</span> ')
    return `<div style="background:${bg};color:${textColor};padding:5px 10px;border-radius:6px;font-size:11px;backdrop-filter:blur(12px);border:1px solid ${border};font-family:system-ui,sans-serif;line-height:1.4;box-shadow:0 2px 8px rgba(0,0,0,${isDark ? '0.4' : '0.08'})">${label}</div>`
  }, [isDark, countryContactCount, countryConnectionCountMap, visitedCountries, wishlistCountries, userCountry, showNetwork, showTravel, tripCountsByCountry, futureTravelCountries])

  const getPolygonCapColor = useCallback((feat: object) => {
    const f = feat as { id?: string }
    const name = countryNames[String(f.id)]
    if (name) {
      if (showNetwork) {
        const count = countryContactCount.get(name) || 0
        const isVisited = visitedCountries?.has(name)
        const isIndirectOnly = indirectOnlyCountries.has(name)
        if (count > 0 && isVisited) {
          if (count > 5) return isDark ? POLYGON_COLORS.visitedContactHigh.dark : POLYGON_COLORS.visitedContactHigh.light
          if (count >= 3) return isDark ? POLYGON_COLORS.visitedContactMed.dark : POLYGON_COLORS.visitedContactMed.light
          return isDark ? POLYGON_COLORS.visitedContactLow.dark : POLYGON_COLORS.visitedContactLow.light
        }
        if (count > 5) return isDark ? POLYGON_COLORS.contactHigh.dark : POLYGON_COLORS.contactHigh.light
        if (count >= 3) return isDark ? POLYGON_COLORS.contactMed.dark : POLYGON_COLORS.contactMed.light
        if (count >= 1) return isDark ? POLYGON_COLORS.contactLow.dark : POLYGON_COLORS.contactLow.light
        if (isIndirectOnly) return isDark ? POLYGON_COLORS.indirect.dark : POLYGON_COLORS.indirect.light
      }
      if (showTravel) {
        const hasContactFill = showNetwork && (countryContactCount.get(name) || 0) > 0
        if (!hasContactFill) {
          if (futureTravelCountries.has(name)) return isDark ? TRAVEL_COLORS.futureCountry.dark : TRAVEL_COLORS.futureCountry.light
          if (pastTravelCountries.has(name)) return isDark ? TRAVEL_COLORS.pastCountry.dark : TRAVEL_COLORS.pastCountry.light
        }
      }
      if (visitedCountries?.has(name) && wishlistCountries?.has(name)) return isDark ? POLYGON_COLORS.wishlistVisited.dark : POLYGON_COLORS.wishlistVisited.light
      if (visitedCountries?.has(name)) return isDark ? POLYGON_COLORS.visitedOnly.dark : POLYGON_COLORS.visitedOnly.light
      if (wishlistCountries?.has(name)) return isDark ? POLYGON_COLORS.wishlist.dark : POLYGON_COLORS.wishlist.light
      if (userCountry && name === userCountry) return isDark ? POLYGON_COLORS.userCountry.dark : POLYGON_COLORS.userCountry.light
    }
    return isDark ? POLYGON_COLORS.defaultCap.dark : POLYGON_COLORS.defaultCap.light
  }, [isDark, countryContactCount, visitedCountries, wishlistCountries, indirectOnlyCountries, userCountry, showNetwork, showTravel, pastTravelCountries, futureTravelCountries])

  const getPolygonSideColor = useCallback(
    () => isDark ? POLYGON_COLORS.defaultSide.dark : POLYGON_COLORS.defaultSide.light,
    [isDark]
  )

  const getPolygonStrokeColor = useCallback(
    (feat: object) => {
      const f = feat as { id?: string }
      const name = countryNames[String(f.id)]
      if (name) {
        const isVisited = visitedCountries?.has(name)
        const isWishlist = wishlistCountries?.has(name)
        if (showNetwork) {
          const count = countryContactCount.get(name) || 0
          const isIndirectOnly = indirectOnlyCountries.has(name)
          if (count > 0 && isWishlist) return isDark ? POLYGON_COLORS.wishlistStroke.dark : POLYGON_COLORS.wishlistStroke.light
          if (isVisited && count > 0) return isDark ? POLYGON_COLORS.visitedContactsStroke.dark : POLYGON_COLORS.visitedContactsStroke.light
          if (count > 0) return isDark ? POLYGON_COLORS.contactStroke.dark : POLYGON_COLORS.contactStroke.light
          if (isIndirectOnly) return isDark ? POLYGON_COLORS.indirectStroke.dark : POLYGON_COLORS.indirectStroke.light
        }
        if (showTravel) {
          const hasContactStroke = showNetwork && (countryContactCount.get(name) || 0) > 0
          if (!hasContactStroke) {
            if (isWishlist && (futureTravelCountries.has(name) || pastTravelCountries.has(name))) return isDark ? POLYGON_COLORS.wishlistStroke.dark : POLYGON_COLORS.wishlistStroke.light
            if (futureTravelCountries.has(name)) return isDark ? TRAVEL_COLORS.futureStroke.dark : TRAVEL_COLORS.futureStroke.light
            if (pastTravelCountries.has(name)) return isDark ? TRAVEL_COLORS.pastStroke.dark : TRAVEL_COLORS.pastStroke.light
          }
        }
        if (isVisited && isWishlist) return isDark ? POLYGON_COLORS.wishlistVisitedStroke.dark : POLYGON_COLORS.wishlistVisitedStroke.light
        if (isVisited) return isDark ? POLYGON_COLORS.visitedStroke.dark : POLYGON_COLORS.visitedStroke.light
        if (isWishlist) return isDark ? POLYGON_COLORS.wishlistStroke.dark : POLYGON_COLORS.wishlistStroke.light
        if (userCountry && name === userCountry) return isDark ? POLYGON_COLORS.userCountryStroke.dark : POLYGON_COLORS.userCountryStroke.light
      }
      return isDark ? POLYGON_COLORS.defaultStroke.dark : POLYGON_COLORS.defaultStroke.light
    },
    [isDark, visitedCountries, wishlistCountries, countryContactCount, indirectOnlyCountries, userCountry, showNetwork, showTravel, pastTravelCountries, futureTravelCountries]
  )

  const getPointColor = useCallback((point: object) => {
    const p = point as GlobePoint
    if (p.isUser) return 'rgba(0,0,0,0)'
    return p.color
  }, [])
  const getPointRadius = useCallback((point: object) => {
    const p = point as GlobePoint
    if (p.isUser) return 0
    return p.size
  }, [])

  const htmlElements = useMemo(() => {
    if (!userLocation) return []
    return [{ lat: userLocation.lat, lng: userLocation.lng }]
  }, [userLocation])

  const getHtmlElement = useCallback(() => {
    const wrapper = document.createElement('div')
    wrapper.style.cssText = 'position:relative;width:0;height:0;pointer-events:none'
    const ring = document.createElement('div')
    ring.style.cssText = 'position:absolute;left:-16px;top:-16px;width:32px;height:32px;border-radius:50%;border:2px solid #22c55e;animation:user-ping 2s cubic-bezier(0,0,0.2,1) infinite;opacity:0'
    wrapper.appendChild(ring)
    const ring2 = document.createElement('div')
    ring2.style.cssText = 'position:absolute;left:-12px;top:-12px;width:24px;height:24px;border-radius:50%;background:rgba(34,197,94,0.15);border:1.5px solid rgba(34,197,94,0.4)'
    wrapper.appendChild(ring2)
    const dot = document.createElement('div')
    dot.style.cssText = 'position:absolute;left:-6px;top:-6px;width:12px;height:12px;border-radius:50%;background:#22c55e;box-shadow:0 0 8px rgba(34,197,94,0.6),0 0 2px rgba(34,197,94,0.8);border:2px solid white'
    wrapper.appendChild(dot)
    return wrapper
  }, [])

  const getArcColor = useCallback((arc: object) => (arc as GlobeArc).color, [])
  const getArcAnimateTime = useCallback((arc: object) => {
    if ((arc as GlobeArc).isTravel) return 0
    return display.arcMode === 'animated' ? 1800 : 0
  }, [display.arcMode])

  return (
    <div ref={containerRef} className="absolute inset-0 bg-[#e8edf2] dark:bg-[#050816]">
      <GlobeGL
        ref={globeRef}
        width={dimensions.width}
        height={dimensions.height}
        globeMaterial={globeMaterial}
        rendererConfig={{ antialias: true, alpha: true }}
        backgroundColor="rgba(0,0,0,0)"
        atmosphereColor={isDark ? '#1a3a7a' : '#6b8cc7'}
        atmosphereAltitude={0.18}
        polygonsData={countries}
        polygonCapColor={getPolygonCapColor}
        polygonSideColor={getPolygonSideColor}
        polygonStrokeColor={getPolygonStrokeColor}
        polygonLabel={getPolygonLabel}
        polygonAltitude={0.006}
        onPolygonClick={handlePolygonClick}
        pointsData={activePoints}
        pointLat="lat"
        pointLng="lng"
        pointColor={getPointColor}
        pointRadius={getPointRadius}
        pointAltitude={0.015}
        pointLabel={getPointLabel}
        onPointClick={handlePointClick}
        arcsData={allArcs}
        arcStartLat="startLat"
        arcStartLng="startLng"
        arcEndLat="endLat"
        arcEndLng="endLng"
        arcColor={getArcColor}
        arcDashLength={getArcDashLength}
        arcDashGap={getArcDashGap}
        arcDashAnimateTime={getArcAnimateTime}
        arcStroke={getArcStroke}
        arcsTransitionDuration={0}
        htmlElementsData={htmlElements}
        htmlLat="lat"
        htmlLng="lng"
        htmlAltitude={0.02}
        htmlElement={getHtmlElement}
      />
      <div className="absolute top-14 right-4 flex flex-col gap-2">
        {showTravel && trips.length > 0 && (
          <div className={`${GLASS.control} rounded-lg px-2.5 py-2 flex flex-col gap-1`}>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: TRAVEL_COLORS.currentPoint }} />
              <span className="text-[10px] text-muted-foreground">Current trip</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: TRAVEL_COLORS.pastPoint }} />
              <span className="text-[10px] text-muted-foreground">Past trip</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: isDark ? TRAVEL_COLORS.pastCountry.dark : TRAVEL_COLORS.pastCountry.light }} />
              <span className="text-[10px] text-muted-foreground">Visited country</span>
            </div>
            {futureTravelCountries.size > 0 && (
              <>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: TRAVEL_COLORS.futurePoint }} />
                  <span className="text-[10px] text-muted-foreground">Upcoming trip</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: isDark ? TRAVEL_COLORS.futureCountry.dark : TRAVEL_COLORS.futureCountry.light }} />
                  <span className="text-[10px] text-muted-foreground">Upcoming country</span>
                </div>
              </>
            )}
            {selectedTripId && (
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: TRAVEL_COLORS.selectedPoint }} />
                <span className="text-[10px] text-muted-foreground">Selected trip</span>
              </div>
            )}
            <div className="text-[9px] text-muted-foreground/60 mt-0.5">
              {trips.length} trips &middot; {pastTravelCountries.size} countries
              {futureTravelCountries.size > 0 && ` \u00b7 ${futureTravelCountries.size} upcoming`}
            </div>
          </div>
        )}
        {showNetwork && (hasCountryContacts || countryConnections.length > 0) && (
          <div className={`${GLASS.control} rounded-lg px-2.5 py-2 flex flex-col gap-1`}>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: isDark ? POLYGON_COLORS.contactLow.dark : POLYGON_COLORS.contactLow.light }} />
              <span className="text-[10px] text-muted-foreground">1-2 contacts</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: isDark ? POLYGON_COLORS.contactMed.dark : POLYGON_COLORS.contactMed.light }} />
              <span className="text-[10px] text-muted-foreground">3-5 contacts</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: isDark ? POLYGON_COLORS.contactHigh.dark : POLYGON_COLORS.contactHigh.light }} />
              <span className="text-[10px] text-muted-foreground">5+ contacts</span>
            </div>
            {visitedCountries && visitedCountries.size > 0 && (
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: isDark ? POLYGON_COLORS.visitedContactLow.dark : POLYGON_COLORS.visitedContactLow.light, border: `1.5px solid ${isDark ? POLYGON_COLORS.visitedContactsStroke.dark : POLYGON_COLORS.visitedContactsStroke.light}` }} />
                <span className="text-[10px] text-muted-foreground">Visited + contacts</span>
              </div>
            )}
            {wishlistCountries && wishlistCountries.size > 0 && hasCountryContacts && (
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: isDark ? POLYGON_COLORS.contactLow.dark : POLYGON_COLORS.contactLow.light, border: `1.5px solid ${isDark ? POLYGON_COLORS.wishlistStroke.dark : POLYGON_COLORS.wishlistStroke.light}` }} />
                <span className="text-[10px] text-muted-foreground">Contacts + wishlist</span>
              </div>
            )}
            {countryConnections.length > 0 && (
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: isDark ? POLYGON_COLORS.indirect.dark : POLYGON_COLORS.indirect.light, border: `1.5px solid ${isDark ? POLYGON_COLORS.indirectStroke.dark : POLYGON_COLORS.indirectStroke.light}` }} />
                <span className="text-[10px] text-muted-foreground">Indirect ties</span>
              </div>
            )}
          </div>
        )}
        {((visitedCountries && visitedCountries.size > 0) || (wishlistCountries && wishlistCountries.size > 0) || !!userCountry) && (
          <div className={`${GLASS.control} rounded-lg px-2.5 py-2 flex flex-col gap-1`}>
            {visitedCountries && visitedCountries.size > 0 && (
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: isDark ? POLYGON_COLORS.visitedOnly.dark : POLYGON_COLORS.visitedOnly.light, border: `1.5px solid ${isDark ? POLYGON_COLORS.visitedStroke.dark : POLYGON_COLORS.visitedStroke.light}` }} />
                <span className="text-[10px] text-muted-foreground">Visited</span>
              </div>
            )}
            {wishlistCountries && wishlistCountries.size > 0 && (
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: isDark ? POLYGON_COLORS.wishlist.dark : POLYGON_COLORS.wishlist.light, border: `1.5px solid ${isDark ? POLYGON_COLORS.wishlistStroke.dark : POLYGON_COLORS.wishlistStroke.light}` }} />
                <span className="text-[10px] text-muted-foreground">Wishlist</span>
              </div>
            )}
            {!!userCountry && (
              <>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: isDark ? POLYGON_COLORS.userCountry.dark : POLYGON_COLORS.userCountry.light, border: `1.5px solid ${isDark ? POLYGON_COLORS.userCountryStroke.dark : POLYGON_COLORS.userCountryStroke.light}` }} />
                  <span className="text-[10px] text-muted-foreground">Your country</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#22c55e', border: '1.5px solid white', boxShadow: '0 0 4px rgba(34,197,94,0.5)' }} />
                  <span className="text-[10px] text-muted-foreground">You are here</span>
                </div>
              </>
            )}
          </div>
        )}
      </div>
      {clusterData && (
        <ClusterPopup
          open={clusterOpen}
          contacts={clusterData.contacts}
          x={clusterData.x}
          y={clusterData.y}
          city={clusterData.city}
          onSelect={handleClusterSelect}
          onClose={closeCluster}
        />
      )}
    </div>
  )
})
