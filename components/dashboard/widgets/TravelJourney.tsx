'use client'

import { useMemo } from 'react'
import { Plane, Upload, Calendar, Clock, ArrowRight, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { GLASS } from '@/lib/constants/ui'
import { countryFlag } from '@/lib/country-flags'
import type { Trip } from '@/lib/db/schema'

interface TravelJourneyProps {
  trips: Trip[]
  loading?: boolean
  onImport: () => void
  onTripClick?: (trip: Trip) => void
  onAddTrip?: (prefill?: { arrivalDate?: string; departureDate?: string }) => void
}

function formatDate(d: Date | string | null): string {
  if (!d) return ''
  const date = typeof d === 'string' ? new Date(d) : d
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function formatYear(d: Date | string): number {
  const date = typeof d === 'string' ? new Date(d) : d
  return date.getFullYear()
}

function toDateStr(d: Date | string | null | undefined): string {
  if (!d) return ''
  const date = typeof d === 'string' ? new Date(d) : d
  if (isNaN(date.getTime())) return ''
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function computeGap(laterTrip: Trip, earlierTrip: Trip): number {
  const endDate = earlierTrip.departureDate ? new Date(earlierTrip.departureDate) : new Date(earlierTrip.arrivalDate)
  const startDate = new Date(laterTrip.arrivalDate)
  return Math.round((startDate.getTime() - endDate.getTime()) / 86400000)
}

export default function TravelJourney({ trips, loading, onImport, onTripClick, onAddTrip }: TravelJourneyProps) {
  const now = useMemo(() => new Date(), [])

  const stats = useMemo(() => {
    const pastCountries = new Set<string>()
    const futureOnlyCountries = new Set<string>()
    for (const t of trips) {
      if (new Date(t.arrivalDate) <= now) pastCountries.add(t.country)
    }
    for (const t of trips) {
      if (new Date(t.arrivalDate) > now && !pastCountries.has(t.country)) futureOnlyCountries.add(t.country)
    }
    const totalDays = trips.reduce((sum, t) => sum + (t.durationDays || 0), 0)
    return { total: trips.length, countries: pastCountries.size, upcomingCountries: futureOnlyCountries.size, totalDays }
  }, [trips, now])

  const sorted = useMemo(() =>
    [...trips].sort((a, b) => new Date(b.arrivalDate).getTime() - new Date(a.arrivalDate).getTime()),
    [trips]
  )

  const groupedByYear = useMemo(() => {
    const groups = new Map<number, Trip[]>()
    for (const trip of sorted) {
      const year = formatYear(trip.arrivalDate)
      const arr = groups.get(year) || []
      arr.push(trip)
      groups.set(year, arr)
    }
    return Array.from(groups.entries()).sort((a, b) => b[0] - a[0])
  }, [sorted])

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-6 w-16" />
        </div>
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full rounded-lg" />
        ))}
      </div>
    )
  }

  if (trips.length === 0) {
    return (
      <div className={`${GLASS.control} rounded-xl p-4 text-center space-y-2`}>
        <Plane className="h-6 w-6 text-blue-400 mx-auto" />
        <p className="text-xs font-medium text-foreground">Travel Journey</p>
        <p className="text-[10px] text-muted-foreground">Import your travel history or add trips manually</p>
        <div className="flex gap-2 justify-center">
          <Button
            size="sm"
            variant="outline"
            onClick={onImport}
            className="text-xs"
          >
            <Upload className="h-3 w-3 mr-1" />
            Import CSV
          </Button>
          {onAddTrip && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onAddTrip()}
              className="text-xs"
            >
              <Plus className="h-3 w-3 mr-1" />
              Add manually
            </Button>
          )}
        </div>
      </div>
    )
  }

  let globalIdx = 0

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
          <Plane className="h-3 w-3" />
          Travel Journey
        </span>
        <div className="flex items-center gap-1">
          {onAddTrip && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => onAddTrip()}
                    className="h-6 w-6 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </TooltipTrigger>
                <TooltipContent className="text-xs">Add trip</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={onImport}
            className="h-6 text-[10px] text-muted-foreground hover:text-foreground px-2"
          >
            <Upload className="h-3 w-3 mr-1" />
            Re-import
          </Button>
        </div>
      </div>

      <div className={`grid ${stats.upcomingCountries > 0 ? 'grid-cols-4' : 'grid-cols-3'} gap-2`}>
        <div className={`${GLASS.control} rounded-lg p-2 text-center`}>
          <p className="text-sm font-semibold text-foreground">{stats.total}</p>
          <p className="text-[9px] text-muted-foreground">Trips</p>
        </div>
        <div className={`${GLASS.control} rounded-lg p-2 text-center`}>
          <p className="text-sm font-semibold text-foreground">{stats.countries}</p>
          <p className="text-[9px] text-muted-foreground">Countries</p>
        </div>
        {stats.upcomingCountries > 0 && (
          <div className={`${GLASS.control} rounded-lg p-2 text-center`}>
            <p className="text-sm font-semibold text-green-400">{stats.upcomingCountries}</p>
            <p className="text-[9px] text-muted-foreground">Upcoming</p>
          </div>
        )}
        <div className={`${GLASS.control} rounded-lg p-2 text-center`}>
          <p className="text-sm font-semibold text-foreground">{stats.totalDays}</p>
          <p className="text-[9px] text-muted-foreground">Days</p>
        </div>
      </div>

      <div className="relative ml-2.5">
        <div className="absolute left-0 top-2 bottom-2 w-0.5 bg-blue-400/30 rounded-full" />
        {groupedByYear.map(([year, yearTrips]) => (
          <div key={year}>
            <div className="sticky top-0 z-10 bg-background/90 backdrop-blur-sm py-1.5 pl-5 -ml-0.5">
              <span className="text-[10px] font-bold text-blue-400/70 uppercase tracking-wider">{year}</span>
            </div>
            {yearTrips.map((trip) => {
              const idx = globalIdx++
              const nextInSorted = sorted[idx + 1]
              const isLastOverall = idx === sorted.length - 1
              const isFuture = new Date(trip.arrivalDate) > now

              const gapDays = nextInSorted ? computeGap(trip, nextInSorted) : 0

              return (
                <div key={trip.id}>
                  <button
                    onClick={() => onTripClick?.(trip)}
                    className={`w-full text-left pl-5 pr-2 py-1.5 rounded-md transition-colors relative group ${isFuture ? 'hover:bg-green-500/5' : 'hover:bg-blue-500/5'}`}
                  >
                    <div className={`absolute left-[-3.5px] top-[11px] w-2 h-2 rounded-full border-2 border-background ring-1 ${isFuture ? 'bg-green-400 ring-green-400/40' : 'bg-blue-400 ring-blue-400/40'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">
                        {trip.city}
                        <span className="text-muted-foreground/50 font-normal ml-1">{trip.country} {countryFlag(trip.country)}</span>
                      </p>
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                        <span className="flex items-center gap-0.5">
                          <Calendar className="h-2.5 w-2.5" />
                          {formatDate(trip.arrivalDate)}
                          {trip.departureDate && ` \u2013 ${formatDate(trip.departureDate)}`}
                        </span>
                        {trip.durationDays != null && (
                          <span className="flex items-center gap-0.5">
                            <Clock className="h-2.5 w-2.5" />
                            {trip.durationDays}d
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                  {!isLastOverall && nextInSorted && (() => {
                    if (gapDays > 1) {
                      return (
                        <button
                          onClick={() => {
                            if (!onAddTrip) return
                            const gapStart = nextInSorted.departureDate || nextInSorted.arrivalDate
                            const startDate = new Date(gapStart)
                            startDate.setDate(startDate.getDate() + 1)
                            const endDate = new Date(trip.arrivalDate)
                            endDate.setDate(endDate.getDate() - 1)
                            onAddTrip({
                              arrivalDate: toDateStr(startDate),
                              departureDate: toDateStr(endDate),
                            })
                          }}
                          className="relative pl-5 py-1 flex items-center gap-1.5 w-full text-left group/gap hover:bg-blue-500/5 rounded-md transition-colors"
                        >
                          <div className="absolute left-[-1px] top-0 bottom-0 w-0.5 border-l border-dashed border-blue-400/20" />
                          <span className="text-[9px] text-muted-foreground/40 group-hover/gap:text-muted-foreground/60 transition-colors">
                            {gapDays}d gap
                          </span>
                          {onAddTrip && (
                            <Plus className="h-2.5 w-2.5 text-muted-foreground/30 group-hover/gap:text-blue-400/60 transition-colors" />
                          )}
                        </button>
                      )
                    }

                    return (
                      <div className="relative pl-5 py-0.5 flex items-center gap-1 text-[9px] text-muted-foreground/40">
                        {nextInSorted.city === trip.city && nextInSorted.country === trip.country
                          ? <span>stayed</span>
                          : (
                            <>
                              <span>{nextInSorted.city}, {nextInSorted.country}</span>
                              <ArrowRight className="h-2.5 w-2.5 text-green-400/60 shrink-0" />
                              <span>{trip.city}, {trip.country}</span>
                            </>
                          )}
                      </div>
                    )
                  })()}
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
