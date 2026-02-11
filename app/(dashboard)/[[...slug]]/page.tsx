'use client'

import { useState, useEffect, useCallback, useMemo, useRef, use } from 'react'
import dynamic from 'next/dynamic'
import DashboardPanel from '@/components/dashboard/DashboardPanel'
import ContactDetail from '@/components/globe/ContactDetail'
import GlobePanel from '@/components/globe/GlobePanel'
import GlobeControls from '@/components/globe/GlobeControls'
import GlobeFilters from '@/components/globe/GlobeFilters'
import ContactEditPanel from '@/components/globe/ContactEditPanel'
import ContactsBrowserPanel from '@/components/globe/ContactsBrowserPanel'
import SettingsPanel from '@/components/globe/SettingsPanel'
import ImportDialog from '@/components/import/ImportDialog'
import ConnectionInsightsPanel from '@/components/insights/ConnectionInsightsPanel'
import CountryPopup from '@/components/globe/CountryPopup'
import { PANEL_WIDTH, GLASS, Z } from '@/lib/constants/ui'
import { displayDefaults } from '@/types/display'
import type { DisplayOptions } from '@/types/display'
import type { Contact, ContactCountryConnection } from '@/lib/db/schema'
import { useIsMobile } from '@/hooks/use-mobile'
import { useGlobeData } from '@/hooks/use-globe-data'
import { useContactFilters } from '@/hooks/use-contact-filters'
import { usePanelNavigation } from '@/hooks/use-panel-navigation'

const GlobeCanvas = dynamic(() => import('@/components/globe/GlobeCanvas'), { ssr: false })

