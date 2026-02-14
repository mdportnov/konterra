'use client'

import { useState, useEffect, useCallback, useMemo, useRef, use } from 'react'
import dynamic from 'next/dynamic'
import DashboardPanel from '@/components/dashboard/DashboardPanel'
import GlobePanel from '@/components/globe/GlobePanel'
import GlobeControls from '@/components/globe/GlobeControls'
import GlobeFilters from '@/components/globe/GlobeFilters'
import ContactEditPanel from '@/components/globe/ContactEditPanel'
import SettingsPanel from '@/components/globe/SettingsPanel'
import ImportDialog from '@/components/import/ImportDialog'
import TripImportDialog from '@/components/import/TripImportDialog'
import WelcomeWizard from '@/components/onboarding/WelcomeWizard'
import DuplicatesDialog from '@/components/dedup/DuplicatesDialog'
import ExportDialog from '@/components/export/ExportDialog'
import ConnectionInsightsPanel from '@/components/insights/ConnectionInsightsPanel'
import CountryPopup from '@/components/globe/CountryPopup'
import TripPopup from '@/components/globe/TripPopup'
import TripCountryPopup from '@/components/globe/TripCountryPopup'
import { PANEL_WIDTH, GLASS, Z, TRANSITION } from '@/lib/constants/ui'
import { displayDefaults } from '@/types/display'
import GlobeViewToggle from '@/components/globe/GlobeViewToggle'
import type { DisplayOptions } from '@/types/display'
import type { GlobeViewMode } from '@/types/display'
import type { Contact, ContactCountryConnection, Trip } from '@/lib/db/schema'
import { useIsMobile } from '@/hooks/use-mobile'
import { useGlobeData } from '@/hooks/use-globe-data'
import { useContactFilters } from '@/hooks/use-contact-filters'
import { usePanelNavigation } from '@/hooks/use-panel-navigation'
import { ChevronRight } from 'lucide-react'
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip'
import { useHotkey } from '@/hooks/use-hotkey'

const GlobeCanvas = dynamic(() => import('@/components/globe/GlobeCanvas'), { ssr: false })

