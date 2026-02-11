'use client'

import { memo, useRef, useEffect, useState, useCallback, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { feature } from 'topojson-client'
import { MeshPhongMaterial, Color } from 'three'
import type { Contact, ContactConnection, ContactCountryConnection } from '@/lib/db/schema'
import { countryNames, buildCountryLabels } from './data/country-centroids'
import type { DisplayOptions } from '@/types/display'
import ClusterPopup from './ClusterPopup'
import { useTheme } from '@/components/providers'
import { GLASS } from '@/lib/constants/ui'

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
  color: string
  type?: 'contact' | 'country'
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
  display: DisplayOptions
  visitedCountries?: Set<string>
  connections?: ContactConnection[]
  countryConnections?: ContactCountryConnection[]
}

const EMPTY_ARCS: GlobeArc[] = []
const EXIT_MS = 150

function ContactDensityLegend({ isDark, visitedCountries, hasIndirect }: { isDark: boolean; visitedCountries?: Set<string>; hasIndirect?: boolean }) {
  const hasVisited = visitedCountries && visitedCountries.size > 0

  return (
    <div className={`absolute top-4 right-4 ${GLASS.control} rounded-lg px-2.5 py-2 flex flex-col gap-1`}>
      <div className="flex items-center gap-1.5">
        <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: isDark ? 'rgba(234, 88, 12, 0.35)' : 'rgba(234, 88, 12, 0.25)' }} />
        <span className="text-[10px] text-muted-foreground">1-2 contacts</span>
      </div>
      <div className="flex items-center gap-1.5">
        <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: isDark ? 'rgba(234, 88, 12, 0.55)' : 'rgba(234, 88, 12, 0.4)' }} />
        <span className="text-[10px] text-muted-foreground">3-5 contacts</span>
      </div>
      <div className="flex items-center gap-1.5">
        <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: isDark ? 'rgba(234, 88, 12, 0.75)' : 'rgba(234, 88, 12, 0.55)' }} />
        <span className="text-[10px] text-muted-foreground">5+ contacts</span>
      </div>
      {hasVisited && (
        <>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: isDark ? 'rgba(20, 184, 166, 0.25)' : 'rgba(20, 184, 166, 0.15)', border: `1.5px solid ${isDark ? 'rgba(20, 184, 166, 0.6)' : 'rgba(20, 184, 166, 0.45)'}` }} />
            <span className="text-[10px] text-muted-foreground">Visited only</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: isDark ? 'rgba(180, 120, 40, 0.4)' : 'rgba(180, 120, 40, 0.3)', border: `1.5px solid ${isDark ? 'rgba(20, 184, 166, 0.8)' : 'rgba(20, 184, 166, 0.6)'}` }} />
            <span className="text-[10px] text-muted-foreground">Visited + contacts</span>
          </div>
        </>
      )}
      {hasIndirect && (
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: isDark ? 'rgba(168, 85, 247, 0.2)' : 'rgba(168, 85, 247, 0.12)', border: `1.5px solid ${isDark ? 'rgba(168, 85, 247, 0.5)' : 'rgba(168, 85, 247, 0.35)'}` }} />
          <span className="text-[10px] text-muted-foreground">Indirect ties</span>
        </div>
      )}
    </div>
  )
}

const CONNECTION_COLORS: Record<string, string> = {
  knows: 'rgba(251, 146, 60, 0.5)',
  introduced_by: 'rgba(168, 85, 247, 0.5)',
  works_with: 'rgba(59, 130, 246, 0.5)',
  reports_to: 'rgba(239, 68, 68, 0.5)',
  invested_in: 'rgba(34, 197, 94, 0.5)',
  referred_by: 'rgba(236, 72, 153, 0.5)',
}

