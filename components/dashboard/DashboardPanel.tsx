'use client'

import { useState } from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'
import DashboardHeader from './DashboardHeader'
import ContactDetailSection from './ContactDetailSection'
import ContactListSection from './ContactListSection'
import TravelSection from './TravelSection'
import type { Contact, ContactConnection, ContactCountryConnection, Trip } from '@/lib/db/schema'
import type { ConnectedContact } from '@/components/globe/ContactDetail'
import type { SidebarView } from '@/hooks/use-panel-navigation'

interface DashboardPanelProps {
  contacts: Contact[]
  connections?: ContactConnection[]
  selectedContact: Contact | null
  sidebarView: SidebarView
  onContactClick: (contact: Contact) => void
  onBackToList: () => void
  onAddContact: () => void
  onEditContact?: (contact: Contact) => void
  onDeleteContact?: (contactId: string) => void
  onReloadContacts?: () => void
  connectedContacts?: ConnectedContact[]
  onConnectedContactClick?: (cc: ConnectedContact) => void
  allContacts?: Contact[]
  onCountryConnectionsChange?: (contactId: string, connections: ContactCountryConnection[]) => void
  onOpenInsights?: () => void
  onOpenSettings?: () => void
  isMobile?: boolean
  onSwitchToGlobe?: () => void
  contactsLoading?: boolean
  onCollapse?: () => void
  onSelectionChange?: (ids: Set<string>) => void
  onBulkDelete?: (ids: string[]) => void
  trips?: Trip[]
  tripsLoading?: boolean
  onImportTrips?: () => void
  onTripClick?: (trip: Trip) => void
  dashboardTab?: 'connections' | 'travel'
  onDashboardTabChange?: (tab: 'connections' | 'travel') => void
}

export default function DashboardPanel({
  contacts,
  connections = [],
  selectedContact,
  sidebarView,
  onContactClick,
  onBackToList,
  onAddContact,
  onEditContact,
  onDeleteContact,
  onReloadContacts,
  connectedContacts = [],
  onConnectedContactClick,
  allContacts,
  onCountryConnectionsChange,
  onOpenInsights,
  onOpenSettings,
  isMobile,
  onSwitchToGlobe,
  contactsLoading = false,
  onCollapse,
  onSelectionChange,
  onBulkDelete,
  trips = [],
  tripsLoading = false,
  onImportTrips,
  onTripClick,
  dashboardTab: dashboardTabProp,
  onDashboardTabChange,
}: DashboardPanelProps) {
  const [dashboardTabInternal, setDashboardTabInternal] = useState<'connections' | 'travel'>('connections')
  const dashboardTab = dashboardTabProp ?? dashboardTabInternal
  const setDashboardTab = onDashboardTabChange ?? setDashboardTabInternal

  if (sidebarView === 'detail' && selectedContact) {
    return (
      <ContactDetailSection
        contact={selectedContact}
        onEdit={(c) => onEditContact?.(c)}
        onDelete={onDeleteContact}
        onReloadContacts={onReloadContacts}
        onBack={onBackToList}
        connectedContacts={connectedContacts}
        onConnectedContactClick={onConnectedContactClick}
        allContacts={allContacts}
        onCountryConnectionsChange={onCountryConnectionsChange}
      />
    )
  }

  return (
    <div className="h-full w-full flex flex-col overflow-hidden">
      <DashboardHeader
        isMobile={isMobile}
        onSwitchToGlobe={onSwitchToGlobe}
        onAddContact={onAddContact}
        onCollapse={onCollapse}
        dashboardTab={dashboardTab}
        onDashboardTabChange={setDashboardTab}
      />

      <ScrollArea className="flex-1 overflow-hidden">
        {dashboardTab === 'travel' ? (
          <TravelSection
            trips={trips}
            tripsLoading={tripsLoading}
            onImportTrips={onImportTrips || (() => {})}
            onTripClick={onTripClick}
          />
        ) : (
          <ContactListSection
            contacts={contacts}
            connections={connections}
            selectedContact={selectedContact}
            onContactClick={onContactClick}
            onAddContact={onAddContact}
            onOpenInsights={onOpenInsights}
            onOpenSettings={onOpenSettings}
            contactsLoading={contactsLoading}
            onSelectionChange={onSelectionChange}
            onBulkDelete={onBulkDelete}
            onReloadContacts={onReloadContacts}
          />
        )}
      </ScrollArea>
    </div>
  )
}
