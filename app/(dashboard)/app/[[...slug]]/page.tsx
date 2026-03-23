'use client'

import { useState, useEffect, useCallback, useMemo, use } from 'react'
import dynamic from 'next/dynamic'
import DashboardPanel from '@/components/dashboard/DashboardPanel'
import GlobePanel from '@/components/globe/GlobePanel'
import GlobeControls from '@/components/globe/GlobeControls'
import GlobeFilters from '@/components/globe/GlobeFilters'
import ContactEditPanel from '@/components/globe/ContactEditPanel'
import SettingsPanel from '@/components/globe/SettingsPanel'
import WishlistDetailPanel from '@/components/globe/WishlistDetailPanel'
import ImportDialog from '@/components/import/ImportDialog'
import TripImportDialog from '@/components/import/TripImportDialog'
import CommandMenu from '@/components/command-menu'
import KeyboardShortcutsDialog from '@/components/KeyboardShortcutsDialog'
import WelcomeWizard from '@/components/onboarding/WelcomeWizard'
import DuplicatesDialog from '@/components/dedup/DuplicatesDialog'
import ExportDialog from '@/components/export/ExportDialog'
import ConnectionInsightsPanel from '@/components/insights/ConnectionInsightsPanel'
import CountryPopup from '@/components/globe/CountryPopup'
import TripPopup from '@/components/globe/TripPopup'
import TripEditDialog from '@/components/globe/TripEditDialog'
import TripCountryPopup from '@/components/globe/TripCountryPopup'
import { PANEL_WIDTH, GLASS, Z, TRANSITION } from '@/lib/constants/ui'
import { displayDefaults } from '@/types/display'
import GlobeViewToggle from '@/components/globe/GlobeViewToggle'
import { normalizeToGlobeName } from '@/components/globe/data/country-centroids'
import type { DisplayOptions, VisualizationMode } from '@/types/display'
import type { Contact, Trip } from '@/lib/db/schema'
import { useIsMobile } from '@/hooks/use-mobile'
import { useGlobeData } from '@/hooks/use-globe-data'
import { useContactFilters } from '@/hooks/use-contact-filters'
import { usePanelNavigation } from '@/hooks/use-panel-navigation'
import { useTripSelection } from '@/hooks/use-trip-selection'
import { usePopupState } from '@/hooks/use-popup-state'
import { useDashboardRouting } from '@/hooks/use-dashboard-routing'
import { useHotkey } from '@/hooks/use-hotkey'
import { toast } from 'sonner'
import { ChevronRight, Globe } from 'lucide-react'
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip'

import { useSession } from 'next-auth/react'

const GlobeCanvas = dynamic(() => import('@/components/globe/GlobeCanvas'), { ssr: false })

