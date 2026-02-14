'use client'

import { useState, useCallback, useMemo } from 'react'
import type { Trip } from '@/lib/db/schema'

interface UseTripSelectionOptions {
  trips: Trip[]
  setFlyTarget: (target: { lat: number; lng: number; ts: number }) => void
}

export function useTripSelection({ trips, setFlyTarget }: UseTripSelectionOptions) {
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null)

  const selectedTrip = useMemo(
    () => trips.find((t) => t.id === selectedTripId) ?? null,
    [trips, selectedTripId]
  )

  const sortedTrips = useMemo(
    () => [...trips].sort((a, b) => new Date(a.arrivalDate).getTime() - new Date(b.arrivalDate).getTime()),
    [trips]
  )

  const selectedTripIndex = useMemo(() => {
    if (!selectedTripId) return -1
    return sortedTrips.findIndex((t) => t.id === selectedTripId)
  }, [sortedTrips, selectedTripId])

  const handleTripClick = useCallback((trip: Trip) => {
    setSelectedTripId(trip.id)
    if (trip.lat != null && trip.lng != null) {
      setFlyTarget({ lat: trip.lat, lng: trip.lng, ts: Date.now() })
    }
  }, [setFlyTarget])

  const handleTripPointClick = useCallback((tripId: string) => {
    setSelectedTripId(tripId)
    const trip = trips.find((t) => t.id === tripId)
    if (trip?.lat != null && trip?.lng != null) {
      setFlyTarget({ lat: trip.lat, lng: trip.lng, ts: Date.now() })
    }
  }, [trips, setFlyTarget])

  const handleTripNavigate = useCallback((trip: Trip) => {
    setSelectedTripId(trip.id)
    if (trip.lat != null && trip.lng != null) {
      setFlyTarget({ lat: trip.lat, lng: trip.lng, ts: Date.now() })
    }
  }, [setFlyTarget])

  const clearSelectedTrip = useCallback(() => setSelectedTripId(null), [])

  return {
    selectedTripId,
    selectedTrip,
    sortedTrips,
    selectedTripIndex,
    handleTripClick,
    handleTripPointClick,
    handleTripNavigate,
    clearSelectedTrip,
  }
}
