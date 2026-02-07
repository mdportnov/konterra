'use client'

import { useState, useMemo } from 'react'
import type { Contact, Tag } from '@/lib/db/schema'

export function useContactFilters(contacts: Contact[], userTags: Tag[]) {
  const [activeRatings, setActiveRatings] = useState<Set<number>>(new Set([1, 2, 3, 4, 5]))
  const [activeTags, setActiveTags] = useState<Set<string>>(new Set())
  const [activeRelTypes, setActiveRelTypes] = useState<Set<string>>(new Set())
  const [activeCountries, setActiveCountries] = useState<Set<string>>(new Set())

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

  const filteredContacts = useMemo(
    () => contacts.filter((c) => {
      if (c.rating && !activeRatings.has(c.rating)) return false
      if (activeTags.size > 0 && !c.tags?.some((t) => activeTags.has(t))) return false
      if (activeRelTypes.size > 0 && (!c.relationshipType || !activeRelTypes.has(c.relationshipType))) return false
      if (activeCountries.size > 0 && (!c.country || !activeCountries.has(c.country))) return false
      return true
    }),
    [contacts, activeRatings, activeTags, activeRelTypes, activeCountries]
  )

  return {
    activeRatings, setActiveRatings,
    activeTags, setActiveTags,
    activeRelTypes, setActiveRelTypes,
    activeCountries, setActiveCountries,
    allTags, allRelTypes, allCountries,
    filteredContacts,
  }
}
