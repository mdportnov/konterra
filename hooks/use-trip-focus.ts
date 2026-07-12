'use client'

import { useCallback, useMemo, useState } from 'react'
import { toDateOnlyStr } from '@/lib/utils'
import type { Trip } from '@/lib/db/schema'

export interface TripFocusRange {
  start: string
  end: string
}

interface UseTripFocusOptions {
  trips: Trip[]
}

export function useTripFocus({ trips }: UseTripFocusOptions) {
  const [range, setRange] = useState<TripFocusRange | null>(null)

  const focusActive = range !== null

  const focusedTrips = useMemo(() => {
    if (!range) return trips
    return trips.filter((t) => {
      const arrival = toDateOnlyStr(t.arrivalDate)
      if (!arrival) return false
      const departure = toDateOnlyStr(t.departureDate) || arrival
      return arrival <= range.end && departure >= range.start
    })
  }, [trips, range])

  const clearFocus = useCallback(() => setRange(null), [])

  return { range, setRange, focusActive, focusedTrips, clearFocus }
}
