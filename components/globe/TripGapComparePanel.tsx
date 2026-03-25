'use client'

import GlobePanel from '@/components/globe/GlobePanel'
import { PANEL_WIDTH, GLASS } from '@/lib/constants/ui'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { Calendar, Clock, ArrowDown } from 'lucide-react'
import { countryFlag } from '@/lib/country-flags'
import { formatGap } from '@/hooks/use-trip-compare'
import type { TripGap, GapStats } from '@/hooks/use-trip-compare'
import type { Trip } from '@/lib/db/schema'

interface TripGapComparePanelProps {
  open: boolean
  onClose: () => void
  selectedTrips: Trip[]
  gaps: TripGap[]
  stats: GapStats
}

function formatDate(d: Date | string | null): string {
  if (!d) return ''
  const date = typeof d === 'string' ? new Date(d) : d
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function gapColor(days: number): string {
  if (days <= 0) return 'text-blue-400 bg-blue-500/10 border-blue-500/20'
  if (days < 7) return 'text-green-400 bg-green-500/10 border-green-500/20'
  if (days <= 30) return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20'
  if (days <= 90) return 'text-orange-400 bg-orange-500/10 border-orange-500/20'
  return 'text-red-400 bg-red-500/10 border-red-500/20'
}

function gapDotColor(days: number): string {
  if (days <= 0) return 'bg-blue-400'
  if (days < 7) return 'bg-green-400'
  if (days <= 30) return 'bg-yellow-400'
  if (days <= 90) return 'bg-orange-400'
  return 'bg-red-400'
}

export default function TripGapComparePanel({ open, onClose, selectedTrips, gaps, stats }: TripGapComparePanelProps) {
  return (
    <GlobePanel open={open} side="right" width={PANEL_WIDTH.detail} glass="heavy" onClose={onClose}>
      <div className="flex flex-col h-full">
        <div className="px-6 pt-6 pb-4">
          <h2 className="text-lg font-semibold text-foreground">Trip Comparison</h2>
          <p className="text-xs text-muted-foreground mt-0.5">{selectedTrips.length} trips selected</p>
        </div>
        <Separator className="bg-border" />

        <div className="flex-1 min-h-0 overflow-y-auto thin-scrollbar">
          <div className="px-6 py-4 space-y-5">
            {stats.longestGap && (
              <div className="grid grid-cols-2 gap-2">
                <div className={`${GLASS.control} rounded-lg p-3 text-center`}>
                  <p className="text-sm font-semibold text-foreground">{formatGap(stats.totalDays)}</p>
                  <p className="text-[9px] text-muted-foreground">Total gap</p>
                </div>
                <div className={`${GLASS.control} rounded-lg p-3 text-center`}>
                  <p className="text-sm font-semibold text-foreground">{formatGap(stats.averageDays)}</p>
                  <p className="text-[9px] text-muted-foreground">Average gap</p>
                </div>
                <div className={`${GLASS.control} rounded-lg p-3 text-center`}>
                  <p className="text-sm font-semibold text-red-400">{formatGap(stats.longestGap.days)}</p>
                  <p className="text-[9px] text-muted-foreground">Longest gap</p>
                </div>
                <div className={`${GLASS.control} rounded-lg p-3 text-center`}>
                  <p className="text-sm font-semibold text-green-400">{formatGap(stats.shortestGap?.days ?? 0)}</p>
                  <p className="text-[9px] text-muted-foreground">Shortest gap</p>
                </div>
              </div>
            )}

            <div className="relative ml-3">
              <div className="absolute left-0 top-2 bottom-2 w-0.5 bg-border rounded-full" />
              {selectedTrips.map((trip, i) => {
                const gap = gaps[i]
                return (
                  <div key={trip.id}>
                    <div className="relative pl-5 py-2">
                      <div className="absolute left-[-3px] top-[14px] w-2 h-2 rounded-full border-2 border-background bg-blue-400 ring-1 ring-blue-400/40" />
                      <p className="text-xs font-medium text-foreground">
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
                    {gap && (
                      <div className="relative pl-5 py-1.5">
                        <div className={`absolute left-[-3px] top-1/2 -translate-y-1/2 w-2 h-2 rounded-full ${gapDotColor(gap.days)}`} />
                        <div className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[10px] font-medium ${gapColor(gap.days)}`}>
                          <ArrowDown className="h-2.5 w-2.5" />
                          {formatGap(gap.days)}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        <Separator className="bg-border" />
        <div className="px-6 py-3">
          <Button variant="ghost" size="sm" className="w-full text-xs text-muted-foreground" onClick={onClose}>
            Clear selection
          </Button>
        </div>
      </div>
    </GlobePanel>
  )
}
