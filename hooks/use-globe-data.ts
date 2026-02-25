'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { toast } from 'sonner'
import { fetchContacts, fetchConnections, fetchVisitedCountries, fetchTags, fetchRecentInteractions, fetchAllFavors, fetchAllCountryConnections, fetchTrips, fetchWishlistCountries } from '@/lib/api'
import { normalizeToGlobeName } from '@/components/globe/data/country-centroids'
import type { Contact, ContactConnection, ContactCountryConnection, CountryWishlistEntry, Tag, Interaction, Favor, Trip } from '@/lib/db/schema'

export function useGlobeData() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [connections, setConnections] = useState<ContactConnection[]>([])
  const [countryConnections, setCountryConnections] = useState<ContactCountryConnection[]>([])
  const [visitedCountries, setVisitedCountries] = useState<Set<string>>(new Set())
  const [wishlistCountries, setWishlistCountries] = useState<Map<string, CountryWishlistEntry>>(new Map())
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
      .catch(() => { if (!signal.aborted) toast.error('Failed to load visited countries') })

    fetchWishlistCountries(signal)
      .then((data) => {
        if (Array.isArray(data)) {
          const map = new Map<string, CountryWishlistEntry>()
          for (const entry of data) map.set(normalizeToGlobeName(entry.country), entry)
          setWishlistCountries(map)
        }
      })
      .catch(() => { if (!signal.aborted) toast.error('Failed to load wishlist') })

    fetchConnections(signal)
      .then((data) => { if (Array.isArray(data)) setConnections(data) })
      .catch(() => { if (!signal.aborted) toast.error('Failed to load connections') })

    fetchAllCountryConnections(signal)
      .then((data) => { if (Array.isArray(data)) setCountryConnections(data) })
      .catch(() => { if (!signal.aborted) toast.error('Failed to load country connections') })

    fetchTags(signal)
      .then((data) => { if (Array.isArray(data)) setUserTags(data) })
      .catch(() => {})

    fetchTrips(signal).then(setTrips).catch(() => {}).finally(() => setTripsLoading(false))

    const deferTimer = setTimeout(() => {
      if (signal.aborted) return
      fetchRecentInteractions(signal).then(setAllInteractions).catch(() => {})
      fetchAllFavors(signal).then(setAllFavors).catch(() => {})
    }, 3000)

    return () => { clearTimeout(deferTimer); controller.abort() }
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

  const reloadWishlistCountries = useCallback(() => {
    return fetchWishlistCountries().then((data) => {
      if (Array.isArray(data)) {
        const map = new Map<string, CountryWishlistEntry>()
        for (const entry of data) map.set(normalizeToGlobeName(entry.country), entry)
        setWishlistCountries(map)
      }
    }).catch(() => {})
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

  const wishlistToggleInFlight = useRef(new Set<string>())
  const wishlistRef = useRef(wishlistCountries)
  wishlistRef.current = wishlistCountries

  const handleWishlistToggle = useCallback((country: string) => {
    if (wishlistToggleInFlight.current.has(country)) return
    wishlistToggleInFlight.current.add(country)

    const currentEntry = wishlistRef.current.get(country)
    const wasWishlisted = !!currentEntry

    setWishlistCountries((prev) => {
      const next = new Map(prev)
      if (wasWishlisted) {
        next.delete(country)
      } else {
        next.set(country, {
          id: '',
          userId: '',
          country,
          priority: 'medium',
          status: 'idea',
          notes: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
      }
      return next
    })

    if (wasWishlisted) {
      const url = currentEntry?.id ? `/api/wishlist-countries/${currentEntry.id}` : '/api/wishlist-countries'
      const body = currentEntry?.id ? undefined : JSON.stringify({ country })
      fetch(url, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        ...(body ? { body } : {}),
      })
        .then((res) => { if (!res.ok) throw new Error() })
        .catch(() => {
          setWishlistCountries((prev) => {
            const rollback = new Map(prev)
            if (currentEntry) rollback.set(country, currentEntry)
            return rollback
          })
          toast.error('Failed to update wishlist')
        })
        .finally(() => { wishlistToggleInFlight.current.delete(country) })
    } else {
      fetch('/api/wishlist-countries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ country }),
      })
        .then((res) => {
          if (!res.ok) throw new Error()
          return res.json()
        })
        .then((entry: CountryWishlistEntry) => {
          setWishlistCountries((prev) => {
            const next = new Map(prev)
            next.set(normalizeToGlobeName(entry.country), entry)
            return next
          })
        })
        .catch(() => {
          setWishlistCountries((prev) => {
            const rollback = new Map(prev)
            rollback.delete(country)
            return rollback
          })
          toast.error('Failed to update wishlist')
        })
        .finally(() => { wishlistToggleInFlight.current.delete(country) })
    }
  }, [])

  const handleWishlistUpdate = useCallback((country: string, patch: { priority?: string; status?: string; notes?: string | null }) => {
    const entry = wishlistRef.current.get(country)
    if (!entry) return
    if (!entry.id) {
      setWishlistCountries((prev) => {
        const next = new Map(prev)
        const current = next.get(country)
        if (current) {
          next.set(country, { ...current, ...patch, updatedAt: new Date() } as CountryWishlistEntry)
        }
        return next
      })
      return
    }

    const snapshotEntry = { ...entry }

    setWishlistCountries((prev) => {
      const next = new Map(prev)
      const current = next.get(country)
      if (current) {
        next.set(country, { ...current, ...patch, updatedAt: new Date() } as CountryWishlistEntry)
      }
      return next
    })

    fetch(`/api/wishlist-countries/${entry.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
      .then((res) => {
        if (!res.ok) throw new Error()
        return res.json()
      })
      .then((updated: CountryWishlistEntry) => {
        setWishlistCountries((prev) => {
          const next = new Map(prev)
          next.set(normalizeToGlobeName(updated.country), updated)
          return next
        })
      })
      .catch(() => {
        setWishlistCountries((prev) => {
          const next = new Map(prev)
          next.set(country, snapshotEntry)
          return next
        })
        toast.error('Failed to update wishlist entry')
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
    wishlistCountries, setWishlistCountries,
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
    reloadWishlistCountries,
    runBatchGeocode,
    handleCountryVisitToggle,
    handleWishlistToggle,
    handleWishlistUpdate,
    handleCountryConnectionsChange,
    handleTagCreated,
    handleTagDeleted,
  }
}
