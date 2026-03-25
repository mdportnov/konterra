'use client'

import { Pencil, Trash2, Copy } from 'lucide-react'
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
} from '@/components/ui/context-menu'
import { toast } from 'sonner'
import { copyToClipboard } from '@/lib/utils'
import type { ContactCountryConnection } from '@/lib/db/schema'

interface CountryTieContextMenuProps {
  tie: ContactCountryConnection
  children: React.ReactNode
  onEditNotes?: (id: string) => void
  onDelete?: (id: string) => void
}

export default function CountryTieContextMenu({
  tie,
  children,
  onEditNotes,
  onDelete,
}: CountryTieContextMenuProps) {
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent className="w-48">
        {onEditNotes && (
          <ContextMenuItem onClick={() => onEditNotes(tie.id)}>
            <Pencil className="h-3.5 w-3.5" />
            Edit notes
          </ContextMenuItem>
        )}
        <ContextMenuItem onClick={async () => {
          const ok = await copyToClipboard(tie.country)
          toast[ok ? 'success' : 'error'](ok ? 'Country copied' : 'Copy failed')
        }}>
          <Copy className="h-3.5 w-3.5" />
          Copy country
        </ContextMenuItem>
        {tie.notes && (
          <ContextMenuItem onClick={async () => {
            const ok = await copyToClipboard(tie.notes ?? '')
            toast[ok ? 'success' : 'error'](ok ? 'Notes copied' : 'Copy failed')
          }}>
            <Copy className="h-3.5 w-3.5" />
            Copy notes
          </ContextMenuItem>
        )}
        {onDelete && (
          <>
            <ContextMenuSeparator />
            <ContextMenuItem variant="destructive" onClick={() => onDelete(tie.id)}>
              <Trash2 className="h-3.5 w-3.5" />
              Delete country tie
            </ContextMenuItem>
          </>
        )}
      </ContextMenuContent>
    </ContextMenu>
  )
}
