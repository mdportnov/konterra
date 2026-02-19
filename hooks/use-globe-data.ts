'use client'

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { toast } from 'sonner'
import { fetchContacts, fetchConnections, fetchVisitedCountries, fetchTags, fetchRecentInteractions, fetchAllFavors, fetchAllCountryConnections, fetchTrips } from '@/lib/api'
import { normalizeToGlobeName } from '@/components/globe/data/country-centroids'
import type { Contact, ContactConnection, ContactCountryConnection, Tag, Interaction, Favor, Trip } from '@/lib/db/schema'

export function useGlobeData() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [connections, setConnections] = useState<ContactConnection[]>([])
  const [countryConnections, setCountryConnections] = useState<ContactCountryConnection[]>([])
  const [visitedCountries, setVisitedCountries] = useState<Set<string>>(new Set())
  const [userTags, setUserTags] = useState<Tag[]>([])
  const [allInteractions, setAllInteractions] = useState<(Interaction & { contactName: string })[]>([])
  const [allFavors, setAllFavors] = useState<Favor[]>([])
  const [trips, setTrips] = useState<Trip[]>([])
  const [tripsLoading, setTripsLoading] = useState(true)
  const [loading, setLoading] = useState(true)

  const pendingContactIdRef = useRef<string | null>(null)
  const initialResolveRef = useRef<{
    onLoaded?: (data: Contact[]) => void
  }>({})

  const needsGeocodeRef = useRef(false)

  const load = useCallback((onLoaded?: (data: Contact[]) => void) => {
    initialResolveRef.current.onLoaded = onLoaded
    fetchContacts()
      .then((data) => {
        setContacts(data)
        setLoading(false)
        initialResolveRef.current.onLoaded?.(data)
        initialResolveRef.current.onLoaded = undefined
        if (data.some((c) => (c.city || c.country) && c.lat == null)) {
          needsGeocodeRef.current = true
        }
      })
      .catch(() => {
        toast.error('Failed to load contacts')
        setLoading(false)
      })
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    const { signal } = controller

    load()

    fetchVisitedCountries(signal)
      .then((data) => { if (Array.isArray(data)) setVisitedCountries(new Set(data.map(normalizeToGlobeName))) })
      .catch((e) => { if (!signal.aborted) toast.error('Failed to load visited countries') })

    fetchConnections(signal)
      .then((data) => { if (Array.isArray(data)) setConnections(data) })
      .catch((e) => { if (!signal.aborted) toast.error('Failed to load connections') })

    fetchAllCountryConnections(signal)
      .then((data) => { if (Array.isArray(data)) setCountryConnections(data) })
      .catch((e) => { if (!signal.aborted) toast.error('Failed to load country connections') })

    fetchTags(signal)
      .then((data) => { if (Array.isArray(data)) setUserTags(data) })
      .catch(() => {})

    fetchRecentInteractions(signal).then(setAllInteractions).catch(() => {})
    fetchAllFavors(signal).then(setAllFavors).catch(() => {})
    fetchTrips(signal).then(setTrips).catch(() => {}).finally(() => setTripsLoading(false))

    return () => controller.abort()
  }, [load])

  const reloadContacts = useCallback(() => {
    return fetchContacts().then((data) => { setContacts(data); return data }).catch(() => { toast.error('Failed to reload contacts'); return [] as Contact[] })
  }, [])

  const reloadConnections = useCallback(() => {
    return fetchConnections().then((data) => { if (Array.isArray(data)) setConnections(data) }).catch(() => { toast.error('Failed to reload connections') })
  }, [])

  const reloadTrips = useCallback(() => {
    return fetchTrips().then(setTrips).catch(() => { toast.error('Failed to reload trips') })
  }, [])

  const reloadVisitedCountries = useCallback(() => {
    return fetchVisitedCountries().then((data) => { if (Array.isArray(data)) setVisitedCountries(new Set(data.map(normalizeToGlobeName))) }).catch(() => {})
  }, [])

  const geocodingRef = useRef(false)

  const runBatchGeocode = useCallback(async () => {
    if (geocodingRef.current) return
    geocodingRef.current = true
    try {
      let remaining = Infinity
      while (remaining > 0) {
        const res = await fetch('/api/geocode/batch', { method: 'POST' })
        if (!res.ok) break
        const data = await res.json()
        remaining = data.remaining ?? 0
        if (data.geocoded > 0) {
          await fetchContacts().then(setContacts)
        }
        if (remaining === 0 || data.geocoded === 0) break
      }
    } catch {} finally {
      geocodingRef.current = false
    }
  }, [])

  const tripGeocodingRef = useRef(false)

  const runTripBatchGeocode = useCallback(async () => {
    if (tripGeocodingRef.current) return
    tripGeocodingRef.current = true
    try {
      let remaining = Infinity
      while (remaining > 0) {
        const res = await fetch('/api/geocode/trips', { method: 'POST' })
        if (!res.ok) break
        const data = await res.json()
        remaining = data.remaining ?? 0
        if (data.geocoded > 0) {
          await fetchTrips().then(setTrips)
        }
        if (remaining === 0 || data.geocoded === 0) break
      }
    } catch {} finally {
      tripGeocodingRef.current = false
    }
  }, [])

  useEffect(() => {
    if (!loading && needsGeocodeRef.current) {
      needsGeocodeRef.current = false
      runBatchGeocode()
    }
  }, [loading, runBatchGeocode])

  useEffect(() => {
    if (!tripsLoading && trips.length > 0 && trips.some((t) => t.lat == null)) {
      runTripBatchGeocode()
    }
  }, [tripsLoading, trips, runTripBatchGeocode])

  const visitedToggleInFlight = useRef(new Set<string>())

  const handleCountryVisitToggle = useCallback((country: string) => {
    if (visitedToggleInFlight.current.has(country)) return
    visitedToggleInFlight.current.add(country)

    let wasVisited = false
    setVisitedCountries((prev) => {
      wasVisited = prev.has(country)
      const next = new Set(prev)
      if (wasVisited) next.delete(country)
      else next.add(country)
      return next
    })

    fetch('/api/visited-countries', {
      method: wasVisited ? 'DELETE' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ country }),
    })
      .then((res) => {
        if (!res.ok) throw new Error()
      })
      .catch(() => {
        setVisitedCountries((prev) => {
          const rollback = new Set(prev)
          if (wasVisited) rollback.add(country)
          else rollback.delete(country)
          return rollback
        })
        toast.error('Failed to update visited country')
      })
      .finally(() => {
        visitedToggleInFlight.current.delete(country)
      })
  }, [])

  const handleTagCreated = useCallback((tag: Tag) => {
    setUserTags((prev) => {
      if (prev.some((t) => t.id === tag.id)) return prev
      return [...prev, tag].sort((a, b) => a.name.localeCompare(b.name))
    })
  }, [])

  const handleCountryConnectionsChange = useCallback((contactId: string, updated: ContactCountryConnection[]) => {
    setCountryConnections((prev) => {
      const filtered = prev.filter((c) => c.contactId !== contactId)
      return [...filtered, ...updated]
    })
  }, [])

  const handleTagDeleted = useCallback((tagId: string, tagName: string) => {
    setUserTags((prev) => prev.filter((t) => t.id !== tagId))
    setContacts((prev) =>
      prev.map((c) => {
        if (!c.tags?.includes(tagName)) return c
        const updated = c.tags.filter((t) => t !== tagName)
        return { ...c, tags: updated.length > 0 ? updated : null }
      })
    )
  }, [])

  return {
    contacts, setContacts,
    connections, setConnections,
    countryConnections, setCountryConnections,
    visitedCountries, setVisitedCountries,
    userTags, setUserTags,
    allInteractions,
    allFavors,
    trips, setTrips, tripsLoading,
    loading,
    pendingContactIdRef,
    reloadContacts,
    reloadConnections,
    reloadTrips,
    reloadVisitedCountries,
    runBatchGeocode,
    handleCountryVisitToggle,
    handleCountryConnectionsChange,
    handleTagCreated,
    handleTagDeleted,
  }
}