export default function GlobePage({ params }: { params: Promise<{ slug?: string[] }> }) {
  const { slug } = use(params)
  const { data: session } = useSession()
  const isMobile = useIsMobile()
  const [mobileView, setMobileView] = useState<'globe' | 'dashboard'>('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const [dupDialogOpen, setDupDialogOpen] = useState(false)
  const [exportDialogOpen, setExportDialogOpen] = useState(false)
  const [tripImportDialogOpen, setTripImportDialogOpen] = useState(false)
  const [displayOptions, setDisplayOptions] = useState<DisplayOptions>(displayDefaults)
  const [highlightedContactIds, setHighlightedContactIds] = useState<Set<string>>(new Set())
  const [tripEditDialogOpen, setTripEditDialogOpen] = useState(false)
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null)
  const [tripEditPrefill, setTripEditPrefill] = useState<{ arrivalDate?: string; departureDate?: string; city?: string; country?: string } | undefined>()
  const [wishlistDetailCountry, setWishlistDetailCountry] = useState<string | null>(null)
  const [wishlistDetailOpen, setWishlistDetailOpen] = useState(false)
  const [commandMenuOpen, setCommandMenuOpen] = useState(false)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)

  useHotkey('?', () => setShortcutsOpen(true))

  const data = useGlobeData()
  const filters = useContactFilters(data.contacts, data.userTags)
  const nav = usePanelNavigation(slug, data.contacts, data.connections, isMobile, setMobileView)

  const { dashboardTab, setDashboardTab, handleLayerToggle } = useDashboardRouting({
    initialSlug: slug,
    setDisplayOptions,
  })

  const tripSelection = useTripSelection({
    trips: data.trips,
    setFlyTarget: nav.setFlyTarget,
  })

  const popups = usePopupState({
    contacts: data.contacts,
    filteredContacts: filters.filteredContacts,
    countryConnections: data.countryConnections,
    trips: data.trips,
    displayOptions,
    onContactClick: nav.handleContactClick,
    onAddContact: nav.handleAddContact,
    setFlyTarget: nav.setFlyTarget,
    onTripSelected: (tripId: string) => tripSelection.handleTripPointClick(tripId),
  })

  const handleVisualizationToggle = useCallback((mode: VisualizationMode) => {
    setDisplayOptions((prev) => {
      if (mode === 'heatmap') {
        return { ...prev, showHeatmap: !prev.showHeatmap, showHexBins: !prev.showHeatmap ? false : prev.showHexBins }
      }
      return { ...prev, showHexBins: !prev.showHexBins, showHeatmap: !prev.showHexBins ? false : prev.showHeatmap }
    })
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
    const isNew = !data.contacts.some((c) => c.id === saved.id)
    nav.handleContactSaved(saved, data.setContacts)
    if (isNew) {
      toast('Contact added', {
        description: 'Log how you met?',
        action: {
          label: 'Log interaction',
          onClick: () => {
            try {
              const sections = JSON.parse(localStorage.getItem('konterra:detail-sections') || '{}')
              sections.timeline = true
              localStorage.setItem('konterra:detail-sections', JSON.stringify(sections))
            } catch {}
            nav.handleContactClick(saved)
          },
        },
        duration: 6000,
      })
    }
  }, [nav.handleContactSaved, data.setContacts, data.contacts, nav.handleContactClick])

  const handleDeleteContact = useCallback((contactId: string) => {
    nav.handleDeleteContact(contactId, data.setContacts, data.setConnections, data.setCountryConnections)
  }, [nav.handleDeleteContact, data.setContacts, data.setConnections, data.setCountryConnections])

  const addContactCb = useCallback(() => nav.handleAddContact(), [nav.handleAddContact])

  const handleQuickAddContact = useCallback(async (quickData: { name: string; country?: string }) => {
    const res = await fetch('/api/contacts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: quickData.name, country: quickData.country || undefined }),
    })
    if (!res.ok) {
      toast.error('Failed to create contact')
      return
    }
    const saved = await res.json()
    handleContactSaved(saved)
  }, [handleContactSaved])

  const handleAddTrip = useCallback((prefill?: { arrivalDate?: string; departureDate?: string; city?: string; country?: string }) => {
    setEditingTrip(null)
    setTripEditPrefill(prefill)
    setTripEditDialogOpen(true)
  }, [])

  const handleGpsLocationDetected = useCallback(async (detected: { city: string; country: string }) => {
    const dismissKey = `konterra:trip-dismiss:${detected.city.toLowerCase().trim()}`
    const lastDismiss = localStorage.getItem(dismissKey)
    if (lastDismiss && Date.now() - parseInt(lastDismiss, 10) < 24 * 60 * 60 * 1000) return

    let homebaseCity: string | null = null
    try {
      const res = await fetch('/api/me/location')
      const loc = await res.json()
      homebaseCity = loc.city
    } catch { /* ignore */ }

    if (!homebaseCity) return
    if (homebaseCity.toLowerCase().trim() === detected.city.toLowerCase().trim()) return

    const now = new Date()
    const todayISO = now.toISOString().split('T')[0]
    const hasActiveTrip = data.trips.some((t) => {
      if (t.city.toLowerCase().trim() !== detected.city.toLowerCase().trim()) return false
      const arrival = new Date(t.arrivalDate)
      const departure = t.departureDate ? new Date(t.departureDate) : arrival
      return arrival <= now && departure >= now
    })
    if (hasActiveTrip) return

    toast(`You're in ${detected.city}, ${detected.country}`, {
      duration: Infinity,
      action: {
        label: 'Add trip',
        onClick: () => handleAddTrip({ city: detected.city, country: detected.country, arrivalDate: todayISO }),
      },
      cancel: {
        label: 'Dismiss',
        onClick: () => localStorage.setItem(dismissKey, String(Date.now())),
      },
    })
  }, [data.trips, handleAddTrip])

  const handleEditTrip = useCallback((trip: Trip) => {
    setEditingTrip(trip)
    setTripEditPrefill(undefined)
    setTripEditDialogOpen(true)
  }, [])

  const handleTripSaved = useCallback(() => {
    Promise.all([data.reloadTrips(), data.reloadVisitedCountries()])
  }, [data.reloadTrips, data.reloadVisitedCountries])

  const handleDeleteTrip = useCallback(async (trip: Trip) => {
    if (!confirm(`Delete trip to ${trip.city}, ${trip.country}?`)) return
    try {
      const res = await fetch(`/api/trips/${trip.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete trip')
      const { toast } = await import('sonner')
      toast.success('Trip deleted')
      tripSelection.clearSelectedTrip()
      Promise.all([data.reloadTrips(), data.reloadVisitedCountries()])
    } catch {
      const { toast } = await import('sonner')
      toast.error('Failed to delete trip')
    }
  }, [tripSelection.clearSelectedTrip, data.reloadTrips, data.reloadVisitedCountries])

  const visitedCityCount = useMemo(() => {
    const now = new Date()
    return new Set(
      data.trips
        .filter((t) => new Date(t.arrivalDate) <= now)
        .map((t) => t.city)
    ).size
  }, [data.trips])

  const handleOpenWishlistDetail = useCallback((country: string) => {
    setWishlistDetailCountry(country)
    setWishlistDetailOpen(true)
  }, [])

  const handleCloseWishlistDetail = useCallback(() => {
    setWishlistDetailOpen(false)
  }, [])

  const wishlistDetailEntry = useMemo(() => {
    if (!wishlistDetailCountry) return null
    return data.wishlistCountries.get(wishlistDetailCountry) ?? null
  }, [wishlistDetailCountry, data.wishlistCountries])

  const wishlistDetailContacts = useMemo(() => {
    if (!wishlistDetailCountry) return []
    return data.contacts.filter((c) => c.country && normalizeToGlobeName(c.country) === wishlistDetailCountry)
  }, [wishlistDetailCountry, data.contacts])

  const wishlistDetailIndirectContacts = useMemo(() => {
    if (!wishlistDetailCountry) return []
    const indirectContactIds = new Set(
      data.countryConnections
        .filter((cc) => normalizeToGlobeName(cc.country) === wishlistDetailCountry)
        .map((cc) => cc.contactId)
    )
    const directContactIds = new Set(wishlistDetailContacts.map((c) => c.id))
    return data.contacts.filter((c) => indirectContactIds.has(c.id) && !directContactIds.has(c.id))
  }, [wishlistDetailCountry, data.countryConnections, data.contacts, wishlistDetailContacts])

  const wishlistDetailEffectiveOpen = wishlistDetailOpen && !!wishlistDetailCountry && data.wishlistCountries.has(wishlistDetailCountry)

  useEffect(() => {
    if (!data.loading) nav.resolveInitialContact(data.contacts)
  }, [data.loading, data.contacts, nav.resolveInitialContact])

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
    onOpenProfile: nav.handleOpenProfile,
    isMobile,
    contactsLoading: data.loading,
    visitedCount: data.visitedCountries.size,
    wishlistCount: data.wishlistCountries.size,
    onSelectionChange: handleSelectionChange,
    onBulkDelete: handleBulkDelete,
    trips: data.trips,
    tripsLoading: data.tripsLoading,
    onImportTrips: () => setTripImportDialogOpen(true),
    onTripClick: tripSelection.handleTripClick,
    onAddTrip: handleAddTrip,
    onEditTrip: handleEditTrip,
    onDeleteTrip: handleDeleteTrip,
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
        onCountryClick={popups.handleCountryClick}
        onTripPointClick={tripSelection.handleTripPointClick}
        onGpsLocationDetected={handleGpsLocationDetected}
        display={displayOptions}
        visitedCountries={data.visitedCountries}
        wishlistCountries={data.wishlistCountries}
        connections={data.connections}
        countryConnections={data.countryConnections}
        highlightedContactIds={highlightedContactIds}
        trips={data.trips}
        selectedTripId={tripSelection.selectedTripId}
      />

      {!data.loading && data.contacts.filter(c => !c.isSelf).length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ zIndex: Z.controls }}>
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute top-[30%] left-[25%] h-2 w-2 rounded-full bg-orange-500/20 animate-pulse" />
            <div className="absolute top-[45%] right-[30%] h-1.5 w-1.5 rounded-full bg-orange-500/15 animate-pulse [animation-delay:0.5s]" />
            <div className="absolute bottom-[35%] left-[40%] h-2.5 w-2.5 rounded-full bg-orange-500/10 animate-pulse [animation-delay:1s]" />
          </div>
          <svg className="absolute inset-0 w-full h-full opacity-[0.07]" viewBox="0 0 400 400">
            <path d="M100,200 Q200,100 300,180" fill="none" stroke="currentColor" strokeWidth="1" className="text-orange-500 animate-pulse" />
            <path d="M150,280 Q250,200 320,260" fill="none" stroke="currentColor" strokeWidth="1" className="text-orange-500 animate-pulse [animation-delay:0.7s]" />
          </svg>
          <div className={`${GLASS.panel} rounded-2xl p-6 text-center pointer-events-auto max-w-xs relative`}>
            <div className="h-10 w-10 rounded-full bg-orange-500/10 flex items-center justify-center mx-auto mb-3">
              <Globe className="h-5 w-5 text-orange-500/60" />
            </div>
            <p className="text-sm font-medium text-foreground mb-1">Your globe awaits</p>
            <p className="text-xs text-muted-foreground mb-4">Add contacts and trips to see your network come alive on the globe.</p>
            <div className="flex gap-2 justify-center">
              <button onClick={() => nav.handleAddContact()} className="px-3 py-1.5 rounded-md bg-orange-500 text-white text-xs font-medium hover:bg-orange-600 transition-colors">Create contact</button>
              <button onClick={() => setImportDialogOpen(true)} className="px-3 py-1.5 rounded-md bg-accent text-foreground text-xs font-medium hover:bg-accent/80 transition-colors">Import</button>
            </div>
          </div>
        </div>
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
        initialTab={nav.settingsTab}
        onTabChange={nav.handleSettingsTabChange}
        displayOptions={displayOptions}
        onDisplayChange={setDisplayOptions}
        defaultTab={dashboardTab}
        onDefaultTabChange={setDashboardTab}
        visitedCountries={data.visitedCountries}
        onToggleVisitedCountry={data.handleCountryVisitToggle}
        wishlistCountries={data.wishlistCountries}
        onToggleWishlistCountry={data.handleWishlistToggle}
        onOpenWishlistDetail={handleOpenWishlistDetail}
        onOpenImport={() => setImportDialogOpen(true)}
        onOpenExport={() => setExportDialogOpen(true)}
        onOpenDuplicates={() => setDupDialogOpen(true)}
        onDeleteAllContacts={data.reloadContacts}
        contactCount={data.contacts.length}
        connectionCount={data.connections.length}
        visitedCountryCount={data.visitedCountries.size}
        visitedCityCount={visitedCityCount}
        contactCountsByCountry={popups.contactCountsByCountry}
      />

      <WishlistDetailPanel
        open={wishlistDetailEffectiveOpen}
        country={wishlistDetailCountry}
        entry={wishlistDetailEntry}
        contacts={wishlistDetailContacts}
        indirectContacts={wishlistDetailIndirectContacts}
        onClose={handleCloseWishlistDetail}
        onUpdate={data.handleWishlistUpdate}
        onRemove={data.handleWishlistToggle}
        onContactClick={nav.handleContactClick}
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
        onQuickAddContact={handleQuickAddContact}
        onSearch={() => setCommandMenuOpen(true)}
        onInsights={nav.handleOpenInsights}
        onSettings={nav.handleOpenSettings}
        onProfile={nav.handleOpenProfile}
        isMobile={isMobile}
        onSwitchToDashboard={() => setMobileView('dashboard')}
        user={session?.user}
      />

      <div className="absolute top-4 right-4 flex items-center gap-2" style={{ zIndex: Z.controls }}>
        <GlobeViewToggle
          showNetwork={displayOptions.showNetwork}
          showTravel={displayOptions.showTravel}
          showHeatmap={displayOptions.showHeatmap}
          showHexBins={displayOptions.showHexBins}
          onToggle={handleLayerToggle}
          onVisualizationToggle={handleVisualizationToggle}
        />
      </div>

      <TripImportDialog
        open={tripImportDialogOpen}
        onOpenChange={setTripImportDialogOpen}
        onImportComplete={() => { Promise.all([data.reloadTrips(), data.reloadVisitedCountries()]) }}
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
        importSources={filters.allImportSources}
        activeImportSources={filters.activeImportSources}
        onImportSourcesChange={filters.setActiveImportSources}
        userTags={data.userTags}
        onTagCreated={data.handleTagCreated}
        onTagDeleted={data.handleTagDeleted}
      />

      <TripPopup
        trip={tripSelection.selectedTrip}
        prevTrip={tripSelection.selectedTripIndex > 0 ? tripSelection.sortedTrips[tripSelection.selectedTripIndex - 1] : null}
        nextTrip={tripSelection.selectedTripIndex < tripSelection.sortedTrips.length - 1 ? tripSelection.sortedTrips[tripSelection.selectedTripIndex + 1] : null}
        onNavigate={tripSelection.handleTripNavigate}
        onClose={tripSelection.clearSelectedTrip}
        onAddTrip={handleAddTrip}
        onEditTrip={handleEditTrip}
        onDeleteTrip={handleDeleteTrip}
      />

      {popups.countryPopup && (
        <CountryPopup
          country={popups.countryPopup.country}
          contacts={popups.countryPopup.contacts}
          x={popups.countryPopup.x}
          y={popups.countryPopup.y}
          open={popups.countryPopupOpen}
          onSelect={popups.handleCountryPopupSelect}
          onClose={popups.closeCountryPopup}
          visited={data.visitedCountries.has(popups.countryPopup.country)}
          onToggleVisited={() => data.handleCountryVisitToggle(popups.countryPopup!.country)}
          wishlisted={data.wishlistCountries.has(popups.countryPopup.country)}
          wishlistEntry={data.wishlistCountries.get(popups.countryPopup.country)}
          onToggleWishlist={() => data.handleWishlistToggle(popups.countryPopup!.country)}
          onOpenWishlistDetail={() => {
            popups.closeCountryPopup()
            handleOpenWishlistDetail(popups.countryPopup!.country)
          }}
          onAddContact={popups.handleAddContactToCountry}
          onPlanTrip={() => {
            const country = popups.countryPopup!.country
            popups.closeCountryPopup()
            handleAddTrip({ country })
          }}
          indirectContacts={popups.indirectPopupContacts}
        />
      )}

      {popups.tripCountryPopup && (
        <TripCountryPopup
          country={popups.tripCountryPopup.country}
          trips={popups.tripCountryTrips}
          allTrips={data.trips}
          x={popups.tripCountryPopup.x}
          y={popups.tripCountryPopup.y}
          open={popups.tripCountryPopupOpen}
          onTripClick={popups.handleTripCountryTripClick}
          onClose={popups.closeTripCountryPopup}
          onEditTrip={handleEditTrip}
          onDeleteTrip={handleDeleteTrip}
        />
      )}

      <TripEditDialog
        open={tripEditDialogOpen}
        onOpenChange={setTripEditDialogOpen}
        trip={editingTrip}
        prefill={tripEditPrefill}
        trips={data.trips}
        onSaved={handleTripSaved}
      />
    </>
  )

  const commandMenu = (
    <CommandMenu
      contacts={data.contacts}
      trips={data.trips}
      dashboardTab={dashboardTab}
      onContactClick={nav.handleContactClick}
      onAddContact={addContactCb}
      onAddTrip={handleAddTrip}
      onOpenSettings={nav.handleOpenSettings}
      onOpenProfile={nav.handleOpenProfile}
      onOpenInsights={nav.handleOpenInsights}
      onDashboardTabChange={setDashboardTab}
      onOpenImport={() => setImportDialogOpen(true)}
      onOpenTripImport={() => setTripImportDialogOpen(true)}
      onOpenExport={() => setExportDialogOpen(true)}
      onOpenDuplicates={() => setDupDialogOpen(true)}
      onTripClick={(trip) => {
        setDashboardTab('travel')
        tripSelection.handleTripPointClick(trip.id)
      }}
      externalOpen={commandMenuOpen}
      onExternalOpenChange={setCommandMenuOpen}
    />
  )

  const shortcutsDialog = <KeyboardShortcutsDialog open={shortcutsOpen} onOpenChange={setShortcutsOpen} />

  if (isMobile) {
    return (
      <div className="fixed inset-0 overflow-hidden bg-background">
        <div
          className="absolute inset-0 transition-[opacity,transform] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]"
          style={{
            opacity: showDashboard ? 1 : 0,
            pointerEvents: showDashboard ? 'auto' : 'none',
            transform: showDashboard ? 'translateX(0)' : 'translateX(-8%)',
            willChange: 'transform, opacity',
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
            willChange: 'transform, opacity',
          }}
        >
          <div className="relative w-full h-full overflow-hidden globe-bg">
            {globeSection}
          </div>
        </div>
        {!data.loading && (
          <WelcomeWizard
            onAddContact={nav.handleAddContact}
            onOpenImport={() => setImportDialogOpen(true)}
            onComplete={data.reloadContacts}
          />
        )}
        {commandMenu}
        {shortcutsDialog}
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
      {!data.loading && (
        <WelcomeWizard
          onAddContact={nav.handleAddContact}
          onOpenImport={() => setImportDialogOpen(true)}
          onComplete={data.reloadContacts}
        />
      )}
      {commandMenu}
      {shortcutsDialog}
    </div>
  )
}
