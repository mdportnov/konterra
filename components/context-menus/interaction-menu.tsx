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
import type { Interaction } from '@/lib/db/schema'

interface InteractionContextMenuProps {
  interaction: Interaction
  children: React.ReactNode
  onEdit?: (id: string) => void
  onDelete?: (id: string) => void
}

export default function InteractionContextMenu({
  interaction,
  children,
  onEdit,
  onDelete,
}: InteractionContextMenuProps) {
  const copyNotes = async () => {
    if (!interaction.notes) return
    const ok = await copyToClipboard(interaction.notes)
    toast[ok ? 'success' : 'error'](ok ? 'Notes copied' : 'Copy failed')
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent className="w-48">
        {onEdit && (
          <ContextMenuItem onClick={() => onEdit(interaction.id)}>
            <Pencil className="h-3.5 w-3.5" />
            Edit interaction
          </ContextMenuItem>
        )}
        {interaction.notes && (
          <ContextMenuItem onClick={copyNotes}>
            <Copy className="h-3.5 w-3.5" />
            Copy notes
          </ContextMenuItem>
        )}
        {onDelete && (
          <>
            <ContextMenuSeparator />
            <ContextMenuItem variant="destructive" onClick={() => onDelete(interaction.id)}>
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </ContextMenuItem>
          </>
        )}
      </ContextMenuContent>
    </ContextMenu>
  )
}
