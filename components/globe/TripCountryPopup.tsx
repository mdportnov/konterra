'use client'

import { useRef, useMemo } from 'react'
import { X, MapPin, Calendar, Clock, Plane, ArrowRight, ArrowLeft } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { useClickOutside } from '@/hooks/use-click-outside'
import { useHotkey } from '@/hooks/use-hotkey'
import { GLASS, Z } from '@/lib/constants/ui'
import { TENSE_COLORS } from '@/lib/constants/globe-colors'
import { countryFlag } from '@/lib/country-flags'
import type { Trip } from '@/lib/db/schema'

function PerplexityIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" className={className}>
      <path fillRule="evenodd" d="M8 .188a.5.5 0 0 1 .503.5V4.03l3.022-2.92.059-.048a.51.51 0 0 1 .49-.054.5.5 0 0 1 .306.46v3.247h1.117l.1.01a.5.5 0 0 1 .403.49v5.558a.5.5 0 0 1-.503.5H12.38v3.258a.5.5 0 0 1-.312.462.51.51 0 0 1-.55-.11l-3.016-3.018v3.448c0 .275-.225.5-.503.5a.5.5 0 0 1-.503-.5v-3.448l-3.018 3.019a.51.51 0 0 1-.548.11.5.5 0 0 1-.312-.463v-3.258H2.503a.5.5 0 0 1-.503-.5V5.215l.01-.1c.047-.229.25-.4.493-.4H3.62V1.469l.006-.074a.5.5 0 0 1 .302-.387.51.51 0 0 1 .547.102l3.023 2.92V.687c0-.276.225-.5.503-.5M4.626 9.333v3.984l2.87-2.872v-4.01zm3.877 1.113 2.871 2.871V9.333l-2.87-2.897zm3.733-1.668a.5.5 0 0 1 .145.35v1.145h.612V5.715H9.201zm-9.23 1.495h.613V9.13c0-.131.052-.257.145-.35l3.033-3.064h-3.79zm1.62-5.558H6.76L4.626 2.652zm4.613 0h2.134V2.652z" />
    </svg>
  )
}

interface TripCountryPopupProps {
  country: string
  trips: Trip[]
  allTrips: Trip[]
  x: number
  y: number
  open: boolean
  onTripClick?: (trip: Trip) => void
  onClose: () => void
}

const POPUP_W = 340
const MAX_H = 520
const SCROLL_MAX = 400

