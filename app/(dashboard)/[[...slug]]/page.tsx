'use client'

import { useState, useEffect, useCallback, useMemo, useRef, use } from 'react'
import dynamic from 'next/dynamic'
import { toast } from 'sonner'
import DashboardPanel from '@/components/dashboard/DashboardPanel'
import ContactDetail from '@/components/globe/ContactDetail'
import GlobePanel from '@/components/globe/GlobePanel'
import GlobeControls from '@/components/globe/GlobeControls'
import GlobeFilters from '@/components/globe/GlobeFilters'
import ContactEditPanel from '@/components/globe/ContactEditPanel'
import ContactsBrowserPanel from '@/components/globe/ContactsBrowserPanel'
import SettingsPanel from '@/components/globe/SettingsPanel'
import ImportDialog from '@/components/import/ImportDialog'
import type { Contact, ContactConnection } from '@/lib/db/schema'
import type { ConnectedContact } from '@/components/globe/ContactDetail'
import CountryPopup from '@/components/globe/CountryPopup'
import { PANEL_WIDTH } from '@/lib/constants/ui'
import { displayDefaults } from '@/types/display'
import type { DisplayOptions } from '@/types/display'
import { useIsMobile } from '@/hooks/use-mobile'
import { fetchContacts, fetchConnections, fetchVisitedCountries } from '@/lib/api'

const GlobeCanvas = dynamic(() => import('@/components/globe/GlobeCanvas'), { ssr: false })

type ActivePanel = 'detail' | 'edit' | 'settings' | 'browser' | null

function slugToState(slug?: string[]): { panel: ActivePanel; contactId: string | null; isNew: boolean } {
  if (!slug || slug.length === 0) return { panel: null, contactId: null, isNew: false }
  if (slug[0] === 'settings') return { panel: 'settings', contactId: null, isNew: false }
  if (slug[0] === 'contacts') return { panel: 'browser', contactId: null, isNew: false }
  if (slug[0] === 'contact') {
    if (slug[1] === 'new') return { panel: 'edit', contactId: null, isNew: true }
    if (slug[2] === 'edit') return { panel: 'edit', contactId: slug[1], isNew: false }
    if (slug[1]) return { panel: 'detail', contactId: slug[1], isNew: false }
  }
  return { panel: null, contactId: null, isNew: false }
}

function stateToUrl(panel: ActivePanel, contactId?: string | null): string {
  switch (panel) {
    case 'detail': return contactId ? `/contact/${contactId}` : '/'
    case 'edit': return contactId ? `/contact/${contactId}/edit` : '/contact/new'
    case 'settings': return '/settings'
    case 'browser': return '/contacts'
    default: return '/'
  }
}

function pushUrl(url: string) {
  if (window.location.pathname !== url) {
    window.history.pushState(null, '', url)
  }
}

function pathnameToSlug(pathname: string): string[] {
  return pathname.split('/').filter(Boolean)
}

