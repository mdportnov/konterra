'use client'

import { useState, useMemo } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import DupGroupCard from './DupGroupCard'
import { findDuplicateGroups } from '@/lib/dedup/find-duplicate-groups'
import type { Contact } from '@/lib/db/schema'

interface DuplicatesDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  contacts: Contact[]
  onResolved: () => void
}

export default function DuplicatesDialog({ open, onOpenChange, contacts, onResolved }: DuplicatesDialogProps) {
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set())

  const groups = useMemo(() => {
    if (!open) return []
    return findDuplicateGroups(contacts)
  }, [open, contacts])

  const visibleGroups = groups.filter((g) => !dismissedIds.has(g.id))

  const handleResolved = (groupId: string) => {
    setDismissedIds((prev) => new Set([...prev, groupId]))
    onResolved()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Resolve Duplicates</DialogTitle>
          <DialogDescription>
            {visibleGroups.length > 0
              ? `${visibleGroups.length} potential duplicate group${visibleGroups.length > 1 ? 's' : ''} found`
              : 'No duplicates detected'
            }
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-3 pb-2">
            {visibleGroups.map((group) => (
              <DupGroupCard
                key={group.id}
                group={group}
                onResolved={() => handleResolved(group.id)}
              />
            ))}
            {visibleGroups.length === 0 && groups.length > 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">All groups resolved</p>
            )}
            {groups.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">No duplicate contacts found</p>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
