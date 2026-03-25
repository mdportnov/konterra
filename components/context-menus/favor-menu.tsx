'use client'

import { Trash2, Copy, RefreshCw } from 'lucide-react'
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
} from '@/components/ui/context-menu'
import { toast } from 'sonner'
import { copyToClipboard } from '@/lib/utils'
import type { Favor } from '@/lib/db/schema'

interface FavorContextMenuProps {
  favor: Favor
  children: React.ReactNode
  onCycleStatus?: (favor: Favor) => void
  onDelete?: (id: string) => void
}

export default function FavorContextMenu({
  favor,
  children,
  onCycleStatus,
  onDelete,
}: FavorContextMenuProps) {
  const copyDescription = async () => {
    if (!favor.description) return
    const ok = await copyToClipboard(favor.description)
    toast[ok ? 'success' : 'error'](ok ? 'Description copied' : 'Copy failed')
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent className="w-48">
        {onCycleStatus && (
          <ContextMenuItem onClick={() => onCycleStatus(favor)}>
            <RefreshCw className="h-3.5 w-3.5" />
            Cycle status
          </ContextMenuItem>
        )}
        {favor.description && (
          <ContextMenuItem onClick={copyDescription}>
            <Copy className="h-3.5 w-3.5" />
            Copy description
          </ContextMenuItem>
        )}
        {onDelete && (
          <>
            <ContextMenuSeparator />
            <ContextMenuItem variant="destructive" onClick={() => onDelete(favor.id)}>
              <Trash2 className="h-3.5 w-3.5" />
              Delete favor
            </ContextMenuItem>
          </>
        )}
      </ContextMenuContent>
    </ContextMenu>
  )
}
