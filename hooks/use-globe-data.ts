'use client'

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { toast } from 'sonner'
import { fetchContacts, fetchConnections, fetchVisitedCountries, fetchTags, fetchRecentInteractions, fetchAllFavors } from '@/lib/api'
import type { Contact, ContactConnection, Tag, Interaction, Favor } from '@/lib/db/schema'

export function useGlobeData() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [connections, setConnections] = useState<ContactConnection[]>([])
  const [visitedCountries, setVisitedCountries] = useState<Set<string>>(new Set())
  const [userTags, setUserTags] = useState<Tag[]>([])
  const [allInteractions, setAllInteractions] = useState<(Interaction & { contactName: string })[]>([])
  const [allFavors, setAllFavors] = useState<Favor[]>([])
  const [loading, setLoading] = useState(true)

  const pendingContactIdRef = useRef<string | null>(null)
  const initialResolveRef = useRef<{
    onLoaded?: (data: Contact[]) => void
  }>({})

  const load = useCallback((onLoaded?: (data: Contact[]) => void) => {
    initialResolveRef.current.onLoaded = onLoaded
    fetchContacts()
      .then((data) => {
        setContacts(data)
        setLoading(false)
        initialResolveRef.current.onLoaded?.(data)
        initialResolveRef.current.onLoaded = undefined
      })
      .catch(() => {
        toast.error('Failed to load contacts')
        setLoading(false)
      })
  }, [])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    fetchVisitedCountries()
      .then((data) => {
        if (Array.isArray(data)) setVisitedCountries(new Set(data))
      })
      .catch(() => toast.error('Failed to load visited countries'))
  }, [])

  useEffect(() => {
    fetchConnections()
      .then((data) => {
        if (Array.isArray(data)) setConnections(data)
      })
      .catch(() => toast.error('Failed to load connections'))
  }, [])

  useEffect(() => {
    fetchTags().then((data) => {
      if (Array.isArray(data)) setUserTags(data)
    }).catch(() => {})
  }, [])

  useEffect(() => {
    fetchRecentInteractions().then(setAllInteractions).catch(() => {})
  }, [])

  useEffect(() => {
    fetchAllFavors().then(setAllFavors).catch(() => {})
  }, [])

  const reloadContacts = useCallback(() => {
    fetchContacts().then(setContacts)
  }, [])

  const handleCountryVisitToggle = useCallback((country: string) => {
    const wasVisited = visitedCountries.has(country)
    setVisitedCountries((prev) => {
      const next = new Set(prev)
      if (wasVisited) next.delete(country)
      else next.add(country)
      return next
    })
    fetch('/api/visited-countries', {
      method: wasVisited ? 'DELETE' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ country }),
    }).catch(() => {
      setVisitedCountries((prev) => {
        const rollback = new Set(prev)
        if (wasVisited) rollback.add(country)
        else rollback.delete(country)
        return rollback
      })
      toast.error('Failed to update visited country')
    })
  }, [visitedCountries])

  const handleTagCreated = useCallback((tag: Tag) => {
    setUserTags((prev) => {
      if (prev.some((t) => t.id === tag.id)) return prev
      return [...prev, tag].sort((a, b) => a.name.localeCompare(b.name))
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
    visitedCountries, setVisitedCountries,
    userTags, setUserTags,
    allInteractions,
    allFavors,
    loading,
    pendingContactIdRef,
    reloadContacts,
    handleCountryVisitToggle,
    handleTagCreated,
    handleTagDeleted,
  }
}
