'use client'

import GlobePanel from '@/components/globe/GlobePanel'
import ContactDetailContent from '@/components/globe/ContactDetailContent'
import { PANEL_WIDTH } from '@/lib/constants/ui'
import type { Contact, ContactCountryConnection } from '@/lib/db/schema'

export interface ConnectedContact {
  id: string
  name: string
  lat: number | null
  lng: number | null
}

interface ContactDetailProps {
  contact: Contact | null
  open: boolean
  onClose: () => void
  onEdit: (contact: Contact) => void
  onDelete?: (contactId: string) => void
  connectedContacts?: ConnectedContact[]
  onConnectedContactClick?: (c: ConnectedContact) => void
  allContacts?: Contact[]
  onCountryConnectionsChange?: (contactId: string, connections: ContactCountryConnection[]) => void
}

export default function ContactDetail({
  contact,
  open,
  onClose,
  onEdit,
  onDelete,
  connectedContacts = [],
  onConnectedContactClick,
  allContacts = [],
  onCountryConnectionsChange,
}: ContactDetailProps) {
  if (!contact) return null

  return (
    <GlobePanel
      open={open}
      side="right"
      width={PANEL_WIDTH.detail}
      glass="heavy"
      onClose={onClose}
    >
      <ContactDetailContent
        contact={contact}
        onEdit={onEdit}
        onDelete={onDelete}
        onClose={onClose}
        connectedContacts={connectedContacts}
        onConnectedContactClick={onConnectedContactClick}
        allContacts={allContacts}
        onCountryConnectionsChange={onCountryConnectionsChange}
      />
    </GlobePanel>
  )
}