export default memo(function GlobeCanvas({
  contacts,
  selectedContact,
  flyTarget,
  onContactClick,
  onCountryClick,
  display,
  visitedCountries,
  connections = [],
  countryConnections = [],
}: GlobeCanvasProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const globeRef = useRef<any>(null)
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 })
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
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
        counts.set(c.country, (counts.get(c.country) || 0) + 1)
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
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => {},
        { enableHighAccuracy: false, timeout: 10000 }
      )
    }
  }, [])

  useEffect(() => {
    if (!globeRef.current) return
    const renderer = globeRef.current.renderer()
    if (renderer) renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    const controls = globeRef.current.controls()
    controls.enableDamping = true

    const target = userLocation || { lat: 20, lng: 0 }
    globeRef.current.pointOfView({ ...target, altitude: 2.2 }, 1000)
  }, [userLocation])

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
        pts.push({
          id: c.id,
          lat: c.lat!,
          lng: c.lng!,
          name: c.name,
          city: c.city,
          color: '#f97316',
          size: 0.45,
        })
      } else {
        pts.push({
          id: `cluster:${key}`,
          lat: group[0].lat!,
          lng: group[0].lng!,
          name: `${group.length} contacts`,
          city: group[0].city,
          color: '#fb923c',
          size: 0.45 + Math.min(group.length * 0.12, 0.6),
          isCluster: true,
          count: group.length,
        })
      }
    })

    if (userLocation) {
      pts.unshift({
        id: 'user',
        lat: userLocation.lat,
        lng: userLocation.lng,
        name: 'You',
        city: null,
        color: '#22c55e',
        size: 0.55,
        isUser: true,
      })
    }
    return pts
  }, [contacts, userLocation])

  const arcs: GlobeArc[] = useMemo(() => {
    const noMainArcs = display.arcMode === 'off'
    if (noMainArcs && !selectedContact) return EMPTY_ARCS

    const contactMap = new Map(contacts.filter((c) => c.lat && c.lng).map((c) => [c.id, c]))
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
          ? 'rgba(56, 189, 248, 0.6)'
          : CONNECTION_COLORS[conn.connectionType] || 'rgba(251, 146, 60, 0.4)',
      })
    }
    return result
  }, [contacts, connections, display.arcMode, selectedContact])

  const countryCentroids = useMemo(() => {
    const map = new Map<string, { lat: number; lng: number }>()
    for (const label of buildCountryLabels(countries)) {
      map.set(label.text, { lat: label.lat, lng: label.lng })
    }
    return map
  }, [countries])

  const indirectOnlyCountries = useMemo(() => {
    const ccCountries = new Set(countryConnections.map((cc) => cc.country))
    const directCountries = new Set<string>()
    for (const c of contacts) {
      if (c.country) directCountries.add(c.country)
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
      map.set(cc.country, (map.get(cc.country) || 0) + 1)
    }
    return map
  }, [countryConnections])

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
          ? 'rgba(56, 189, 248, 0.35)'
          : 'rgba(168, 85, 247, 0.25)',
        type: 'country',
      })
    }
    return result
  }, [countryConnections, contacts, countryCentroids, display.arcMode, selectedContact])

  const allArcs = useMemo(() => [...arcs, ...countryArcs], [arcs, countryArcs])

  const getArcStroke = useCallback((arc: object) => {
    return (arc as GlobeArc).type === 'country' ? 0.25 : 0.4
  }, [])

  const getArcDashLength = useCallback((arc: object) => {
    if ((arc as GlobeArc).type === 'country') return 0.3
    return display.arcMode === 'static' ? 1 : 0.5
  }, [display.arcMode])

  const getArcDashGap = useCallback((arc: object) => {
    if ((arc as GlobeArc).type === 'country') return 0.2
    return display.arcMode === 'static' ? 0 : 0.3
  }, [display.arcMode])

  const handlePointClick = useCallback(
    (point: object, event: MouseEvent) => {
      const p = point as GlobePoint
      if (p.isUser) return

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
    [contacts, onContactClick, clusterData, clusterOpen, openCluster, closeCluster]
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
    const count = countryContactCount.get(name) || 0
    const indirectCount = countryConnectionCountMap.get(name) || 0
    const isVisited = visitedCountries?.has(name)
    const parts: string[] = [`<b>${name}</b>`]
    if (count > 0) parts.push(`${count} contact${count === 1 ? '' : 's'}`)
    if (indirectCount > 0) parts.push(`${indirectCount} indirect tie${indirectCount === 1 ? '' : 's'}`)
    if (isVisited) parts.push('Visited')
    const label = parts.join(' <span style="opacity:0.4">&middot;</span> ')
    const bg = isDark ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.9)'
    const textColor = isDark ? 'rgba(255,255,255,0.95)' : 'rgba(20,30,50,0.9)'
    const border = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'
    return `<div style="background:${bg};color:${textColor};padding:5px 10px;border-radius:6px;font-size:11px;backdrop-filter:blur(12px);border:1px solid ${border};font-family:system-ui,sans-serif;line-height:1.4;box-shadow:0 2px 8px rgba(0,0,0,${isDark ? '0.4' : '0.08'})">${label}</div>`
  }, [isDark, countryContactCount, countryConnectionCountMap, visitedCountries])

  const getPolygonCapColor = useCallback((feat: object) => {
    const f = feat as { id?: string }
    const name = countryNames[String(f.id)]
    if (name) {
      const count = countryContactCount.get(name) || 0
      const isVisited = visitedCountries?.has(name)
      const isIndirectOnly = indirectOnlyCountries.has(name)
      if (count > 0 && isVisited) {
        if (count > 5) return isDark ? 'rgba(200, 100, 20, 0.75)' : 'rgba(200, 100, 20, 0.55)'
        if (count >= 3) return isDark ? 'rgba(200, 100, 20, 0.55)' : 'rgba(200, 100, 20, 0.4)'
        return isDark ? 'rgba(180, 120, 40, 0.4)' : 'rgba(180, 120, 40, 0.3)'
      }
      if (count > 5) return isDark ? 'rgba(234, 88, 12, 0.75)' : 'rgba(234, 88, 12, 0.55)'
      if (count >= 3) return isDark ? 'rgba(234, 88, 12, 0.55)' : 'rgba(234, 88, 12, 0.4)'
      if (count >= 1) return isDark ? 'rgba(234, 88, 12, 0.35)' : 'rgba(234, 88, 12, 0.25)'
      if (isIndirectOnly) return isDark ? 'rgba(168, 85, 247, 0.2)' : 'rgba(168, 85, 247, 0.12)'
      if (isVisited) return isDark ? 'rgba(20, 184, 166, 0.25)' : 'rgba(20, 184, 166, 0.15)'
    }
    return isDark ? 'rgba(15, 25, 55, 0.85)' : 'rgba(180, 195, 220, 0.7)'
  }, [isDark, countryContactCount, visitedCountries, indirectOnlyCountries])

  const getPolygonSideColor = useCallback(
    () => isDark ? 'rgba(10, 18, 40, 0.6)' : 'rgba(160, 180, 210, 0.5)',
    [isDark]
  )

  const getPolygonStrokeColor = useCallback(
    (feat: object) => {
      const f = feat as { id?: string }
      const name = countryNames[String(f.id)]
      if (name) {
        const isVisited = visitedCountries?.has(name)
        const hasContacts = (countryContactCount.get(name) || 0) > 0
        const isIndirectOnly = indirectOnlyCountries.has(name)
        if (isVisited && hasContacts) return isDark ? 'rgba(20, 184, 166, 0.8)' : 'rgba(20, 184, 166, 0.6)'
        if (isVisited) return isDark ? 'rgba(20, 184, 166, 0.6)' : 'rgba(20, 184, 166, 0.45)'
        if (hasContacts) return isDark ? 'rgba(234, 88, 12, 0.5)' : 'rgba(234, 88, 12, 0.35)'
        if (isIndirectOnly) return isDark ? 'rgba(168, 85, 247, 0.5)' : 'rgba(168, 85, 247, 0.35)'
      }
      return isDark ? 'rgba(40, 70, 130, 0.35)' : 'rgba(100, 130, 180, 0.3)'
    },
    [isDark, visitedCountries, countryContactCount, indirectOnlyCountries]
  )

  const getPointColor = useCallback((point: object) => (point as GlobePoint).color, [])
  const getPointRadius = useCallback((point: object) => (point as GlobePoint).size, [])

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
        pointsData={points}
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
        arcColor="color"
        arcDashLength={getArcDashLength}
        arcDashGap={getArcDashGap}
        arcDashAnimateTime={display.arcMode === 'animated' ? 1800 : 0}
        arcStroke={getArcStroke}
      />
      {(hasCountryContacts || (visitedCountries && visitedCountries.size > 0) || countryConnections.length > 0) && <ContactDensityLegend isDark={isDark} visitedCountries={visitedCountries} hasIndirect={countryConnections.length > 0} />}
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
