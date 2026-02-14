import ContactDetailContent from '@/components/globe/ContactDetailContent'
import type { Contact, ContactCountryConnection } from '@/lib/db/schema'
import type { ConnectedContact } from '@/components/globe/ContactDetail'

interface ContactDetailSectionProps {
  contact: Contact
  onEdit: (c: Contact) => void
  onDelete?: (contactId: string) => void
  onReloadContacts?: () => void
  onBack: () => void
  connectedContacts: ConnectedContact[]
  onConnectedContactClick?: (cc: ConnectedContact) => void
  allContacts?: Contact[]
  onCountryConnectionsChange?: (contactId: string, connections: ContactCountryConnection[]) => void
}

export default function ContactDetailSection({
  contact,
  onEdit,
  onDelete,
  onReloadContacts,
  onBack,
  connectedContacts,
  onConnectedContactClick,
  allContacts,
  onCountryConnectionsChange,
}: ContactDetailSectionProps) {
  return (
    <div className="h-full w-full flex flex-col overflow-hidden">
      <ContactDetailContent
        contact={contact}
        onEdit={onEdit}
        onDelete={onDelete}
        onReloadContacts={onReloadContacts}
        onBack={onBack}
        connectedContacts={connectedContacts}
        onConnectedContactClick={onConnectedContactClick}
        allContacts={allContacts}
        onCountryConnectionsChange={onCountryConnectionsChange}
      />
    </div>
  )
}