function formatDate(d: Date | string | null): string {
  if (!d) return ''
  const date = typeof d === 'string' ? new Date(d) : d
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatShortDate(d: Date | string | null): string {
  if (!d) return ''
  const date = typeof d === 'string' ? new Date(d) : d
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

type TripTense = 'past' | 'current' | 'future'

function getTripTense(trip: Trip, now: Date): TripTense {
  const arrival = new Date(trip.arrivalDate)
  const departure = trip.departureDate ? new Date(trip.departureDate) : null
  const endDate = departure ?? arrival
  if (arrival > now) return 'future'
  if (endDate >= now) return 'current'
  return 'past'
}

export default function TripCountryPopup({ country, trips, allTrips, x, y, open, onTripClick, onClose }: TripCountryPopupProps) {
  const ref = useRef<HTMLDivElement>(null)
  useClickOutside(ref, onClose, open)
  useHotkey('Escape', onClose, { enabled: open })

  const now = useMemo(() => new Date(), [])

  const sorted = useMemo(() =>
    [...trips].sort((a, b) => new Date(b.arrivalDate).getTime() - new Date(a.arrivalDate).getTime()),
    [trips]
  )

  const routeMap = useMemo(() => {
    const chronological = [...allTrips].sort((a, b) => new Date(a.arrivalDate).getTime() - new Date(b.arrivalDate).getTime())
    const map = new Map<string, { prev: Trip | null; next: Trip | null }>()
    for (let i = 0; i < chronological.length; i++) {
      map.set(chronological[i].id, {
        prev: i > 0 ? chronological[i - 1] : null,
        next: i < chronological.length - 1 ? chronological[i + 1] : null,
      })
    }
    return map
  }, [allTrips])

  const stats = useMemo(() => {
    const cities = new Set(trips.map((t) => t.city))
    const totalDays = trips.reduce((sum, t) => sum + (t.durationDays || 0), 0)
    const earliest = trips.reduce((min, t) => {
      const d = new Date(t.arrivalDate).getTime()
      return d < min ? d : min
    }, Infinity)
    const latest = trips.reduce((max, t) => {
      const d = new Date(t.departureDate || t.arrivalDate).getTime()
      return d > max ? d : max
    }, 0)
    return { visits: trips.length, cities: cities.size, totalDays, earliest, latest }
  }, [trips])

  const groupedByCity = useMemo(() => {
    const map = new Map<string, Trip[]>()
    for (const t of sorted) {
      const arr = map.get(t.city) || []
      arr.push(t)
      map.set(t.city, arr)
    }
    return Array.from(map.entries()).sort((a, b) => b[1].length - a[1].length)
  }, [sorted])

  const pos = useMemo(() => {
    const pad = 16
    const isMobileView = typeof window !== 'undefined' && window.innerWidth < 640
    const w = isMobileView ? Math.min(window.innerWidth - pad * 2, POPUP_W) : POPUP_W
    const estH = MAX_H

    if (isMobileView) {
      const left = (window.innerWidth - w) / 2
      const top = Math.max(pad, (window.innerHeight - Math.min(estH, window.innerHeight - pad * 2)) / 2)
      return { left, top, w }
    }

    let left = x - w / 2
    let top = y + 12

    if (typeof window !== 'undefined') {
      if (left < pad) left = pad
      if (left + w > window.innerWidth - pad) left = window.innerWidth - pad - w
      if (top + estH > window.innerHeight - pad) top = y - estH - 12
      if (top < pad) top = pad
    }

    return { left, top, w }
  }, [x, y])

  return (
    <div
      ref={ref}
      className={`${GLASS.heavy} fixed rounded-xl shadow-2xl overflow-hidden flex flex-col`}
      style={{
        left: pos.left,
        top: pos.top,
        width: pos.w,
        maxHeight: typeof window !== 'undefined' && window.innerWidth < 640 ? '80dvh' : MAX_H,
        zIndex: Z.overlay,
        opacity: open ? 1 : 0,
        transform: open ? 'scale(1) translateY(0)' : 'scale(0.95) translateY(4px)',
        transition: 'opacity 200ms cubic-bezier(0.32,0.72,0,1), transform 200ms cubic-bezier(0.32,0.72,0,1)',
        pointerEvents: open ? 'auto' : 'none',
      }}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-blue-500/20 bg-blue-500/5 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <Plane className="h-4 w-4 text-blue-400 shrink-0" />
          <span className="text-sm font-medium text-foreground truncate">{country} {countryFlag(country)}</span>
          <span className="text-xs text-blue-400/80 shrink-0">
            {stats.visits} visit{stats.visits !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="flex items-center gap-1 shrink-0 ml-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <a
                  href={`https://www.perplexity.ai/search?q=${encodeURIComponent(`${country} travel guide things to do`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-6 w-6 flex items-center justify-center rounded-md text-muted-foreground/60 hover:text-foreground hover:bg-accent transition-colors"
                >
                  <PerplexityIcon className="h-3.5 w-3.5" />
                </a>
              </TooltipTrigger>
              <TooltipContent className="text-xs">Explore on Perplexity</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <button onClick={onClose} className="text-muted-foreground/60 hover:text-muted-foreground cursor-pointer">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-px bg-border/50 border-b border-border shrink-0">
        <div className="bg-background px-3 py-2 text-center">
          <p className="text-sm font-semibold text-blue-400">{stats.cities}</p>
          <p className="text-[9px] text-muted-foreground">Cities</p>
        </div>
        <div className="bg-background px-3 py-2 text-center">
          <p className="text-sm font-semibold text-blue-400">{stats.totalDays}</p>
          <p className="text-[9px] text-muted-foreground">Days</p>
        </div>
        <div className="bg-background px-3 py-2 text-center">
          <p className="text-sm font-semibold text-blue-400">{stats.visits}</p>
          <p className="text-[9px] text-muted-foreground">Trips</p>
        </div>
      </div>

      {stats.earliest !== Infinity && (
        <div className="px-4 py-2 border-b border-border/50 text-[10px] text-muted-foreground shrink-0 flex items-center gap-1.5">
          <Calendar className="h-3 w-3 text-blue-400/60" />
          <span>
            {formatDate(new Date(stats.earliest))} — {formatDate(new Date(stats.latest))}
          </span>
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto thin-scrollbar" style={{ maxHeight: SCROLL_MAX }}>
        {groupedByCity.map(([city, cityTrips], gi) => (
          <div key={city}>
            {gi > 0 && <div className="mx-4 border-t border-border/40" />}
            {(() => {
              const tenses = cityTrips.map((t) => getTripTense(t, now))
              const headerTense = tenses.includes('current') ? 'current' : tenses.includes('future') ? 'future' : 'past'
              const hc = TENSE_COLORS[headerTense]
              return (
                <div className="px-4 pt-3 pb-1 flex items-center gap-1.5">
                  <MapPin className={`h-3 w-3 ${hc.iconText}`} />
                  <span className="text-[10px] font-semibold text-foreground/80 uppercase tracking-wider">{city}</span>
                  <span className="text-[9px] text-muted-foreground/50">{cityTrips.length}x</span>
                </div>
              )
            })()}
            {cityTrips.map((trip) => {
              const route = routeMap.get(trip.id)
              const tense = getTripTense(trip, now)
              const c = TENSE_COLORS[tense]
              return (
                <button
                  key={trip.id}
                  onClick={() => onTripClick?.(trip)}
                  className={`w-full text-left px-4 py-2 ${c.hover} transition-colors cursor-pointer`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`shrink-0 w-6 h-6 rounded-md ${c.icon} flex items-center justify-center`}>
                      <MapPin className={`h-3 w-3 ${c.iconText}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 text-[11px] text-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-2.5 w-2.5 text-muted-foreground/60" />
                          {formatShortDate(trip.arrivalDate)}
                          {trip.departureDate && ` \u2013 ${formatShortDate(trip.departureDate)}`}
                        </span>
                        {trip.durationDays != null && (
                          <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                            <Clock className="h-2.5 w-2.5" />
                            {trip.durationDays}d
                          </span>
                        )}
                        {tense === 'current' && (
                          <span className="text-[9px] font-medium text-red-400">Now</span>
                        )}
                      </div>
                      {route && (route.prev || route.next) && (
                        <div className="flex items-center gap-1.5 mt-1 text-[9px] text-muted-foreground/70">
                          {route.prev && (
                            <span className="flex items-center gap-0.5">
                              <ArrowLeft className={`h-2.5 w-2.5 ${c.arrow}`} />
                              {route.prev.city}
                            </span>
                          )}
                          {route.prev && route.next && <span className="text-muted-foreground/30">&middot;</span>}
                          {route.next && (
                            <span className="flex items-center gap-0.5">
                              {route.next.city}
                              <ArrowRight className={`h-2.5 w-2.5 ${c.arrow}`} />
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