export default function GlobePage({ params }: { params: Promise<{ slug?: string[] }> }) {
  const { slug } = use(params)
  const isMobile = useIsMobile()
  const [mobileView, setMobileView] = useState<'globe' | 'dashboard'>('dashboard')
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const [dashboardExpanded, setDashboardExpanded] = useState(false)
  const [displayOptions, setDisplayOptions] = useState<DisplayOptions>(displayDefaults)
  const [countryPopup, setCountryPopup] = useState<{ country: string; contacts: Contact[]; x: number; y: number } | null>(null)
  const [countryPopupOpen, setCountryPopupOpen] = useState(false)
  const countryClosingTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const data = useGlobeData()
  const filters = useContactFilters(data.contacts, data.userTags)
  const nav = usePanelNavigation(slug, data.contacts, data.connections, isMobile, setMobileView)

  useEffect(() => {
    if (!data.loading) nav.resolveInitialContact(data.contacts)
  }, [data.loading, data.contacts, nav.resolveInitialContact])

  useEffect(() => {
    return () => {
      if (countryClosingTimer.current) clearTimeout(countryClosingTimer.current)
    }
  }, [])

  const handleContactSaved = useCallback((saved: Contact) => {
    nav.handleContactSaved(saved, data.setContacts)
  }, [nav.handleContactSaved, data.setContacts])

  const handleDeleteContact = useCallback((contactId: string) => {
    nav.handleDeleteContact(contactId, data.setContacts, data.setConnections, data.setCountryConnections)
  }, [nav.handleDeleteContact, data.setContacts, data.setConnections, data.setCountryConnections])

  const handleCountryClick = useCallback((country: string, event: { x: number; y: number }) => {
    if (countryClosingTimer.current) clearTimeout(countryClosingTimer.current)
    const matched = filters.filteredContacts.filter((c) => c.country === country)
    setCountryPopup({ country, contacts: matched, x: event.x, y: event.y })
    requestAnimationFrame(() => setCountryPopupOpen(true))
  }, [filters.filteredContacts])

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

  const closeCountryPopup = useCallback(() => {
    setCountryPopupOpen(false)
    countryClosingTimer.current = setTimeout(() => setCountryPopup(null), 150)
  }, [])

  const handleCountryPopupSelect = useCallback((contact: Contact) => {
    closeCountryPopup()
    nav.handleContactClick(contact)
  }, [closeCountryPopup, nav.handleContactClick])

  const handleAddContactToCountry = useCallback(() => {
    closeCountryPopup()
    nav.handleAddContact()
  }, [closeCountryPopup, nav.handleAddContact])

  const openDashboard = useCallback(() => setDashboardExpanded(true), [])
  const closeDashboard = useCallback(() => setDashboardExpanded(false), [])

  const handleDashContactClick = useCallback((c: Contact) => {
    nav.handleContactClick(c)
    setDashboardExpanded(false)
  }, [nav.handleContactClick])

  const handleDashAddContact = useCallback(() => {
    nav.handleAddContact()
    setDashboardExpanded(false)
  }, [nav.handleAddContact])

  const handleDashOpenInsights = useCallback(() => {
    nav.handleOpenInsights()
    setDashboardExpanded(false)
  }, [nav.handleOpenInsights])

  const showDashboard = !isMobile || mobileView === 'dashboard'
  const showGlobe = !isMobile || mobileView === 'globe'

  const globeSection = (
    <>
      <GlobeCanvas
        contacts={filters.filteredContacts}
        selectedContact={nav.selectedContact}
        flyTarget={nav.flyTarget}
        onContactClick={nav.handleContactClick}
        onCountryClick={handleCountryClick}
        display={displayOptions}
        visitedCountries={data.visitedCountries}
        connections={data.connections}
        countryConnections={data.countryConnections}
      />

      {!data.loading && data.contacts.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ zIndex: Z.controls }}>
          <div className={`${GLASS.panel} rounded-2xl p-6 text-center pointer-events-auto max-w-xs`}>
            <p className="text-sm font-medium text-foreground mb-1">No contacts yet</p>
            <p className="text-xs text-muted-foreground mb-4">Add your first contact or import from a file.</p>
            <div className="flex gap-2 justify-center">
              <button onClick={nav.handleAddContact} className="px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors">Create contact</button>
              <button onClick={() => setImportDialogOpen(true)} className="px-3 py-1.5 rounded-md bg-accent text-foreground text-xs font-medium hover:bg-accent/80 transition-colors">Import</button>
            </div>
          </div>
        </div>
      )}

      <ContactDetail
        contact={nav.selectedContact}
        open={nav.activePanel === 'detail'}
        onClose={nav.handleCloseDetail}
        onEdit={nav.handleEditContact}
        onDelete={handleDeleteContact}
        connectedContacts={nav.connectedContacts}
        onConnectedContactClick={nav.handleConnectedContactClick}
        allContacts={data.contacts}
        onCountryConnectionsChange={data.handleCountryConnectionsChange}
      />

      <ContactEditPanel
        contact={nav.editingContact}
        open={nav.activePanel === 'edit'}
        onSaved={handleContactSaved}
        onCancel={nav.handleCancelEdit}
        availableTags={data.userTags}
        onTagCreated={data.handleTagCreated}
      />

      <SettingsPanel
        open={nav.activePanel === 'settings'}
        onClose={nav.handleCloseSettings}
        displayOptions={displayOptions}
        onDisplayChange={setDisplayOptions}
        visitedCountries={data.visitedCountries}
        onToggleVisitedCountry={data.handleCountryVisitToggle}
        onOpenImport={() => setImportDialogOpen(true)}
        onDeleteAllContacts={data.reloadContacts}
      />

      <ImportDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        existingContacts={data.contacts}
        onImportComplete={() => {
          data.reloadContacts()
          setImportDialogOpen(false)
        }}
      />

      <ContactsBrowserPanel
        open={nav.activePanel === 'browser'}
        onClose={nav.handleCloseBrowser}
        contacts={data.contacts}
        onSelectContact={nav.handleBrowserSelectContact}
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
            contacts={data.contacts}
            connections={data.connections}
            selectedContact={nav.selectedContact}
            onContactClick={nav.handleContactClick}
            onAddContact={nav.handleAddContact}
            onOpenContactsBrowser={nav.handleOpenContactsBrowser}
            onOpenInsights={nav.handleOpenInsights}
            isMobile={isMobile}
            onSwitchToGlobe={() => setMobileView('globe')}
            contactsLoading={data.loading}
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
          contacts={data.contacts}
          connections={data.connections}
          selectedContact={nav.selectedContact}
          onContactClick={nav.handleContactClick}
          onAddContact={nav.handleAddContact}
          onOpenContactsBrowser={nav.handleOpenContactsBrowser}
          onOpenInsights={nav.handleOpenInsights}
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
          contacts={data.contacts}
          connections={data.connections}
          selectedContact={nav.selectedContact}
          onContactClick={handleDashContactClick}
          onAddContact={handleDashAddContact}
          onOpenContactsBrowser={nav.handleOpenContactsBrowser}
          onOpenInsights={handleDashOpenInsights}
          isMobile={isMobile}
          collapsed={false}
          onToggleCollapse={closeDashboard}
        />
      </GlobePanel>
    </div>
  )
}
