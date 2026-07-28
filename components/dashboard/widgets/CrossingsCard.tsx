'use client'

import { useEffect, useMemo, useState } from 'react'
import { Users, MapPin, CalendarClock, ChevronRight, Radar, History } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { GLASS } from '@/lib/constants/ui'
import { countryFlag } from '@/lib/country-flags'
import { getInitials } from '@/lib/format'
import { ANALYTICS_EVENTS, track } from '@/lib/analytics'
import type { ContactMatch, OverlapReport } from '@/lib/travel/overlaps'

interface CrossingsCardProps {
  onContactClick?: (contactId: string) => void
  /** Change to force a refetch after trips or contacts change. */
  refreshKey?: string | number
}

function formatRange(arrival: string | Date, departure: string | Date | null): string {
  const a = new Date(arrival)
  const fmt = (d: Date) => d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', timeZone: 'UTC' })
  if (!departure) return `from ${fmt(a)}`
  return `${fmt(a)} – ${fmt(new Date(departure))}`
}

function precisionLabel(match: ContactMatch): string {
  if (match.precision === 'city') return match.place.city ?? 'same city'
  if (match.precision === 'proximity') {
    return `${Math.round(match.distanceKm ?? 0)} km away`
  }
  return match.place.country ?? ''
}

function MatchRow({ match, onClick }: { match: ContactMatch; onClick?: (id: string) => void }) {
  return (
    <button
      onClick={() => onClick?.(match.contactId)}
      className="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-accent/50"
    >
      <Avatar className="h-6 w-6 shrink-0">
        {match.photo && <AvatarImage src={match.photo} alt={match.contactName} />}
        <AvatarFallback className="text-[9px]">{getInitials(match.contactName)}</AvatarFallback>
      </Avatar>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-xs text-foreground">{match.contactName}</span>
        <span className="block truncate text-[10px] text-muted-foreground">
          {precisionLabel(match)}
          {match.company ? ` · ${match.company}` : ''}
        </span>
      </span>
      {match.place.isCurrent && (
        <span className="shrink-0 rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[9px] text-emerald-500">
          confirmed
        </span>
      )}
    </button>
  )
}

export default function CrossingsCard({ onContactClick, refreshKey = 0 }: CrossingsCardProps) {
  const [report, setReport] = useState<OverlapReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    const controller = new AbortController()

    // The loading flag is set inside the async flow rather than synchronously in the
    // effect body, which would trigger an extra render before the request even starts.
    const load = async () => {
      setLoading(true)
      try {
        const res = await fetch('/api/travel/overlaps', { signal: controller.signal, cache: 'no-store' })
        if (res.ok) setReport(await res.json())
      } catch {
        // Aborted or offline: keep whatever was on screen.
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }

    load()
    return () => controller.abort()
  }, [refreshKey])

  const upcomingWithMatches = useMemo(
    () => (report?.upcoming ?? []).filter((t) => t.matches.length > 0),
    [report],
  )

  const missedCrossings = useMemo(
    () => (report?.pastCrossings ?? []).filter((c) => c.missed).slice(0, 3),
    [report],
  )

  if (loading) {
    return (
      <div className={`${GLASS.control} rounded-xl p-4 mb-3 space-y-2`}>
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-8 w-full" />
      </div>
    )
  }

  if (!report) return null

  const hasAnything =
    report.nearbyNow.length > 0 || upcomingWithMatches.length > 0 || missedCrossings.length > 0

  if (!hasAnything) return null

  const visibleTrips = expanded ? upcomingWithMatches : upcomingWithMatches.slice(0, 1)

  return (
    <div className={`${GLASS.control} rounded-xl p-4 mb-3 space-y-3`}>
      <div className="flex items-center justify-between">
        <span className="meta-label text-[10px] flex items-center gap-1.5">
          <Radar className="h-3 w-3" />
          Crossing paths
        </span>
        {report.totalReachable > 0 && (
          <span className="text-[10px] text-muted-foreground tabular-nums">
            {report.totalReachable} reachable
          </span>
        )}
      </div>

      {report.nearbyNow.length > 0 && report.currentPlace && (
        <div>
          <p className="text-[11px] text-muted-foreground mb-1 flex items-center gap-1">
            <MapPin className="h-3 w-3 text-emerald-500" />
            In {report.currentPlace.city || report.currentPlace.country} right now
          </p>
          <div className="space-y-0.5">
            {report.nearbyNow.slice(0, expanded ? 20 : 3).map((m) => (
              <MatchRow key={m.contactId} match={m} onClick={onContactClick} />
            ))}
          </div>
        </div>
      )}

      {visibleTrips.length > 0 && (
        <>
          {report.nearbyNow.length > 0 && <Separator />}
          <div className="space-y-2.5">
            {visibleTrips.map((t) => (
              <div key={t.tripId}>
                <p className="text-[11px] text-muted-foreground mb-1 flex items-center gap-1">
                  <CalendarClock className="h-3 w-3" />
                  {countryFlag(t.country)} {t.city}
                  <span className="text-muted-foreground/60">
                    · {t.ongoing ? 'now' : t.daysUntil === 0 ? 'today' : `in ${t.daysUntil}d`}
                  </span>
                  <span className="text-muted-foreground/40">{formatRange(t.arrivalDate, t.departureDate)}</span>
                </p>
                <div className="space-y-0.5">
                  {t.matches.slice(0, expanded ? 20 : 3).map((m) => (
                    <MatchRow key={m.contactId} match={m} onClick={onContactClick} />
                  ))}
                  {!expanded && t.matches.length > 3 && (
                    <p className="px-2 text-[10px] text-muted-foreground/60">
                      +{t.matches.length - 3} more here
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {expanded && missedCrossings.length > 0 && (
        <>
          <Separator />
          <div>
            <p className="text-[11px] text-muted-foreground mb-1 flex items-center gap-1">
              <History className="h-3 w-3" />
              You were in the same place and never logged a meeting
            </p>
            <div className="space-y-0.5">
              {missedCrossings.map((c) => (
                <button
                  key={`${c.contactId}-${c.from}`}
                  onClick={() => onContactClick?.(c.contactId)}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-accent/50"
                >
                  <Users className="h-3 w-3 text-muted-foreground/60 shrink-0" />
                  <span className="min-w-0 flex-1 truncate text-xs text-foreground">{c.contactName}</span>
                  <span className="shrink-0 text-[10px] text-muted-foreground">
                    {countryFlag(c.country)} {c.days}d
                  </span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {(upcomingWithMatches.length > 1 ||
        report.nearbyNow.length > 3 ||
        missedCrossings.length > 0 ||
        upcomingWithMatches.some((t) => t.matches.length > 3)) && (
        <button
          onClick={() => {
            const next = !expanded
            setExpanded(next)
            if (next) track(ANALYTICS_EVENTS.overlapsViewed, { reachable: report.totalReachable })
          }}
          className="flex w-full items-center justify-center gap-1 text-[11px] text-primary transition-colors hover:underline"
        >
          {expanded ? 'Show less' : 'Show everything'}
          <ChevronRight className={`h-3 w-3 transition-transform ${expanded ? 'rotate-90' : ''}`} />
        </button>
      )}
    </div>
  )
}
