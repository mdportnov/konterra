'use client'

import { useState, useEffect } from 'react'
import type { Trip } from '@/lib/db/schema'
import { GLASS } from '@/lib/constants/ui'
import { ChevronLeft, ChevronRight, X, Calendar, Clock, MapPin } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

interface TripPopupProps {
  trip: Trip | null
  prevTrip: Trip | null
  nextTrip: Trip | null
  onNavigate: (trip: Trip) => void
  onClose: () => void
}

function formatDate(date: Date | null | undefined): string | null {
  if (!date) return null
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export default function TripPopup({ trip, prevTrip, nextTrip, onNavigate, onClose }: TripPopupProps) {
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

  if (!mounted || !trip) return null

  const arrival = formatDate(trip.arrivalDate)
  const departure = formatDate(trip.departureDate)

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
          <div className="shrink-0 w-6 h-6 rounded bg-blue-500/10 flex items-center justify-center">
            <MapPin className="h-3.5 w-3.5 text-blue-400" />
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
        <div className="flex items-center justify-between mt-2 pt-2 border-t border-border">
          {prevTrip ? (
            <button
              onClick={() => onNavigate(prevTrip)}
              className="flex items-center gap-0.5 text-[10px] text-blue-400 hover:text-blue-300 transition-colors max-w-[120px]"
            >
              <ChevronLeft className="h-3 w-3 shrink-0" />
              <span className="truncate">{prevTrip.city}</span>
            </button>
          ) : (
            <span />
          )}
          {nextTrip ? (
            <button
              onClick={() => onNavigate(nextTrip)}
              className="flex items-center gap-0.5 text-[10px] text-blue-400 hover:text-blue-300 transition-colors max-w-[120px]"
            >
              <span className="truncate">{nextTrip.city}</span>
              <ChevronRight className="h-3 w-3 shrink-0" />
            </button>
          ) : (
            <span />
          )}
        </div>
      )}
    </div>
  )
}
