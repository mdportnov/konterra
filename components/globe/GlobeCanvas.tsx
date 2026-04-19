'use client'

import { memo, useRef, useEffect, useState, useCallback, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { feature } from 'topojson-client'
import { MeshPhongMaterial, Color } from 'three'
import type { Contact, ContactConnection, ContactCountryConnection, Trip } from '@/lib/db/schema'
import { countryNames, buildCountryLabels, normalizeToGlobeName } from './data/country-centroids'
import type { DisplayOptions } from '@/types/display'
import { Info, ChevronUp } from 'lucide-react'
import ClusterPopup from './ClusterPopup'
import GlobeRegionSelect from './GlobeRegionSelect'
import { useTheme } from '@/components/providers'
import { GLASS, Z } from '@/lib/constants/ui'
import { TRAVEL_COLORS, NETWORK_COLORS, CONNECTION_COLORS, POLYGON_COLORS, RING_COLORS, HEXBIN_COLORS } from '@/lib/constants/globe-colors'

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
  onGpsLocationDetected?: (data: { city: string; country: string }) => void
  display: DisplayOptions
  visitedCountries?: Set<string>
  wishlistCountries?: Map<string, { id: string }>
  connections?: ContactConnection[]
  countryConnections?: ContactCountryConnection[]
  highlightedContactIds?: Set<string>
  trips?: Trip[]
  selectedTripId?: string | null
  readOnly?: boolean
  regionSelectActive?: boolean
  onRegionSelect?: (ids: string[]) => void
  onRegionSelectDeactivate?: () => void
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
  onGpsLocationDetected,
  display,
  visitedCountries,
  wishlistCountries,
  connections = [],
  countryConnections = [],
  highlightedContactIds,
  trips = [],
  selectedTripId,
  readOnly = false,
  regionSelectActive = false,
  onRegionSelect,
  onRegionSelectDeactivate,
}: GlobeCanvasProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const globeRef = useRef<any>(null)
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 })
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(() => {
    if (typeof window === 'undefined') return null
    try {
      const raw = localStorage.getItem('konterra:globe-center')
      if (!raw) return null
      const cached = JSON.parse(raw) as { lat: number; lng: number; ts: number }
      if (typeof cached?.lat !== 'number' || typeof cached?.lng !== 'number' || !cached?.ts) return null
      if (Date.now() - cached.ts > 24 * 60 * 60 * 1000) return null
      return { lat: cached.lat, lng: cached.lng }
    } catch { return null }
  })
  const [userCountry, setUserCountry] = useState<string | null>(null)
  const globeReady = useRef(false)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [countries, setCountries] = useState<any[]>([])

  const [clusterData, setClusterData] = useState<ClusterData | null>(null)
  const [clusterOpen, setClusterOpen] = useState(false)
  const closingTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clusterMapRef = useRef<Map<string, Contact[]>>(new Map())

  const [legendsOpen, setLegendsOpen] = useState(() => {
    if (typeof window === 'undefined') return true
    const saved = localStorage.getItem('globe-legends-open')
    if (saved !== null) return saved === 'true'
    return !window.matchMedia('(max-width: 767px)').matches
  })

  const toggleLegends = useCallback(() => {
    setLegendsOpen((prev) => {
      const next = !prev
      localStorage.setItem('globe-legends-open', String(next))
      return next
    })
  }, [])

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
        const STALE_MS = 7 * 24 * 60 * 60 * 1000
        const updatedAt = d.currentLocationUpdatedAt ? new Date(d.currentLocationUpdatedAt).getTime() : 0
        const fresh = updatedAt > 0 && Date.now() - updatedAt < STALE_MS
        const lat = fresh ? (d.currentLat ?? d.lat) : d.lat
        const lng = fresh ? (d.currentLng ?? d.lng) : d.lng
        if (lat != null && lng != null) setUserLocation({ lat, lng })
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
            body: JSON.stringify({ ...loc, source: 'gps' }),
          })
            .then((r) => r.json())
            .then((d) => {
              if (d.currentCity && d.currentCountry && onGpsLocationDetected) {
                onGpsLocationDetected({ city: d.currentCity, country: d.currentCountry })
              }
            })
            .catch(() => {})
        },
        fetchSaved,
        { enableHighAccuracy: false, timeout: 10000 }
      )
    } else {
      fetchSaved()
    }
    const onLocationUpdated = (e: Event) => {
      const detail = (e as CustomEvent<{ lat: number; lng: number }>).detail
      if (detail && typeof detail.lat === 'number' && typeof detail.lng === 'number') {
        setUserLocation({ lat: detail.lat, lng: detail.lng })
      } else {
        fetchSaved()
      }
    }
    window.addEventListener('konterra:location-updated', onLocationUpdated)
    return () => window.removeEventListener('konterra:location-updated', onLocationUpdated)
  }, [readOnly, onGpsLocationDetected])

  useEffect(() => {
    if (!userLocation || readOnly) return
    try {
      localStorage.setItem('konterra:globe-center', JSON.stringify({ ...userLocation, ts: Date.now() }))
    } catch {}
  }, [userLocation, readOnly])

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
    if (!globeRef.current || !globeReady.current) return
    const controls = globeRef.current.controls()
    if (controls) controls.enabled = !regionSelectActive
  }, [regionSelectActive])

  const getScreenCoords = useCallback((lat: number, lng: number) => {
    if (!globeRef.current) return null
    const coords = globeRef.current.getScreenCoords(lat, lng, 0.015)
    if (!coords || coords.x == null || coords.y == null) return null
    return { x: coords.x, y: coords.y }
  }, [])

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

  const hasDensityOverlay = display.showHeatmap || display.showHexBins

  const getPolygonCapColor = useCallback((feat: object) => {
    const f = feat as { id?: string }
    const name = countryNames[String(f.id)]
    if (name) {
      if (showNetwork && !hasDensityOverlay) {
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
  }, [isDark, countryContactCount, visitedCountries, wishlistCountries, indirectOnlyCountries, userCountry, showNetwork, showTravel, pastTravelCountries, futureTravelCountries, hasDensityOverlay])

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
        if (showNetwork && !hasDensityOverlay) {
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
    [isDark, visitedCountries, wishlistCountries, countryContactCount, indirectOnlyCountries, userCountry, showNetwork, showTravel, pastTravelCountries, futureTravelCountries, hasDensityOverlay]
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

  const selectedLat = selectedContact?.lat ?? null
  const selectedLng = selectedContact?.lng ?? null

  const ringsData = useMemo(() => {
    if (selectedLat == null || selectedLng == null) return []
    return [{
      lat: selectedLat,
      lng: selectedLng,
      color: RING_COLORS.selected,
      maxR: 3,
      speed: 2,
      repeat: 800,
    }]
  }, [selectedLat, selectedLng])

  const heatmapData = useMemo(() => {
    if (!display.showHeatmap) return []
    const pts = contacts.filter((c) => c.lat != null && c.lng != null).map((c) => ({ lat: c.lat!, lng: c.lng! }))
    if (pts.length === 0) return []
    return [pts]
  }, [contacts, display.showHeatmap])

  const hexBinPoints = useMemo(() => {
    if (!display.showHexBins) return []
    return contacts.filter((c) => c.lat != null && c.lng != null).map((c) => ({ lat: c.lat!, lng: c.lng! }))
  }, [contacts, display.showHexBins])

  const getHexTopColor = useCallback((d: object) => {
    const hex = d as { sumWeight: number }
    if (hex.sumWeight >= 5) return HEXBIN_COLORS.high.top
    if (hex.sumWeight >= 3) return HEXBIN_COLORS.med.top
    return HEXBIN_COLORS.low.top
  }, [])

  const getHexSideColor = useCallback((d: object) => {
    const hex = d as { sumWeight: number }
    if (hex.sumWeight >= 5) return HEXBIN_COLORS.high.side
    if (hex.sumWeight >= 3) return HEXBIN_COLORS.med.side
    return HEXBIN_COLORS.low.side
  }, [])

  const getHexAltitude = useCallback((d: object) => {
    const hex = d as { sumWeight: number }
    return Math.min(hex.sumWeight * 0.04, 0.5)
  }, [])

  const getHexLabel = useCallback((d: object) => {
    const hex = d as { sumWeight: number }
    const count = Math.round(hex.sumWeight)
    const bg = isDark ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.9)'
    const textColor = isDark ? 'rgba(255,255,255,0.95)' : 'rgba(20,30,50,0.9)'
    const border = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'
    return `<div style="background:${bg};color:${textColor};padding:4px 8px;border-radius:6px;font-size:11px;backdrop-filter:blur(12px);border:1px solid ${border};font-family:system-ui,sans-serif"><b>${count}</b> contact${count === 1 ? '' : 's'}</div>`
  }, [isDark])

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
        showGraticules={display.showGraticules}
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
        pointsTransitionDuration={100}
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
        ringsData={ringsData}
        ringLat="lat"
        ringLng="lng"
        ringColor="color"
        ringMaxRadius="maxR"
        ringPropagationSpeed="speed"
        ringRepeatPeriod="repeat"
        ringResolution={48}
        heatmapsData={heatmapData}
        heatmapPointLat="lat"
        heatmapPointLng="lng"
        heatmapPointWeight={1}
        heatmapBandwidth={3.5}
        heatmapColorSaturation={1.8}
        heatmapBaseAltitude={0.008}
        heatmapTopAltitude={0.12}
        hexBinPointsData={hexBinPoints}
        hexBinPointLat="lat"
        hexBinPointLng="lng"
        hexBinResolution={4}
        hexMargin={0.3}
        hexAltitude={getHexAltitude}
        hexTopColor={getHexTopColor}
        hexSideColor={getHexSideColor}
        hexLabel={getHexLabel}
        hexTopCurvatureResolution={5}
        hexTransitionDuration={600}
        htmlElementsData={htmlElements}
        htmlLat="lat"
        htmlLng="lng"
        htmlAltitude={0.02}
        htmlElement={getHtmlElement}
      />
      <div className="absolute top-16 right-4 flex flex-col items-end gap-2" style={{ zIndex: Z.controls }}>
        <button
          onClick={toggleLegends}
          className={`${GLASS.control} rounded-lg h-7 w-7 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors`}
        >
          {legendsOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <Info className="h-3.5 w-3.5" />}
        </button>
        {legendsOpen && (() => {
          const showTravelSection = showTravel && trips.length > 0
          const showNetworkSection = showNetwork && (hasCountryContacts || countryConnections.length > 0)
          const hasVisited = !!visitedCountries && visitedCountries.size > 0
          const hasWishlist = !!wishlistCountries && wishlistCountries.size > 0
          const showGeoSection = hasVisited || hasWishlist || !!userCountry || futureTravelCountries.size > 0
          if (!showTravelSection && !showNetworkSection && !showGeoSection && !display.showHeatmap && !display.showHexBins) return null

          const Row = ({ swatch, label }: { swatch: React.ReactNode; label: string }) => (
            <div className="flex items-center gap-1.5">
              {swatch}
              <span className="text-[10px] text-muted-foreground">{label}</span>
            </div>
          )
          const Dot = ({ color, label }: { color: string; label: string }) => (
            <div className="flex items-center gap-1.5">
              <div className="w-3 flex justify-center shrink-0">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
              </div>
              <span className="text-[10px] text-muted-foreground">{label}</span>
            </div>
          )
          const SectionHeader = ({ children }: { children: React.ReactNode }) => (
            <div className="text-[9px] uppercase tracking-wider text-muted-foreground/50 mb-0.5">{children}</div>
          )
          const Sep = () => <div className="h-px bg-border/40 my-1.5" />

          let needSep = false
          return (
            <div className={`${GLASS.control} rounded-lg px-2.5 py-2 flex flex-col min-w-[180px]`}>
              {showTravelSection && (() => {
                const block = (
                  <div key="travel">
                    <SectionHeader>Travel</SectionHeader>
                    <div className="flex flex-col gap-1">
                      <Dot color={TRAVEL_COLORS.currentPoint} label="Current trip" />
                      <Dot color={TRAVEL_COLORS.pastPoint} label="Past trip" />
                      {futureTravelCountries.size > 0 && <Dot color={TRAVEL_COLORS.futurePoint} label="Upcoming trip" />}
                      {selectedTripId && <Dot color={TRAVEL_COLORS.selectedPoint} label="Selected trip" />}
                    </div>
                    <div className="text-[9px] text-muted-foreground/60 mt-1">
                      {trips.length} trips &middot; {pastTravelCountries.size} countries
                      {futureTravelCountries.size > 0 && ` \u00b7 ${futureTravelCountries.size} upcoming`}
                    </div>
                  </div>
                )
                needSep = true
                return block
              })()}

              {showNetworkSection && (
                <>
                  {needSep && <Sep />}
                  <div>
                    <SectionHeader>Network</SectionHeader>
                    <div className="flex flex-col gap-1">
                      <Row swatch={<div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: isDark ? POLYGON_COLORS.contactLow.dark : POLYGON_COLORS.contactLow.light }} />} label="1-2 contacts" />
                      <Row swatch={<div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: isDark ? POLYGON_COLORS.contactMed.dark : POLYGON_COLORS.contactMed.light }} />} label="3-5 contacts" />
                      <Row swatch={<div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: isDark ? POLYGON_COLORS.contactHigh.dark : POLYGON_COLORS.contactHigh.light }} />} label="5+ contacts" />
                      {hasVisited && (
                        <Row swatch={<div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: isDark ? POLYGON_COLORS.visitedContactLow.dark : POLYGON_COLORS.visitedContactLow.light, border: `1.5px solid ${isDark ? POLYGON_COLORS.visitedContactsStroke.dark : POLYGON_COLORS.visitedContactsStroke.light}` }} />} label="Visited + contacts" />
                      )}
                      {hasWishlist && hasCountryContacts && (
                        <Row swatch={<div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: isDark ? POLYGON_COLORS.contactLow.dark : POLYGON_COLORS.contactLow.light, border: `1.5px solid ${isDark ? POLYGON_COLORS.wishlistStroke.dark : POLYGON_COLORS.wishlistStroke.light}` }} />} label="Wishlist + contacts" />
                      )}
                      {countryConnections.length > 0 && (
                        <Row swatch={<div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: isDark ? POLYGON_COLORS.indirect.dark : POLYGON_COLORS.indirect.light, border: `1.5px solid ${isDark ? POLYGON_COLORS.indirectStroke.dark : POLYGON_COLORS.indirectStroke.light}` }} />} label="Indirect ties" />
                      )}
                    </div>
                  </div>
                  {(needSep = true)}
                </>
              )}

              {showGeoSection && (
                <>
                  {needSep && <Sep />}
                  <div>
                    <SectionHeader>Geography</SectionHeader>
                    <div className="flex flex-col gap-1">
                      {hasVisited && (
                        <Row swatch={<div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: isDark ? POLYGON_COLORS.visitedOnly.dark : POLYGON_COLORS.visitedOnly.light, border: `1.5px solid ${isDark ? POLYGON_COLORS.visitedStroke.dark : POLYGON_COLORS.visitedStroke.light}` }} />} label="Visited country" />
                      )}
                      {futureTravelCountries.size > 0 && (
                        <Row swatch={<div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: isDark ? TRAVEL_COLORS.futureCountry.dark : TRAVEL_COLORS.futureCountry.light, border: `1.5px solid ${isDark ? TRAVEL_COLORS.futureStroke.dark : TRAVEL_COLORS.futureStroke.light}` }} />} label="Upcoming country" />
                      )}
                      {hasWishlist && (
                        <Row swatch={<div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: isDark ? POLYGON_COLORS.wishlist.dark : POLYGON_COLORS.wishlist.light, border: `1.5px solid ${isDark ? POLYGON_COLORS.wishlistStroke.dark : POLYGON_COLORS.wishlistStroke.light}` }} />} label="Wishlist country" />
                      )}
                      {!!userCountry && (
                        <>
                          <Row swatch={<div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: isDark ? POLYGON_COLORS.userCountry.dark : POLYGON_COLORS.userCountry.light, border: `1.5px solid ${isDark ? POLYGON_COLORS.userCountryStroke.dark : POLYGON_COLORS.userCountryStroke.light}` }} />} label="Your country" />
                          <Row swatch={<div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#22c55e', border: '1.5px solid white', boxShadow: '0 0 4px rgba(34,197,94,0.5)' }} />} label="You are here" />
                        </>
                      )}
                    </div>
                  </div>
                  {(needSep = true)}
                </>
              )}

              {display.showHeatmap && (
                <>
                  {needSep && <Sep />}
                  <div>
                    <SectionHeader>Density</SectionHeader>
                    <Row swatch={<div className="w-2.5 h-2.5 rounded-sm" style={{ background: 'linear-gradient(90deg, rgba(0,0,255,0.3), rgba(0,255,0,0.5), rgba(255,255,0,0.7), rgba(255,0,0,0.9))' }} />} label="Heatmap" />
                  </div>
                  {(needSep = true)}
                </>
              )}

              {display.showHexBins && (
                <>
                  {needSep && <Sep />}
                  <div>
                    <SectionHeader>Hex bins</SectionHeader>
                    <div className="flex flex-col gap-1">
                      <Row swatch={<div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: HEXBIN_COLORS.low.top }} />} label="1-2 contacts" />
                      <Row swatch={<div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: HEXBIN_COLORS.med.top }} />} label="3-4 contacts" />
                      <Row swatch={<div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: HEXBIN_COLORS.high.top }} />} label="5+ contacts" />
                    </div>
                  </div>
                </>
              )}
            </div>
          )
        })()}
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
      <GlobeRegionSelect
        active={regionSelectActive}
        contacts={contacts}
        getScreenCoords={getScreenCoords}
        onSelect={onRegionSelect ?? (() => {})}
        onDeactivate={onRegionSelectDeactivate ?? (() => {})}
      />
    </div>
  )
})
