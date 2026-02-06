'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import dynamic from 'next/dynamic'
import { toast } from 'sonner'
import DashboardPanel from '@/components/dashboard/DashboardPanel'
import ContactDetail from '@/components/globe/ContactDetail'
import GlobeControls from '@/components/globe/GlobeControls'
import GlobeFilters from '@/components/globe/GlobeFilters'
import ContactEditPanel from '@/components/globe/ContactEditPanel'
import ContactsBrowserPanel from '@/components/globe/ContactsBrowserPanel'
import SettingsPanel from '@/components/globe/SettingsPanel'
import { Skeleton } from '@/components/ui/skeleton'
import type { Contact } from '@/lib/db/schema'
import type { ConnectedContact } from '@/components/globe/ContactDetail'
import CountryPopup from '@/components/globe/CountryPopup'
import { displayDefaults } from '@/types/display'
import type { DisplayOptions } from '@/types/display'

const GlobeCanvas = dynamic(() => import('@/components/globe/GlobeCanvas'), { ssr: false })

export default function GlobePage() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)
  const [showDetail, setShowDetail] = useState(false)
  const [editingContact, setEditingContact] = useState<Contact | null>(null)
  const [showEdit, setShowEdit] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [flyTarget, setFlyTarget] = useState<{ lat: number; lng: number; ts: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeRatings, setActiveRatings] = useState<Set<number>>(new Set([1, 2, 3, 4, 5]))
  const [activeTags, setActiveTags] = useState<Set<string>>(new Set())
  const [activeRelTypes, setActiveRelTypes] = useState<Set<string>>(new Set())
  const [activeCountries, setActiveCountries] = useState<Set<string>>(new Set())
  const [displayOptions, setDisplayOptions] = useState<DisplayOptions>(displayDefaults)
  const [countryPopup, setCountryPopup] = useState<{ country: string; contacts: Contact[]; x: number; y: number } | null>(null)
  const [countryPopupOpen, setCountryPopupOpen] = useState(false)
  const [showContactsBrowser, setShowContactsBrowser] = useState(false)
  const [visitedCountries, setVisitedCountries] = useState<Set<string>>(new Set())
  const countryClosingTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const allTags = useMemo(() => {
    const s = new Set<string>()
    contacts.forEach((c) => c.tags?.forEach((t) => s.add(t)))
    return Array.from(s).sort()
  }, [contacts])

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

  useEffect(() => {
    fetch('/api/contacts')
      .then((res) => res.json())
      .then((data) => {
        setContacts(data)
        setLoading(false)
      })
      .catch(() => {
        toast.error('Failed to load contacts')
        setLoading(false)
      })
  }, [])

  useEffect(() => {
    fetch('/api/visited-countries')
      .then((res) => res.json())
      .then((data: string[]) => {
        if (Array.isArray(data)) setVisitedCountries(new Set(data))
      })
      .catch(() => {})
  }, [])

  const handleContactClick = useCallback((contact: Contact) => {
    setSelectedContact(contact)
    setShowDetail(true)
    setShowEdit(false)
    setShowSettings(false)
    if (contact.lat != null && contact.lng != null) {
      setFlyTarget({ lat: contact.lat, lng: contact.lng, ts: Date.now() })
    }
  }, [])

  const handleCloseDetail = useCallback(() => {
    setShowDetail(false)
  }, [])

  const handleEditContact = useCallback((contact: Contact) => {
    setEditingContact(contact)
    setShowEdit(true)
  }, [])

  const handleAddContact = useCallback(() => {
    setEditingContact(null)
    setShowDetail(false)
    setShowEdit(true)
  }, [])

  const handleCancelEdit = useCallback(() => {
    setShowEdit(false)
    setEditingContact(null)
  }, [])

  const handleContactSaved = useCallback((saved: Contact) => {
    setContacts((prev) => {
      const idx = prev.findIndex((c) => c.id === saved.id)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = saved
        return next
      }
      return [saved, ...prev]
    })
    setSelectedContact(saved)
    setShowEdit(false)
    setShowDetail(true)
    setEditingContact(null)
  }, [])

  const connectedContacts: ConnectedContact[] = useMemo(() => {
    if (!selectedContact?.tags?.length) return []
    const result: ConnectedContact[] = []
    for (const c of contacts) {
      if (c.id === selectedContact.id) continue
      const shared = c.tags?.some((t) => selectedContact.tags?.includes(t))
      if (!shared) continue
      result.push({ id: c.id, name: c.name, lat: c.lat, lng: c.lng })
    }
    return result
  }, [contacts, selectedContact])

  const handleConnectedContactClick = useCallback((cc: ConnectedContact) => {
    const c = contacts.find((x) => x.id === cc.id)
    if (c) {
      setSelectedContact(c)
      setShowDetail(true)
      setShowEdit(false)
      if (c.lat != null && c.lng != null) {
        setFlyTarget({ lat: c.lat, lng: c.lng, ts: Date.now() })
      }
    }
  }, [contacts])

  const handleOpenSettings = useCallback(() => {
    setShowSettings(true)
    setShowDetail(false)
    setShowEdit(false)
  }, [])

  const handleCloseSettings = useCallback(() => {
    setShowSettings(false)
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

  const handleOpenContactsBrowser = useCallback(() => {
    setShowContactsBrowser(true)
    setShowDetail(false)
    setShowEdit(false)
    setShowSettings(false)
  }, [])

  const handleBrowserSelectContact = useCallback((contact: Contact) => {
    setShowContactsBrowser(false)
    setSelectedContact(contact)
    setShowDetail(true)
    setShowEdit(false)
    setShowSettings(false)
    if (contact.lat != null && contact.lng != null) {
      setFlyTarget({ lat: contact.lat, lng: contact.lng, ts: Date.now() })
    }
  }, [])

  const handleCountryClick = useCallback((country: string, event: { x: number; y: number }) => {
    if (countryClosingTimer.current) clearTimeout(countryClosingTimer.current)
    const matched = filteredContacts.filter((c) => c.country === country)
    setCountryPopup({ country, contacts: matched, x: event.x, y: event.y })
    requestAnimationFrame(() => setCountryPopupOpen(true))
  }, [filteredContacts])

  const closeCountryPopup = useCallback(() => {
    setCountryPopupOpen(false)
    countryClosingTimer.current = setTimeout(() => setCountryPopup(null), 150)
  }, [])

  const handleCountryPopupSelect = useCallback((contact: Contact) => {
    closeCountryPopup()
    setSelectedContact(contact)
    setShowDetail(true)
    setShowEdit(false)
    setShowSettings(false)
    if (contact.lat != null && contact.lng != null) {
      setFlyTarget({ lat: contact.lat, lng: contact.lng, ts: Date.now() })
    }
  }, [closeCountryPopup])

  const handleAddContactToCountry = useCallback(() => {
    closeCountryPopup()
    setEditingContact(null)
    setShowDetail(false)
    setShowEdit(true)
  }, [closeCountryPopup])

  if (loading) {
    return (
      <div className="flex h-screen overflow-hidden bg-background">
        <div className="w-[55%] min-w-[480px] max-w-[720px] p-5 space-y-6 border-r border-border">
          <Skeleton className="h-8 w-48 bg-muted" />
          <div className="grid grid-cols-2 gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-16 bg-muted rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-40 bg-muted rounded-xl" />
        </div>
        <div className="flex-1 globe-bg" />
      </div>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <DashboardPanel
        contacts={contacts}
        selectedContact={selectedContact}
        onContactClick={handleContactClick}
        onAddContact={handleAddContact}
        onOpenContactsBrowser={handleOpenContactsBrowser}
      />

      <div className="relative flex-1 overflow-hidden globe-bg">
        <GlobeCanvas
          contacts={filteredContacts}
          selectedContact={selectedContact}
          flyTarget={flyTarget}
          onContactClick={handleContactClick}
          onCountryClick={handleCountryClick}
          display={displayOptions}
          visitedCountries={visitedCountries}
        />

        <ContactDetail
          contact={selectedContact}
          open={showDetail && !showEdit}
          onClose={handleCloseDetail}
          onEdit={handleEditContact}
          connectedContacts={connectedContacts}
          onConnectedContactClick={handleConnectedContactClick}
        />

        <ContactEditPanel
          contact={editingContact}
          open={showEdit}
          onSaved={handleContactSaved}
          onCancel={handleCancelEdit}
        />

        <SettingsPanel
          open={showSettings}
          onClose={handleCloseSettings}
          displayOptions={displayOptions}
          onDisplayChange={setDisplayOptions}
          visitedCountries={visitedCountries}
          onToggleVisitedCountry={handleCountryVisitToggle}
        />

        <ContactsBrowserPanel
          open={showContactsBrowser}
          onClose={() => setShowContactsBrowser(false)}
          contacts={contacts}
          onSelectContact={handleBrowserSelectContact}
        />

        <GlobeControls
          onAddContact={handleAddContact}
          onSettings={handleOpenSettings}
        />

        <GlobeFilters
          ratings={activeRatings}
          onRatingsChange={setActiveRatings}
          tags={allTags}
          activeTags={activeTags}
          onTagsChange={setActiveTags}
          relationshipTypes={allRelTypes}
          activeRelTypes={activeRelTypes}
          onRelTypesChange={setActiveRelTypes}
          countries={allCountries}
          activeCountries={activeCountries}
          onCountriesChange={setActiveCountries}
        />

        {countryPopup && (
          <CountryPopup
            country={countryPopup.country}
            contacts={countryPopup.contacts}
            x={countryPopup.x}
            y={countryPopup.y}
            open={countryPopupOpen}
            onSelect={handleCountryPopupSelect}
            onClose={closeCountryPopup}
            visited={visitedCountries.has(countryPopup.country)}
            onToggleVisited={() => handleCountryVisitToggle(countryPopup.country)}
            onAddContact={handleAddContactToCountry}
          />
        )}
      </div>
    </div>
  )
}