export default function GlobePage({ params }: { params: Promise<{ slug?: string[] }> }) {
  const { slug } = use(params)
  const initialState = useRef(slugToState(slug))
  const pendingContactId = useRef<string | null>(initialState.current.contactId)

  const [contacts, setContacts] = useState<Contact[]>([])
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)
  const [activePanel, setActivePanel] = useState<ActivePanel>(initialState.current.panel)
  const [editingContact, setEditingContact] = useState<Contact | null>(null)
  const [flyTarget, setFlyTarget] = useState<{ lat: number; lng: number; ts: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeRatings, setActiveRatings] = useState<Set<number>>(new Set([1, 2, 3, 4, 5]))
  const [activeTags, setActiveTags] = useState<Set<string>>(new Set())
  const [activeRelTypes, setActiveRelTypes] = useState<Set<string>>(new Set())
  const [activeCountries, setActiveCountries] = useState<Set<string>>(new Set())
  const [displayOptions, setDisplayOptions] = useState<DisplayOptions>(displayDefaults)
  const [countryPopup, setCountryPopup] = useState<{ country: string; contacts: Contact[]; x: number; y: number } | null>(null)
  const [countryPopupOpen, setCountryPopupOpen] = useState(false)
  const [visitedCountries, setVisitedCountries] = useState<Set<string>>(new Set())
  const [connections, setConnections] = useState<ContactConnection[]>([])
  const countryClosingTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isMobile = useIsMobile()
  const [mobileView, setMobileView] = useState<'globe' | 'dashboard'>('dashboard')
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const [dashboardExpanded, setDashboardExpanded] = useState(false)

  useEffect(() => {
    return () => {
      if (countryClosingTimer.current) clearTimeout(countryClosingTimer.current)
    }
  }, [])

  useEffect(() => {
    const onPopState = () => {
      const s = slugToState(pathnameToSlug(window.location.pathname))
      setActivePanel(s.panel)
      if (s.panel === null) {
        setSelectedContact(null)
        setEditingContact(null)
      } else if (s.panel === 'detail' && s.contactId) {
        setContacts((prev) => {
          const c = prev.find((x) => x.id === s.contactId)
          if (c) {
            setSelectedContact(c)
            if (c.lat != null && c.lng != null) {
              setFlyTarget({ lat: c.lat, lng: c.lng, ts: Date.now() })
            }
          }
          return prev
        })
      } else if (s.panel === 'edit' && s.contactId) {
        setContacts((prev) => {
          const c = prev.find((x) => x.id === s.contactId)
          if (c) setEditingContact(c)
          return prev
        })
      } else if (s.panel === 'edit' && s.isNew) {
        setEditingContact(null)
      }
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

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
    fetchContacts()
      .then((data) => {
        setContacts(data)
        setLoading(false)
        if (pendingContactId.current) {
          const c = data.find((x: Contact) => x.id === pendingContactId.current)
          if (c) {
            if (initialState.current.panel === 'detail') {
              setSelectedContact(c)
              if (c.lat != null && c.lng != null) {
                setFlyTarget({ lat: c.lat, lng: c.lng, ts: Date.now() })
              }
            } else if (initialState.current.panel === 'edit') {
              setEditingContact(c)
              setSelectedContact(c)
            }
          }
          pendingContactId.current = null
        }
      })
      .catch(() => {
        toast.error('Failed to load contacts')
        setLoading(false)
      })
  }, [])

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

  const handleContactClick = useCallback((contact: Contact) => {
    setSelectedContact(contact)
    setActivePanel('detail')
    pushUrl(stateToUrl('detail', contact.id))
    if (isMobile) setMobileView('globe')
    if (contact.lat != null && contact.lng != null) {
      setFlyTarget({ lat: contact.lat, lng: contact.lng, ts: Date.now() })
    }
  }, [isMobile])

  const handleCloseDetail = useCallback(() => {
    setActivePanel(null)
    pushUrl('/')
  }, [])

  const handleEditContact = useCallback((contact: Contact) => {
    setEditingContact(contact)
    setActivePanel('edit')
    pushUrl(stateToUrl('edit', contact.id))
  }, [])

  const handleAddContact = useCallback(() => {
    setEditingContact(null)
    setActivePanel('edit')
    pushUrl('/contact/new')
    if (isMobile) setMobileView('globe')
  }, [isMobile])

  const handleCancelEdit = useCallback(() => {
    setActivePanel(null)
    setEditingContact(null)
    pushUrl('/')
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
    setActivePanel('detail')
    setEditingContact(null)
    pushUrl(stateToUrl('detail', saved.id))
  }, [])

  const handleDeleteContact = useCallback((contactId: string) => {
    setContacts((prev) => prev.filter((c) => c.id !== contactId))
    setConnections((prev) => prev.filter((c) => c.sourceContactId !== contactId && c.targetContactId !== contactId))
    setSelectedContact(null)
    setActivePanel(null)
    pushUrl('/')
  }, [])

  const connectedContacts: ConnectedContact[] = useMemo(() => {
    if (!selectedContact) return []
    const result: ConnectedContact[] = []
    const contactMap = new Map(contacts.map((c) => [c.id, c]))

    for (const conn of connections) {
      let otherId: string | null = null
      if (conn.sourceContactId === selectedContact.id) otherId = conn.targetContactId
      else if (conn.targetContactId === selectedContact.id) otherId = conn.sourceContactId
      if (!otherId) continue
      const other = contactMap.get(otherId)
      if (other && !result.some((r) => r.id === other.id)) {
        result.push({ id: other.id, name: other.name, lat: other.lat, lng: other.lng })
      }
    }

    if (result.length === 0 && selectedContact.tags?.length) {
      for (const c of contacts) {
        if (c.id === selectedContact.id) continue
        if (c.tags?.some((t) => selectedContact.tags?.includes(t))) {
          result.push({ id: c.id, name: c.name, lat: c.lat, lng: c.lng })
        }
      }
    }

    return result
  }, [contacts, connections, selectedContact])

  const handleConnectedContactClick = useCallback((cc: ConnectedContact) => {
    const c = contacts.find((x) => x.id === cc.id)
    if (c) {
      setSelectedContact(c)
      setActivePanel('detail')
      pushUrl(stateToUrl('detail', c.id))
      if (c.lat != null && c.lng != null) {
        setFlyTarget({ lat: c.lat, lng: c.lng, ts: Date.now() })
      }
    }
  }, [contacts])

  const handleOpenSettings = useCallback(() => {
    setActivePanel('settings')
    pushUrl('/settings')
  }, [])

  const handleCloseSettings = useCallback(() => {
    setActivePanel(null)
    pushUrl('/')
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
    setActivePanel('browser')
    pushUrl('/contacts')
    if (isMobile) setMobileView('globe')
  }, [isMobile])

  const handleCloseBrowser = useCallback(() => {
    setActivePanel(null)
    pushUrl('/')
  }, [])

  const handleBrowserSelectContact = useCallback((contact: Contact) => {
    setSelectedContact(contact)
    setActivePanel('detail')
    pushUrl(stateToUrl('detail', contact.id))
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
    setActivePanel('detail')
    pushUrl(stateToUrl('detail', contact.id))
    if (contact.lat != null && contact.lng != null) {
      setFlyTarget({ lat: contact.lat, lng: contact.lng, ts: Date.now() })
    }
  }, [closeCountryPopup])

  const handleAddContactToCountry = useCallback(() => {
    closeCountryPopup()
    setEditingContact(null)
    setActivePanel('edit')
    pushUrl('/contact/new')
  }, [closeCountryPopup])

  const openDashboard = useCallback(() => setDashboardExpanded(true), [])
  const closeDashboard = useCallback(() => setDashboardExpanded(false), [])

  const handleDashContactClick = useCallback((c: Contact) => {
    handleContactClick(c)
    setDashboardExpanded(false)
  }, [handleContactClick])

  const handleDashAddContact = useCallback(() => {
    handleAddContact()
    setDashboardExpanded(false)
  }, [handleAddContact])

  const showDashboard = !isMobile || mobileView === 'dashboard'
  const showGlobe = !isMobile || mobileView === 'globe'

  const globeSection = (
    <>
      <GlobeCanvas
        contacts={filteredContacts}
        selectedContact={selectedContact}
        flyTarget={flyTarget}
        onContactClick={handleContactClick}
        onCountryClick={handleCountryClick}
        display={displayOptions}
        visitedCountries={visitedCountries}
        connections={connections}
      />

      <ContactDetail
        contact={selectedContact}
        open={activePanel === 'detail'}
        onClose={handleCloseDetail}
        onEdit={handleEditContact}
        onDelete={handleDeleteContact}
        connectedContacts={connectedContacts}
        onConnectedContactClick={handleConnectedContactClick}
        allContacts={contacts}
      />

      <ContactEditPanel
        contact={editingContact}
        open={activePanel === 'edit'}
        onSaved={handleContactSaved}
        onCancel={handleCancelEdit}
      />

      <SettingsPanel
        open={activePanel === 'settings'}
        onClose={handleCloseSettings}
        displayOptions={displayOptions}
        onDisplayChange={setDisplayOptions}
        visitedCountries={visitedCountries}
        onToggleVisitedCountry={handleCountryVisitToggle}
        onOpenImport={() => setImportDialogOpen(true)}
      />

      <ImportDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        existingContacts={contacts}
        onImportComplete={() => {
          fetchContacts().then(setContacts)
          setImportDialogOpen(false)
        }}
      />

      <ContactsBrowserPanel
        open={activePanel === 'browser'}
        onClose={handleCloseBrowser}
        contacts={contacts}
        onSelectContact={handleBrowserSelectContact}
      />

      <GlobeControls
        onAddContact={handleAddContact}
        onSettings={handleOpenSettings}
        isMobile={isMobile}
        onSwitchToDashboard={() => setMobileView('dashboard')}
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
    </>
  )

  if (isMobile) {
    return (
      <div className="fixed inset-0 overflow-hidden bg-background">
        <div
          className="absolute inset-0 transition-[opacity,transform] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]"
          style={{
            opacity: showDashboard ? 1 : 0,
            pointerEvents: showDashboard ? 'auto' : 'none',
            transform: showDashboard ? 'translateX(0)' : 'translateX(-8%)',
          }}
        >
          <DashboardPanel
            contacts={contacts}
            selectedContact={selectedContact}
            onContactClick={handleContactClick}
            onAddContact={handleAddContact}
            onOpenContactsBrowser={handleOpenContactsBrowser}
            isMobile={isMobile}
            onSwitchToGlobe={() => setMobileView('globe')}
            contactsLoading={loading}
          />
        </div>
        <div
          className="absolute inset-0 transition-[opacity,transform] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]"
          style={{
            opacity: showGlobe ? 1 : 0,
            pointerEvents: showGlobe ? 'auto' : 'none',
            transform: showGlobe ? 'translateX(0)' : 'translateX(8%)',
          }}
        >
          <div className="relative w-full h-full overflow-hidden globe-bg">
            {globeSection}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 flex overflow-hidden bg-background">
      <div
        className="shrink-0 h-full"
        style={{ width: PANEL_WIDTH.dashboard.collapsed }}
      >
        <DashboardPanel
          contacts={contacts}
          selectedContact={selectedContact}
          onContactClick={handleContactClick}
          onAddContact={handleAddContact}
          onOpenContactsBrowser={handleOpenContactsBrowser}
          isMobile={isMobile}
          collapsed
          onToggleCollapse={openDashboard}
        />
      </div>
      <div className="relative flex-1 overflow-hidden globe-bg">
        {globeSection}
      </div>
      <GlobePanel
        open={dashboardExpanded}
        side="left"
        width={PANEL_WIDTH.dashboard.min}
        glass="panel"
        onClose={closeDashboard}
      >
        <DashboardPanel
          contacts={contacts}
          selectedContact={selectedContact}
          onContactClick={handleDashContactClick}
          onAddContact={handleDashAddContact}
          onOpenContactsBrowser={handleOpenContactsBrowser}
          isMobile={isMobile}
          collapsed={false}
          onToggleCollapse={closeDashboard}
        />
      </GlobePanel>
    </div>
  )
}