export default function GlobePage({ params }: { params: Promise<{ slug?: string[] }> }) {
  const { slug } = use(params)
  const isMobile = useIsMobile()
  const [mobileView, setMobileView] = useState<'globe' | 'dashboard'>('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const [dupDialogOpen, setDupDialogOpen] = useState(false)
  const [exportDialogOpen, setExportDialogOpen] = useState(false)
  const [tripImportDialogOpen, setTripImportDialogOpen] = useState(false)
  const [displayOptions, setDisplayOptions] = useState<DisplayOptions>(displayDefaults)
  const [countryPopup, setCountryPopup] = useState<{ country: string; contacts: Contact[]; x: number; y: number } | null>(null)
  const [countryPopupOpen, setCountryPopupOpen] = useState(false)
  const countryClosingTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [highlightedContactIds, setHighlightedContactIds] = useState<Set<string>>(new Set())
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null)
  const [tripCountryPopup, setTripCountryPopup] = useState<{ country: string; x: number; y: number } | null>(null)
  const [tripCountryPopupOpen, setTripCountryPopupOpen] = useState(false)
  const tripCountryClosingTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const initialTab = slug?.[0] === 'travel' ? 'travel' as const : 'connections' as const
  const [dashboardTab, setDashboardTabRaw] = useState<'connections' | 'travel'>(initialTab)

  const setDashboardTab = useCallback((tab: 'connections' | 'travel') => {
    setDashboardTabRaw(tab)
    setDisplayOptions((prev) => ({
      ...prev,
      globeViewMode: tab === 'travel' ? 'travel' : 'network',
    }))
    const url = tab === 'travel' ? '/travel' : '/'
    if (window.location.pathname !== url) {
      window.history.pushState(null, '', url)
    }
  }, [])

  useEffect(() => {
    if (initialTab === 'travel') {
      setDisplayOptions((prev) => ({ ...prev, globeViewMode: 'travel' }))
    }
  }, [])

  useEffect(() => {
    const onPop = () => {
      const path = window.location.pathname
      if (path === '/travel') {
        setDashboardTabRaw('travel')
        setDisplayOptions((prev) => ({ ...prev, globeViewMode: 'travel' }))
      } else if (path === '/' || path === '') {
        setDashboardTabRaw('connections')
        setDisplayOptions((prev) => ({ ...prev, globeViewMode: 'network' }))
      }
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  const data = useGlobeData()
  const filters = useContactFilters(data.contacts, data.userTags)
  const nav = usePanelNavigation(slug, data.contacts, data.connections, isMobile, setMobileView)

  useEffect(() => {
    if (!data.loading) nav.resolveInitialContact(data.contacts)
  }, [data.loading, data.contacts, nav.resolveInitialContact])

  useEffect(() => {
    return () => {
      if (countryClosingTimer.current) clearTimeout(countryClosingTimer.current)
      if (tripCountryClosingTimer.current) clearTimeout(tripCountryClosingTimer.current)
    }
  }, [])

  const handleSelectionChange = useCallback((ids: Set<string>) => {
    setHighlightedContactIds(ids)
  }, [])

  const handleBulkDelete = useCallback((ids: string[]) => {
    if (ids.length > 0) {
      data.setContacts((prev) => prev.filter((c) => !ids.includes(c.id)))
      data.setConnections((prev) => prev.filter((c) => !ids.includes(c.sourceContactId) && !ids.includes(c.targetContactId)))
      data.setCountryConnections((prev) => prev.filter((c) => !ids.includes(c.contactId)))
    } else {
      data.reloadContacts()
    }
    setHighlightedContactIds(new Set())
  }, [data.setContacts, data.setConnections, data.setCountryConnections, data.reloadContacts])

  const handleContactSaved = useCallback((saved: Contact) => {
    nav.handleContactSaved(saved, data.setContacts)
  }, [nav.handleContactSaved, data.setContacts])

  const handleDeleteContact = useCallback((contactId: string) => {
    nav.handleDeleteContact(contactId, data.setContacts, data.setConnections, data.setCountryConnections)
  }, [nav.handleDeleteContact, data.setContacts, data.setConnections, data.setCountryConnections])

  const handleCountryClick = useCallback((country: string, event: { x: number; y: number }) => {
    if (displayOptions.globeViewMode === 'travel') {
      if (tripCountryClosingTimer.current) clearTimeout(tripCountryClosingTimer.current)
      const hasTrips = data.trips.some((t) => t.country === country)
      if (!hasTrips) return
      setTripCountryPopup({ country, x: event.x, y: event.y })
      requestAnimationFrame(() => setTripCountryPopupOpen(true))
      return
    }
    if (countryClosingTimer.current) clearTimeout(countryClosingTimer.current)
    const matched = filters.filteredContacts.filter((c) => c.country === country)
    setCountryPopup({ country, contacts: matched, x: event.x, y: event.y })
    requestAnimationFrame(() => setCountryPopupOpen(true))
  }, [filters.filteredContacts, displayOptions.globeViewMode, data.trips])

  const indirectPopupContacts = useMemo(() => {
    if (!countryPopup) return []
    const directIds = new Set(countryPopup.contacts.map((c) => c.id))
    const indirectContactIds = data.countryConnections
      .filter((cc) => cc.country === countryPopup.country)
      .map((cc) => cc.contactId)
      .filter((id) => !directIds.has(id))
    const contactMap = new Map(data.contacts.map((c) => [c.id, c]))
    return [...new Set(indirectContactIds)].map((id) => contactMap.get(id)).filter(Boolean) as Contact[]
  }, [countryPopup, data.countryConnections, data.contacts])

  const tripCountryTrips = useMemo(() => {
    if (!tripCountryPopup) return []
    return data.trips.filter((t) => t.country === tripCountryPopup.country)
  }, [tripCountryPopup, data.trips])

  const closeTripCountryPopup = useCallback(() => {
    setTripCountryPopupOpen(false)
    tripCountryClosingTimer.current = setTimeout(() => setTripCountryPopup(null), 150)
  }, [])

  const handleTripCountryTripClick = useCallback((trip: Trip) => {
    closeTripCountryPopup()
    if (trip.lat != null && trip.lng != null) {
      setSelectedTripId(trip.id)
      nav.setFlyTarget({ lat: trip.lat, lng: trip.lng, ts: Date.now() })
    }
  }, [closeTripCountryPopup, nav.setFlyTarget])

  const closeCountryPopup = useCallback(() => {
    setCountryPopupOpen(false)
    countryClosingTimer.current = setTimeout(() => setCountryPopup(null), 150)
  }, [])

  const handleCountryPopupSelect = useCallback((contact: Contact) => {
    closeCountryPopup()
    nav.handleContactClick(contact)
  }, [closeCountryPopup, nav.handleContactClick])

  const handleAddContactToCountry = useCallback(() => {
    const country = countryPopup?.country
    closeCountryPopup()
    nav.handleAddContact(country ? { country } : undefined)
  }, [closeCountryPopup, nav.handleAddContact, countryPopup?.country])

  const contactCountsByCountry = useMemo(() => {
    const map = new Map<string, number>()
    for (const c of data.contacts) {
      if (c.country) map.set(c.country, (map.get(c.country) || 0) + 1)
    }
    for (const cc of data.countryConnections) {
      map.set(cc.country, (map.get(cc.country) || 0) + 1)
    }
    return map
  }, [data.contacts, data.countryConnections])

  const handleTripClick = useCallback((trip: Trip) => {
    if (trip.lat != null && trip.lng != null) {
      nav.setFlyTarget({ lat: trip.lat, lng: trip.lng, ts: Date.now() })
    }
  }, [nav.setFlyTarget])

  const handleTripPointClick = useCallback((tripId: string) => {
    setSelectedTripId(tripId)
    const trip = data.trips.find((t) => t.id === tripId)
    if (trip?.lat != null && trip?.lng != null) {
      nav.setFlyTarget({ lat: trip.lat, lng: trip.lng, ts: Date.now() })
    }
  }, [data.trips, nav.setFlyTarget])

  const selectedTrip = useMemo(() => data.trips.find((t) => t.id === selectedTripId) ?? null, [data.trips, selectedTripId])

  const sortedTrips = useMemo(() =>
    [...data.trips].sort((a, b) => new Date(a.arrivalDate).getTime() - new Date(b.arrivalDate).getTime()),
    [data.trips]
  )

  const selectedTripIndex = useMemo(() => {
    if (!selectedTripId) return -1
    return sortedTrips.findIndex((t) => t.id === selectedTripId)
  }, [sortedTrips, selectedTripId])

  const handleTripNavigate = useCallback((trip: Trip) => {
    setSelectedTripId(trip.id)
    if (trip.lat != null && trip.lng != null) {
      nav.setFlyTarget({ lat: trip.lat, lng: trip.lng, ts: Date.now() })
    }
  }, [nav.setFlyTarget])

  const handleViewModeChange = useCallback((mode: GlobeViewMode) => {
    setDisplayOptions((prev) => ({ ...prev, globeViewMode: mode }))
  }, [])

  const addContactCb = useCallback(() => nav.handleAddContact(), [nav.handleAddContact])
  const openInsightsCb = useCallback(() => nav.handleOpenInsights(), [nav.handleOpenInsights])
  useHotkey('n', addContactCb, { meta: true })
  useHotkey('i', openInsightsCb, { meta: true })

  const showDashboard = !isMobile || mobileView === 'dashboard'
  const showGlobe = !isMobile || mobileView === 'globe'

  const dashboardProps = {
    contacts: data.contacts,
    connections: data.connections,
    selectedContact: nav.selectedContact,
    sidebarView: nav.sidebarView,
    onContactClick: nav.handleContactClick,
    onBackToList: nav.handleBackToList,
    onAddContact: nav.handleAddContact,
    onEditContact: nav.handleEditContact,
    onDeleteContact: handleDeleteContact,
    onReloadContacts: data.reloadContacts,
    connectedContacts: nav.connectedContacts,
    onConnectedContactClick: nav.handleConnectedContactClick,
    allContacts: data.contacts,
    onCountryConnectionsChange: data.handleCountryConnectionsChange,
    onOpenInsights: nav.handleOpenInsights,
    onOpenSettings: nav.handleOpenSettings,
    isMobile,
    contactsLoading: data.loading,
    onSelectionChange: handleSelectionChange,
    onBulkDelete: handleBulkDelete,
    trips: data.trips,
    tripsLoading: data.tripsLoading,
    onImportTrips: () => setTripImportDialogOpen(true),
    onTripClick: handleTripClick,
    dashboardTab,
    onDashboardTabChange: setDashboardTab,
  } as const

  const globeSection = (
    <>
      <GlobeCanvas
        contacts={filters.filteredContacts}
        selectedContact={nav.selectedContact}
        flyTarget={nav.flyTarget}
        onContactClick={nav.handleContactClick}
        onCountryClick={handleCountryClick}
        onTripPointClick={handleTripPointClick}
        display={displayOptions}
        visitedCountries={data.visitedCountries}
        connections={data.connections}
        countryConnections={data.countryConnections}
        highlightedContactIds={highlightedContactIds}
        trips={data.trips}
      />

      {!data.loading && data.contacts.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ zIndex: Z.controls }}>
          <div className={`${GLASS.panel} rounded-2xl p-6 text-center pointer-events-auto max-w-xs`}>
            <p className="text-sm font-medium text-foreground mb-1">No contacts yet</p>
            <p className="text-xs text-muted-foreground mb-4">Add your first contact or import from a file.</p>
            <div className="flex gap-2 justify-center">
              <button onClick={() => nav.handleAddContact()} className="px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors">Create contact</button>
              <button onClick={() => setImportDialogOpen(true)} className="px-3 py-1.5 rounded-md bg-accent text-foreground text-xs font-medium hover:bg-accent/80 transition-colors">Import</button>
            </div>
          </div>
        </div>
      )}

      {!data.loading && data.contacts.length === 0 && (
        <WelcomeWizard
          onAddContact={nav.handleAddContact}
          onOpenImport={() => setImportDialogOpen(true)}
          onComplete={data.reloadContacts}
        />
      )}

      <ContactEditPanel
        contact={nav.editingContact}
        open={nav.activePanel === 'edit'}
        onSaved={handleContactSaved}
        onCancel={nav.handleCancelEdit}
        availableTags={data.userTags}
        onTagCreated={data.handleTagCreated}
        prefill={nav.editPrefill}
      />

      <SettingsPanel
        open={nav.activePanel === 'settings'}
        onClose={nav.handleCloseSettings}
        displayOptions={displayOptions}
        onDisplayChange={setDisplayOptions}
        visitedCountries={data.visitedCountries}
        onToggleVisitedCountry={data.handleCountryVisitToggle}
        onOpenImport={() => setImportDialogOpen(true)}
        onOpenExport={() => setExportDialogOpen(true)}
        onOpenDuplicates={() => setDupDialogOpen(true)}
        onDeleteAllContacts={data.reloadContacts}
        contactCount={data.contacts.length}
        connectionCount={data.connections.length}
        visitedCountryCount={data.visitedCountries.size}
        contactCountsByCountry={contactCountsByCountry}
      />

      <ImportDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        existingContacts={data.contacts}
        onImportComplete={() => {
          Promise.all([data.reloadContacts(), data.reloadConnections()]).then(() => data.runBatchGeocode())
          setImportDialogOpen(false)
        }}
      />

      <DuplicatesDialog
        open={dupDialogOpen}
        onOpenChange={setDupDialogOpen}
        contacts={data.contacts}
        onResolved={data.reloadContacts}
      />

      <ExportDialog
        open={exportDialogOpen}
        onOpenChange={setExportDialogOpen}
      />

      <GlobePanel
        open={nav.activePanel === 'insights'}
        side="right"
        width={PANEL_WIDTH.dashboard.min}
        glass="panel"
        onClose={nav.handleCloseInsights}
      >
        <ConnectionInsightsPanel
          contacts={data.contacts}
          connections={data.connections}
          interactions={data.allInteractions}
          favors={data.allFavors}
          onContactClick={nav.handleContactClick}
          loading={data.loading}
        />
      </GlobePanel>

      <GlobeControls
        onAddContact={nav.handleAddContact}
        onImport={() => setImportDialogOpen(true)}
        onSettings={nav.handleOpenSettings}
        onInsights={nav.handleOpenInsights}
        isMobile={isMobile}
        onSwitchToDashboard={() => setMobileView('dashboard')}
      />

      <div className="absolute top-4 right-4 flex items-center gap-2" style={{ zIndex: Z.controls }}>
        <GlobeViewToggle value={displayOptions.globeViewMode} onChange={handleViewModeChange} />
      </div>

      <TripImportDialog
        open={tripImportDialogOpen}
        onOpenChange={setTripImportDialogOpen}
        onImportComplete={() => { data.reloadTrips(); data.reloadVisitedCountries() }}
      />

      <GlobeFilters
        ratings={filters.activeRatings}
        onRatingsChange={filters.setActiveRatings}
        tags={filters.allTags}
        activeTags={filters.activeTags}
        onTagsChange={filters.setActiveTags}
        relationshipTypes={filters.allRelTypes}
        activeRelTypes={filters.activeRelTypes}
        onRelTypesChange={filters.setActiveRelTypes}
        countries={filters.allCountries}
        activeCountries={filters.activeCountries}
        onCountriesChange={filters.setActiveCountries}
        userTags={data.userTags}
        onTagCreated={data.handleTagCreated}
        onTagDeleted={data.handleTagDeleted}
      />

      <TripPopup
        trip={selectedTrip}
        prevTrip={selectedTripIndex > 0 ? sortedTrips[selectedTripIndex - 1] : null}
        nextTrip={selectedTripIndex < sortedTrips.length - 1 ? sortedTrips[selectedTripIndex + 1] : null}
        onNavigate={handleTripNavigate}
        onClose={() => setSelectedTripId(null)}
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
          visited={data.visitedCountries.has(countryPopup.country)}
          onToggleVisited={() => data.handleCountryVisitToggle(countryPopup.country)}
          onAddContact={handleAddContactToCountry}
          indirectContacts={indirectPopupContacts}
        />
      )}

      {tripCountryPopup && (
        <TripCountryPopup
          country={tripCountryPopup.country}
          trips={tripCountryTrips}
          allTrips={data.trips}
          x={tripCountryPopup.x}
          y={tripCountryPopup.y}
          open={tripCountryPopupOpen}
          onTripClick={handleTripCountryTripClick}
          onClose={closeTripCountryPopup}
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
            {...dashboardProps}
            onSwitchToGlobe={() => setMobileView('globe')}
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
        className={`shrink-0 h-full ${TRANSITION.panel}`}
        style={{
          width: PANEL_WIDTH.dashboard.min,
          marginLeft: sidebarOpen ? 0 : -PANEL_WIDTH.dashboard.min,
        }}
      >
        <DashboardPanel
          {...dashboardProps}
          onCollapse={() => setSidebarOpen(false)}
        />
      </div>
      {!sidebarOpen && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => setSidebarOpen(true)}
                className={`fixed left-0 top-4 h-7 w-5 flex items-center justify-center cursor-pointer ${GLASS.control} border-l-0 rounded-r-sm hover:bg-accent ${TRANSITION.color} text-muted-foreground hover:text-foreground`}
                style={{ zIndex: Z.sidebarToggle }}
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" className="text-xs">
              Open sidebar
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
      <div className="relative flex-1 overflow-hidden globe-bg">
        {globeSection}
      </div>
    </div>
  )
}
