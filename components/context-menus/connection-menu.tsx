'use client'

import { Eye, Trash2, Copy } from 'lucide-react'
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
} from '@/components/ui/context-menu'
import { toast } from 'sonner'
import { copyToClipboard } from '@/lib/utils'
import type { ContactConnection } from '@/lib/db/schema'

interface ConnectionContextMenuProps {
  connection: ContactConnection
  otherName?: string
  children: React.ReactNode
  onViewContact?: () => void
  onDelete?: (id: string) => void
}

export default function ConnectionContextMenu({
  connection,
  otherName,
  children,
  onViewContact,
  onDelete,
}: ConnectionContextMenuProps) {
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent className="w-48">
        {onViewContact && otherName && (
          <ContextMenuItem onClick={onViewContact}>
            <Eye className="h-3.5 w-3.5" />
            View {otherName}
          </ContextMenuItem>
        )}
        {otherName && (
          <ContextMenuItem onClick={async () => {
            const ok = await copyToClipboard(otherName)
            toast[ok ? 'success' : 'error'](ok ? 'Name copied' : 'Copy failed')
          }}>
            <Copy className="h-3.5 w-3.5" />
            Copy name
          </ContextMenuItem>
        )}
        {connection.notes && (
          <ContextMenuItem onClick={async () => {
            const ok = await copyToClipboard(connection.notes ?? '')
            toast[ok ? 'success' : 'error'](ok ? 'Notes copied' : 'Copy failed')
          }}>
            <Copy className="h-3.5 w-3.5" />
            Copy notes
          </ContextMenuItem>
        )}
        {onDelete && (
          <>
            <ContextMenuSeparator />
            <ContextMenuItem variant="destructive" onClick={() => onDelete(connection.id)}>
              <Trash2 className="h-3.5 w-3.5" />
              Delete connection
            </ContextMenuItem>
          </>
        )}
      </ContextMenuContent>
    </ContextMenu>
  )
}
