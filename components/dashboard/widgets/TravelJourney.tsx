'use client'

import { useMemo } from 'react'
import { Plane, Upload, MapPin, Calendar, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { GLASS } from '@/lib/constants/ui'
import type { Trip } from '@/lib/db/schema'

interface TravelJourneyProps {
  trips: Trip[]
  loading?: boolean
  onImport: () => void
  onTripClick?: (trip: Trip) => void
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

export default function TravelJourney({ trips, loading, onImport, onTripClick }: TravelJourneyProps) {
  const stats = useMemo(() => {
    const countries = new Set(trips.map((t) => t.country))
    const totalDays = trips.reduce((sum, t) => sum + (t.durationDays || 0), 0)
    return { total: trips.length, countries: countries.size, totalDays }
  }, [trips])

  const groupedByYear = useMemo(() => {
    const groups = new Map<number, Trip[]>()
    for (const trip of trips) {
      const year = formatYear(trip.arrivalDate)
      const arr = groups.get(year) || []
      arr.push(trip)
      groups.set(year, arr)
    }
    return Array.from(groups.entries()).sort((a, b) => b[0] - a[0])
  }, [trips])

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
        <p className="text-[10px] text-muted-foreground">Import your travel history from NomadList</p>
        <Button
          size="sm"
          variant="outline"
          onClick={onImport}
          className="text-xs mt-1"
        >
          <Upload className="h-3 w-3 mr-1" />
          Import CSV
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
          <Plane className="h-3 w-3" />
          Travel Journey
        </span>
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

      <div className="grid grid-cols-3 gap-2">
        <div className={`${GLASS.control} rounded-lg p-2 text-center`}>
          <p className="text-sm font-semibold text-foreground">{stats.total}</p>
          <p className="text-[9px] text-muted-foreground">Trips</p>
        </div>
        <div className={`${GLASS.control} rounded-lg p-2 text-center`}>
          <p className="text-sm font-semibold text-foreground">{stats.countries}</p>
          <p className="text-[9px] text-muted-foreground">Countries</p>
        </div>
        <div className={`${GLASS.control} rounded-lg p-2 text-center`}>
          <p className="text-sm font-semibold text-foreground">{stats.totalDays}</p>
          <p className="text-[9px] text-muted-foreground">Days</p>
        </div>
      </div>

      <div className="space-y-1">
        {groupedByYear.map(([year, yearTrips], gi) => (
          <div key={year}>
            {gi > 0 && <Separator className="my-2 bg-border/50" />}
            <p className="text-[10px] font-medium text-muted-foreground/60 uppercase tracking-wider mb-1">{year}</p>
            {yearTrips.map((trip) => (
              <button
                key={trip.id}
                onClick={() => onTripClick?.(trip)}
                className="w-full text-left px-2 py-1.5 rounded-md hover:bg-muted/50 transition-colors flex items-center gap-2 group"
              >
                <div className="shrink-0 w-5 h-5 rounded bg-blue-500/10 flex items-center justify-center">
                  <MapPin className="h-3 w-3 text-blue-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground truncate">
                    {trip.city}
                    <span className="text-muted-foreground/60 font-normal ml-1">{trip.country}</span>
                  </p>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-0.5">
                      <Calendar className="h-2.5 w-2.5" />
                      {formatDate(trip.arrivalDate)}
                      {trip.departureDate && ` — ${formatDate(trip.departureDate)}`}
                    </span>
                    {trip.durationDays && (
                      <span className="flex items-center gap-0.5">
                        <Clock className="h-2.5 w-2.5" />
                        {trip.durationDays}d
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
