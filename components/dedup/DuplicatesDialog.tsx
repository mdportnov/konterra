'use client'

import { useState, useMemo } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
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
  const resolvedCount = groups.length - visibleGroups.length

  const handleResolved = (groupId: string) => {
    setDismissedIds((prev) => new Set([...prev, groupId]))
    onResolved()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-xl">Resolve Duplicates</DialogTitle>
          <DialogDescription>
            {visibleGroups.length > 0
              ? `${visibleGroups.length} potential duplicate group${visibleGroups.length > 1 ? 's' : ''} found`
              : 'No duplicates detected'
            }
            {resolvedCount > 0 && ` \u00b7 ${resolvedCount} resolved`}
          </DialogDescription>
        </DialogHeader>

        <Separator />

        <ScrollArea className="flex-1 -mx-6 px-6 min-h-0">
          <div className="space-y-4 pb-2">
            {visibleGroups.map((group, i) => (
              <div key={group.id}>
                <DupGroupCard
                  group={group}
                  index={i + 1}
                  total={visibleGroups.length}
                  onResolved={() => handleResolved(group.id)}
                />
              </div>
            ))}
            {visibleGroups.length === 0 && groups.length > 0 && (
              <p className="text-sm text-muted-foreground text-center py-12">All groups resolved</p>
            )}
            {groups.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-12">No duplicate contacts found</p>
            )}
          </div>
        </ScrollArea>

        {groups.length > 0 && (
          <>
            <Separator />
            <DialogFooter>
              <div className="flex items-center justify-between w-full">
                <p className="text-xs text-muted-foreground">
                  {resolvedCount} of {groups.length} group{groups.length > 1 ? 's' : ''} resolved
                </p>
                <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
                  Done
                </Button>
              </div>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
