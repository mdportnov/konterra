'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import type { Contact, Tag } from '@/lib/db/schema'

const STORAGE_KEY = 'globe-filters'

function loadFilters(): { ratings?: number[]; tags?: string[]; relTypes?: string[]; countries?: string[]; importSources?: string[] } | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function saveFilters(ratings: Set<number>, tags: Set<string>, relTypes: Set<string>, countries: Set<string>, importSources: Set<string>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      ratings: [...ratings],
      tags: [...tags],
      relTypes: [...relTypes],
      countries: [...countries],
      importSources: [...importSources],
    }))
  } catch {}
}

function initSet<T>(saved: T[] | undefined, fallback: Set<T>): Set<T> {
  return saved ? new Set(saved) : fallback
}

export function useContactFilters(contacts: Contact[], userTags: Tag[]) {
  const [saved] = useState(() => loadFilters())
  const [activeRatings, setActiveRatings] = useState<Set<number>>(() => initSet(saved?.ratings, new Set([1, 2, 3, 4, 5])))
  const [activeTags, setActiveTags] = useState<Set<string>>(() => initSet(saved?.tags, new Set()))
  const [activeRelTypes, setActiveRelTypes] = useState<Set<string>>(() => initSet(saved?.relTypes, new Set()))
  const [activeCountries, setActiveCountries] = useState<Set<string>>(() => initSet(saved?.countries, new Set()))
  const [activeImportSources, setActiveImportSources] = useState<Set<string>>(() => initSet(saved?.importSources, new Set()))

  useEffect(() => {
    saveFilters(activeRatings, activeTags, activeRelTypes, activeCountries, activeImportSources)
  }, [activeRatings, activeTags, activeRelTypes, activeCountries, activeImportSources])

  const allTags = useMemo(() => {
    const s = new Set<string>()
    contacts.forEach((c) => c.tags?.forEach((t) => s.add(t)))
    userTags.forEach((t) => s.add(t.name))
    return Array.from(s).sort()
  }, [contacts, userTags])

  const allRelTypes = useMemo(() => {
    const s = new Set<string>()
    contacts.forEach((c) => { if (c.relationshipType) s.add(c.relationshipType) })
    return Array.from(s).sort()
  }, [contacts])

  const allCountries = useMemo(() => {
    const s = new Set<string>()
    contacts.forEach((c) => { if (c.country) s.add(c.country) })
    return Array.from(s).sort()
  }, [contacts])

  const allImportSources = useMemo(() => {
    const s = new Set<string>()
    contacts.forEach((c) => { if (c.importSource) s.add(c.importSource) })
    return Array.from(s).sort()
  }, [contacts])

  const pruned = useRef(false)
  useEffect(() => {
    if (pruned.current || contacts.length === 0) return
    pruned.current = true
    const tagSet = new Set(allTags)
    const relSet = new Set(allRelTypes)
    const countrySet = new Set(allCountries)
    const sourceSet = new Set(allImportSources)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setActiveTags((prev) => { const n = new Set([...prev].filter((t) => tagSet.has(t))); return n.size === prev.size ? prev : n })
    setActiveRelTypes((prev) => { const n = new Set([...prev].filter((t) => relSet.has(t))); return n.size === prev.size ? prev : n })
    setActiveCountries((prev) => { const n = new Set([...prev].filter((c) => countrySet.has(c))); return n.size === prev.size ? prev : n })
    setActiveImportSources((prev) => { const n = new Set([...prev].filter((s) => sourceSet.has(s))); return n.size === prev.size ? prev : n })
  }, [contacts.length, allTags, allRelTypes, allCountries, allImportSources])

  const filteredContacts = useMemo(
    () => contacts.filter((c) => {
      if (c.rating && !activeRatings.has(c.rating)) return false
      if (activeTags.size > 0 && !c.tags?.some((t) => activeTags.has(t))) return false
      if (activeRelTypes.size > 0 && (!c.relationshipType || !activeRelTypes.has(c.relationshipType))) return false
      if (activeCountries.size > 0 && (!c.country || !activeCountries.has(c.country))) return false
      if (activeImportSources.size > 0 && (!c.importSource || !activeImportSources.has(c.importSource))) return false
      return true
    }),
    [contacts, activeRatings, activeTags, activeRelTypes, activeCountries, activeImportSources]
  )

  return {
    activeRatings, setActiveRatings,
    activeTags, setActiveTags,
    activeRelTypes, setActiveRelTypes,
    activeCountries, setActiveCountries,
    activeImportSources, setActiveImportSources,
    allTags, allRelTypes, allCountries, allImportSources,
    filteredContacts,
  }
}
