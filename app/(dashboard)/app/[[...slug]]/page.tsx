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
import { ChevronRight } from 'lucide-react'
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
    nav.handleContactSaved(saved, data.setContacts)
  }, [nav.handleContactSaved, data.setContacts])

  const handleDeleteContact = useCallback((contactId: string) => {
    nav.handleDeleteContact(contactId, data.setContacts, data.setConnections, data.setCountryConnections)
  }, [nav.handleDeleteContact, data.setContacts, data.setConnections, data.setCountryConnections])

  const addContactCb = useCallback(() => nav.handleAddContact(), [nav.handleAddContact])

  const handleAddTrip = useCallback((prefill?: { arrivalDate?: string; departureDate?: string; city?: string; country?: string }) => {
    setEditingTrip(null)
    setTripEditPrefill(prefill)
    setTripEditDialogOpen(true)
  }, [])

  const handleEditTrip = useCallback((trip: Trip) => {
    setEditingTrip(trip)
    setTripEditPrefill(undefined)
    setTripEditDialogOpen(true)
  }, [])

  const handleTripSaved = useCallback(() => {
    data.reloadTrips()
    data.reloadVisitedCountries()
  }, [data.reloadTrips, data.reloadVisitedCountries])

  const handleDeleteTrip = useCallback(async (trip: Trip) => {
    if (!confirm(`Delete trip to ${trip.city}, ${trip.country}?`)) return
    try {
      const res = await fetch(`/api/trips/${trip.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete trip')
      const { toast } = await import('sonner')
      toast.success('Trip deleted')
      tripSelection.clearSelectedTrip()
      data.reloadTrips()
      data.reloadVisitedCountries()
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
        display={displayOptions}
        visitedCountries={data.visitedCountries}
        wishlistCountries={data.wishlistCountries}
        connections={data.connections}
        countryConnections={data.countryConnections}
        highlightedContactIds={highlightedContactIds}
        trips={data.trips}
        selectedTripId={tripSelection.selectedTripId}
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
        initialTab={nav.settingsTab}
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
        onSearch={() => setCommandMenuOpen(true)}
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
        {commandMenu}
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
      {commandMenu}
    </div>
  )
}
