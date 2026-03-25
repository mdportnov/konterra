'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import type { Contact, Tag } from '@/lib/db/schema'

const STORAGE_KEY = 'globe-filters'

interface SavedFilters {
  ratings?: number[]
  tags?: string[]
  relTypes?: string[]
  countries?: string[]
  importSources?: string[]
  commStyles?: string[]
  channels?: string[]
  influenceLevels?: number[]
  trustLevels?: number[]
  finCapacities?: string[]
}

function loadFilters(): SavedFilters | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function saveFilters(
  ratings: Set<number>,
  tags: Set<string>,
  relTypes: Set<string>,
  countries: Set<string>,
  importSources: Set<string>,
  commStyles: Set<string>,
  channels: Set<string>,
  influenceLevels: Set<number>,
  trustLevels: Set<number>,
  finCapacities: Set<string>,
) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      ratings: [...ratings],
      tags: [...tags],
      relTypes: [...relTypes],
      countries: [...countries],
      importSources: [...importSources],
      commStyles: [...commStyles],
      channels: [...channels],
      influenceLevels: [...influenceLevels],
      trustLevels: [...trustLevels],
      finCapacities: [...finCapacities],
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
  const [activeCommStyles, setActiveCommStyles] = useState<Set<string>>(() => initSet(saved?.commStyles, new Set()))
  const [activeChannels, setActiveChannels] = useState<Set<string>>(() => initSet(saved?.channels, new Set()))
  const [activeInfluenceLevels, setActiveInfluenceLevels] = useState<Set<number>>(() => initSet(saved?.influenceLevels, new Set()))
  const [activeTrustLevels, setActiveTrustLevels] = useState<Set<number>>(() => initSet(saved?.trustLevels, new Set()))
  const [activeFinCapacities, setActiveFinCapacities] = useState<Set<string>>(() => initSet(saved?.finCapacities, new Set()))

  useEffect(() => {
    saveFilters(activeRatings, activeTags, activeRelTypes, activeCountries, activeImportSources, activeCommStyles, activeChannels, activeInfluenceLevels, activeTrustLevels, activeFinCapacities)
  }, [activeRatings, activeTags, activeRelTypes, activeCountries, activeImportSources, activeCommStyles, activeChannels, activeInfluenceLevels, activeTrustLevels, activeFinCapacities])

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

  const allCommStyles = useMemo(() => {
    const s = new Set<string>()
    contacts.forEach((c) => { if (c.communicationStyle) s.add(c.communicationStyle) })
    return Array.from(s).sort()
  }, [contacts])

  const allChannels = useMemo(() => {
    const s = new Set<string>()
    contacts.forEach((c) => { if (c.preferredChannel) s.add(c.preferredChannel) })
    return Array.from(s).sort()
  }, [contacts])

  const allInfluenceLevels = useMemo(() => {
    const s = new Set<number>()
    contacts.forEach((c) => { if (c.influenceLevel != null) s.add(c.influenceLevel) })
    return Array.from(s).sort((a, b) => a - b)
  }, [contacts])

  const allTrustLevels = useMemo(() => {
    const s = new Set<number>()
    contacts.forEach((c) => { if (c.trustLevel != null) s.add(c.trustLevel) })
    return Array.from(s).sort((a, b) => a - b)
  }, [contacts])

  const allFinCapacities = useMemo(() => {
    const s = new Set<string>()
    contacts.forEach((c) => { if (c.financialCapacity) s.add(c.financialCapacity) })
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
    const commSet = new Set(allCommStyles)
    const channelSet = new Set(allChannels)
    const influenceSet = new Set(allInfluenceLevels)
    const trustSet = new Set(allTrustLevels)
    const finSet = new Set(allFinCapacities)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setActiveTags((prev) => { const n = new Set([...prev].filter((t) => tagSet.has(t))); return n.size === prev.size ? prev : n })
    setActiveRelTypes((prev) => { const n = new Set([...prev].filter((t) => relSet.has(t))); return n.size === prev.size ? prev : n })
    setActiveCountries((prev) => { const n = new Set([...prev].filter((c) => countrySet.has(c))); return n.size === prev.size ? prev : n })
    setActiveImportSources((prev) => { const n = new Set([...prev].filter((s) => sourceSet.has(s))); return n.size === prev.size ? prev : n })
    setActiveCommStyles((prev) => { const n = new Set([...prev].filter((v) => commSet.has(v))); return n.size === prev.size ? prev : n })
    setActiveChannels((prev) => { const n = new Set([...prev].filter((v) => channelSet.has(v))); return n.size === prev.size ? prev : n })
    setActiveInfluenceLevels((prev) => { const n = new Set([...prev].filter((v) => influenceSet.has(v))); return n.size === prev.size ? prev : n })
    setActiveTrustLevels((prev) => { const n = new Set([...prev].filter((v) => trustSet.has(v))); return n.size === prev.size ? prev : n })
    setActiveFinCapacities((prev) => { const n = new Set([...prev].filter((v) => finSet.has(v))); return n.size === prev.size ? prev : n })
  }, [contacts.length, allTags, allRelTypes, allCountries, allImportSources, allCommStyles, allChannels, allInfluenceLevels, allTrustLevels, allFinCapacities])

  const filteredContacts = useMemo(
    () => contacts.filter((c) => {
      if (c.rating && !activeRatings.has(c.rating)) return false
      if (activeTags.size > 0 && !c.tags?.some((t) => activeTags.has(t))) return false
      if (activeRelTypes.size > 0 && (!c.relationshipType || !activeRelTypes.has(c.relationshipType))) return false
      if (activeCountries.size > 0 && (!c.country || !activeCountries.has(c.country))) return false
      if (activeImportSources.size > 0 && (!c.importSource || !activeImportSources.has(c.importSource))) return false
      if (activeCommStyles.size > 0 && (!c.communicationStyle || !activeCommStyles.has(c.communicationStyle))) return false
      if (activeChannels.size > 0 && (!c.preferredChannel || !activeChannels.has(c.preferredChannel))) return false
      if (activeInfluenceLevels.size > 0 && (c.influenceLevel == null || !activeInfluenceLevels.has(c.influenceLevel))) return false
      if (activeTrustLevels.size > 0 && (c.trustLevel == null || !activeTrustLevels.has(c.trustLevel))) return false
      if (activeFinCapacities.size > 0 && (!c.financialCapacity || !activeFinCapacities.has(c.financialCapacity))) return false
      return true
    }),
    [contacts, activeRatings, activeTags, activeRelTypes, activeCountries, activeImportSources, activeCommStyles, activeChannels, activeInfluenceLevels, activeTrustLevels, activeFinCapacities]
  )

  return {
    activeRatings, setActiveRatings,
    activeTags, setActiveTags,
    activeRelTypes, setActiveRelTypes,
    activeCountries, setActiveCountries,
    activeImportSources, setActiveImportSources,
    activeCommStyles, setActiveCommStyles,
    activeChannels, setActiveChannels,
    activeInfluenceLevels, setActiveInfluenceLevels,
    activeTrustLevels, setActiveTrustLevels,
    activeFinCapacities, setActiveFinCapacities,
    allTags, allRelTypes, allCountries, allImportSources,
    allCommStyles, allChannels, allInfluenceLevels, allTrustLevels, allFinCapacities,
    filteredContacts,
  }
}
