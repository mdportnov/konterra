'use client'

import { useState, useCallback, useMemo } from 'react'
import type { Trip } from '@/lib/db/schema'

export interface TripGap {
  fromTrip: Trip
  toTrip: Trip
  days: number
  label: string
}

export interface GapStats {
  totalDays: number
  averageDays: number
  longestGap: TripGap | null
  shortestGap: TripGap | null
}

export function formatGap(days: number): string {
  if (days < 0) return 'overlapping'
  if (days === 0) return 'adjacent'
  if (days < 7) return `${days}d`
  if (days < 60) {
    const weeks = Math.floor(days / 7)
    const rem = days % 7
    return rem > 0 ? `${weeks}w ${rem}d` : `${weeks}w`
  }
  const months = Math.floor(days / 30)
  const rem = days % 30
  return rem > 0 ? `${months}mo ${rem}d` : `${months}mo`
}

interface UseTripCompareOptions {
  trips: Trip[]
}

export function useTripCompare({ trips }: UseTripCompareOptions) {
  const [compareMode, setCompareMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [panelOpen, setPanelOpen] = useState(false)

  const toggleCompareMode = useCallback(() => {
    setCompareMode(prev => {
      if (prev) {
        setSelectedIds(new Set())
        setPanelOpen(false)
      }
      return !prev
    })
  }, [])

  const toggleTrip = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const selectedTrips = useMemo(() =>
    trips
      .filter(t => selectedIds.has(t.id))
      .sort((a, b) => new Date(a.arrivalDate).getTime() - new Date(b.arrivalDate).getTime()),
    [trips, selectedIds]
  )

  const gaps = useMemo<TripGap[]>(() => {
    if (selectedTrips.length < 2) return []
    const result: TripGap[] = []
    for (let i = 0; i < selectedTrips.length - 1; i++) {
      const from = selectedTrips[i]
      const to = selectedTrips[i + 1]
      const endDate = from.departureDate ? new Date(from.departureDate) : new Date(from.arrivalDate)
      const startDate = new Date(to.arrivalDate)
      const days = Math.round((startDate.getTime() - endDate.getTime()) / 86400000)
      result.push({ fromTrip: from, toTrip: to, days, label: formatGap(days) })
    }
    return result
  }, [selectedTrips])

  const stats = useMemo<GapStats>(() => {
    if (gaps.length === 0) return { totalDays: 0, averageDays: 0, longestGap: null, shortestGap: null }
    const positiveGaps = gaps.filter(g => g.days > 0)
    const totalDays = positiveGaps.reduce((sum, g) => sum + g.days, 0)
    const averageDays = positiveGaps.length > 0 ? Math.round(totalDays / positiveGaps.length) : 0
    let longestGap: TripGap | null = null
    let shortestGap: TripGap | null = null
    for (const g of positiveGaps) {
      if (!longestGap || g.days > longestGap.days) longestGap = g
      if (!shortestGap || g.days < shortestGap.days) shortestGap = g
    }
    return { totalDays, averageDays, longestGap, shortestGap }
  }, [gaps])

  const canOpenCompare = selectedIds.size >= 2

  const openPanel = useCallback(() => {
    setPanelOpen(true)
  }, [])

  const closePanel = useCallback(() => {
    setPanelOpen(false)
    setSelectedIds(new Set())
    setCompareMode(false)
  }, [])

  const dismissPanel = useCallback(() => {
    setPanelOpen(false)
  }, [])

  return {
    compareMode,
    toggleCompareMode,
    selectedIds,
    toggleTrip,
    selectedTrips,
    gaps,
    stats,
    canOpenCompare,
    panelOpen,
    openPanel,
    closePanel,
    dismissPanel,
  }
}
