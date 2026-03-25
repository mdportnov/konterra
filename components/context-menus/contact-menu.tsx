'use client'

import { Pencil, Trash2, Copy, MapPin, Eye, CheckSquare, Mail, User } from 'lucide-react'
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubTrigger,
  ContextMenuSubContent,
} from '@/components/ui/context-menu'
import { toast } from 'sonner'
import { copyToClipboard } from '@/lib/utils'
import type { Contact } from '@/lib/db/schema'

interface ContactContextMenuProps {
  contact: Contact
  children: React.ReactNode
  onOpen?: (contact: Contact) => void
  onEdit?: (contact: Contact) => void
  onDelete?: (contactId: string) => void
  onSelect?: (contactId: string) => void
  onShowOnGlobe?: (contact: Contact) => void
  selectMode?: boolean
  disabled?: boolean
}

export default function ContactContextMenu({
  contact,
  children,
  onOpen,
  onEdit,
  onDelete,
  onSelect,
  onShowOnGlobe,
  selectMode,
  disabled,
}: ContactContextMenuProps) {
  if (disabled) return <>{children}</>

  const copy = async (text: string, label: string) => {
    const ok = await copyToClipboard(text)
    toast[ok ? 'success' : 'error'](ok ? `${label} copied` : 'Copy failed')
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent className="w-52">
        {onOpen && (
          <ContextMenuItem onClick={() => onOpen(contact)}>
            <Eye className="h-3.5 w-3.5" />
            Open detail
          </ContextMenuItem>
        )}
        {onEdit && (
          <ContextMenuItem onClick={() => onEdit(contact)}>
            <Pencil className="h-3.5 w-3.5" />
            Edit contact
          </ContextMenuItem>
        )}
        {onShowOnGlobe && contact.lat && contact.lng && (
          <ContextMenuItem onClick={() => onShowOnGlobe(contact)}>
            <MapPin className="h-3.5 w-3.5" />
            Show on globe
          </ContextMenuItem>
        )}
        {selectMode && onSelect && (
          <>
            <ContextMenuSeparator />
            <ContextMenuItem onClick={() => onSelect(contact.id)}>
              <CheckSquare className="h-3.5 w-3.5" />
              Toggle selection
            </ContextMenuItem>
          </>
        )}
        <ContextMenuSeparator />
        <ContextMenuSub>
          <ContextMenuSubTrigger>
            <Copy className="h-3.5 w-3.5" />
            Copy
          </ContextMenuSubTrigger>
          <ContextMenuSubContent className="w-44">
            <ContextMenuItem onClick={() => copy(contact.name, 'Name')}>
              <User className="h-3.5 w-3.5" />
              Name
            </ContextMenuItem>
            {contact.email && (
              <ContextMenuItem onClick={() => copy(contact.email!, 'Email')}>
                <Mail className="h-3.5 w-3.5" />
                Email
              </ContextMenuItem>
            )}
            {(contact.city || contact.country) && (
              <ContextMenuItem onClick={() => copy([contact.city, contact.country].filter(Boolean).join(', '), 'Location')}>
                <MapPin className="h-3.5 w-3.5" />
                Location
              </ContextMenuItem>
            )}
          </ContextMenuSubContent>
        </ContextMenuSub>
        {onDelete && (
          <>
            <ContextMenuSeparator />
            <ContextMenuItem variant="destructive" onClick={() => onDelete(contact.id)}>
              <Trash2 className="h-3.5 w-3.5" />
              Delete contact
            </ContextMenuItem>
          </>
        )}
      </ContextMenuContent>
    </ContextMenu>
  )
}
