'use client'

import { useState, useEffect, useMemo } from 'react'
import type { Trip } from '@/lib/db/schema'
import { GLASS } from '@/lib/constants/ui'
import { TENSE_COLORS } from '@/lib/constants/globe-colors'
import { ChevronLeft, ChevronRight, X, Calendar, Clock, MapPin, Plus } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

interface TripPopupProps {
  trip: Trip | null
  prevTrip: Trip | null
  nextTrip: Trip | null
  onNavigate: (trip: Trip) => void
  onClose: () => void
  onAddTrip?: (prefill?: { arrivalDate?: string; departureDate?: string }) => void
}

function formatDate(date: Date | null | undefined): string | null {
  if (!date) return null
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function toDateStr(d: Date | string | null | undefined): string {
  if (!d) return ''
  const date = typeof d === 'string' ? new Date(d) : d
  if (isNaN(date.getTime())) return ''
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function gapDaysBetween(prev: Trip | null, next: Trip | null): number | null {
  if (!prev || !next) return null
  const prevEnd = prev.departureDate ? new Date(prev.departureDate) : new Date(prev.arrivalDate)
  const nextStart = new Date(next.arrivalDate)
  const gap = Math.round((nextStart.getTime() - prevEnd.getTime()) / 86400000)
  return gap > 1 ? gap : null
}

export default function TripPopup({ trip, prevTrip, nextTrip, onNavigate, onClose, onAddTrip }: TripPopupProps) {
  const [visible, setVisible] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    if (trip) {
      setMounted(true)
      requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)))
    } else {
      setVisible(false)
      const timer = setTimeout(() => setMounted(false), 200)
      return () => clearTimeout(timer)
    }
  }, [trip])

  const gapToPrev = useMemo(() => gapDaysBetween(prevTrip, trip), [prevTrip, trip])
  const gapToNext = useMemo(() => gapDaysBetween(trip, nextTrip), [trip, nextTrip])

  if (!mounted || !trip) return null

  const arrival = formatDate(trip.arrivalDate)
  const departure = formatDate(trip.departureDate)

  const now = new Date()
  const arrDate = new Date(trip.arrivalDate)
  const depDate = trip.departureDate ? new Date(trip.departureDate) : arrDate
  const tense: 'past' | 'current' | 'future' =
    arrDate <= now && depDate >= now ? 'current' : arrDate > now ? 'future' : 'past'
  const colors = TENSE_COLORS[tense]

  return (
    <div
      className={`absolute right-6 z-20 ${GLASS.panel} rounded-xl shadow-lg p-3 w-[320px]`}
      style={{
        bottom: 'calc(max(1.25rem, env(safe-area-inset-bottom, 0px)) + 60px)',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(8px)',
        transition: 'opacity 200ms cubic-bezier(0.32,0.72,0,1), transform 200ms cubic-bezier(0.32,0.72,0,1)',
        pointerEvents: visible ? 'auto' : 'none',
      }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <div className={`shrink-0 w-6 h-6 rounded ${colors.icon} flex items-center justify-center`}>
            <MapPin className={`h-3.5 w-3.5 ${colors.iconText}`} />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold truncate">{trip.city}</div>
            <div className="text-xs text-muted-foreground truncate">{trip.country}</div>
          </div>
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={onClose}
                className="text-muted-foreground hover:text-foreground transition-colors shrink-0 ml-2"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent>Close</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <div className="flex items-center gap-3 mt-2">
        {arrival && (
          <div className="flex items-center gap-1 text-muted-foreground">
            <Calendar className="h-3 w-3" />
            <span className="text-[10px]">{arrival}</span>
          </div>
        )}
        {departure && (
          <div className="flex items-center gap-1 text-muted-foreground">
            <Calendar className="h-3 w-3" />
            <span className="text-[10px]">{departure}</span>
          </div>
        )}
        {trip.durationDays != null && (
          <div className="flex items-center gap-1 text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span className="text-[10px]">{trip.durationDays}d</span>
          </div>
        )}
      </div>

      {(prevTrip || nextTrip) && (
        <div className="mt-2 pt-2 border-t border-border">
          <div className="flex items-center justify-between">
            {prevTrip ? (
              <button
                onClick={() => onNavigate(prevTrip)}
                className={`flex items-center gap-0.5 text-[10px] ${colors.iconText} hover:brightness-125 transition-colors max-w-[120px]`}
              >
                <ChevronLeft className="h-3 w-3 shrink-0" />
                <span className="truncate">{prevTrip.city}</span>
              </button>
            ) : (
              <span />
            )}
            {(gapToPrev || gapToNext) && (
              <span className="text-[9px] text-muted-foreground/50">
                {gapToPrev ? `${gapToPrev}d gap` : gapToNext ? `${gapToNext}d gap` : ''}
              </span>
            )}
            {nextTrip ? (
              <button
                onClick={() => onNavigate(nextTrip)}
                className={`flex items-center gap-0.5 text-[10px] ${colors.iconText} hover:brightness-125 transition-colors max-w-[120px]`}
              >
                <span className="truncate">{nextTrip.city}</span>
                <ChevronRight className="h-3 w-3 shrink-0" />
              </button>
            ) : (
              <span />
            )}
          </div>
        </div>
      )}

      {!nextTrip && onAddTrip && (
        <div className="mt-2 pt-2 border-t border-border">
          <button
            onClick={() => {
              const depStr = toDateStr(trip.departureDate || trip.arrivalDate)
              const nextDay = new Date(depStr + 'T00:00:00')
              nextDay.setDate(nextDay.getDate() + 1)
              const y = nextDay.getFullYear()
              const m = String(nextDay.getMonth() + 1).padStart(2, '0')
              const d = String(nextDay.getDate()).padStart(2, '0')
              onAddTrip({ arrivalDate: `${y}-${m}-${d}` })
            }}
            className="flex items-center gap-1 text-[10px] text-blue-400 hover:text-blue-300 transition-colors"
          >
            <Plus className="h-3 w-3" />
            Add next trip
          </button>
        </div>
      )}
    </div>
  )
}
