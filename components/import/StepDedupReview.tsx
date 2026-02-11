'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import MergeFieldPicker from './MergeFieldPicker'
import type { ImportEntry, ImportAction } from '@/lib/import/types'

interface StepDedupReviewProps {
  entries: ImportEntry[]
  intraDupCount?: number
  onConfirm: (entries: ImportEntry[]) => void
  onBack: () => void
}

function CollapseSection({ open, children }: { open: boolean; children: React.ReactNode }) {
  return (
    <div
      className="grid transition-[grid-template-rows,opacity] duration-300 ease-out"
      style={{
        gridTemplateRows: open ? '1fr' : '0fr',
        opacity: open ? 1 : 0,
      }}
    >
      <div className="overflow-hidden">{children}</div>
    </div>
  )
}

export default function StepDedupReview({ entries: initial, intraDupCount = 0, onConfirm, onBack }: StepDedupReviewProps) {
  const [entries, setEntries] = useState<ImportEntry[]>(initial)

  const duplicates = entries.filter((e) => e.match)
  const newContacts = entries.filter((e) => !e.match)

  const setAction = (index: number, action: ImportAction) => {
    setEntries((prev) => {
      const dups = prev.filter((e) => e.match)
      const target = dups[index]
      if (!target) return prev
      return prev.map((e) => (e === target ? { ...e, action } : e))
    })
  }

  const setMergeField = (index: number, field: string, source: 'existing' | 'imported') => {
    setEntries((prev) => {
      const dups = prev.filter((e) => e.match)
      const target = dups[index]
      if (!target) return prev
      return prev.map((e) =>
        e === target
          ? { ...e, mergeFields: { ...e.mergeFields, [field]: source } }
          : e
      )
    })
  }

  const batchAction = (action: ImportAction) => {
    setEntries((prev) =>
      prev.map((e) => (e.match ? { ...e, action } : e))
    )
  }

  return (
    <div className="space-y-4">
      {intraDupCount > 0 && (
        <p className="text-xs text-muted-foreground">
          {intraDupCount} duplicate{intraDupCount !== 1 ? 's' : ''} within the file removed
        </p>
      )}
      {duplicates.length > 0 && (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-foreground">
              {duplicates.length} potential duplicate{duplicates.length !== 1 ? 's' : ''}
            </p>
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" onClick={() => batchAction('skip')}>
                Skip All
              </Button>
              <Button variant="ghost" size="sm" onClick={() => batchAction('create')}>
                Create All
              </Button>
            </div>
          </div>

          <ScrollArea className="max-h-[300px]">
            <div className="space-y-3 pr-3">
              {duplicates.map((entry, i) => (
                <div key={i} className="rounded-lg border border-border p-3 space-y-2 transition-all duration-200 ease-out">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{entry.parsed.name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {entry.parsed.email || entry.parsed.phone || ''}
                      </p>
                    </div>
                    <Badge variant="outline" className="shrink-0 text-[10px]">
                      {entry.match!.confidence === 'exact' ? 'Exact' : 'Possible'} match ({entry.match!.matchField})
                    </Badge>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    Matches: <span className="text-foreground">{entry.match!.existingContact.name}</span>
                    {entry.match!.existingContact.email && ` (${entry.match!.existingContact.email})`}
                  </p>

                  <ToggleGroup
                    type="single"
                    value={entry.action}
                    onValueChange={(v) => { if (v) setAction(i, v as ImportAction) }}
                    className="w-full"
                  >
                    <ToggleGroupItem
                      value="skip"
                      className="flex-1 text-xs data-[state=on]:bg-accent data-[state=on]:text-foreground transition-all duration-150"
                    >
                      Skip
                    </ToggleGroupItem>
                    <ToggleGroupItem
                      value="merge"
                      className="flex-1 text-xs data-[state=on]:bg-accent data-[state=on]:text-foreground transition-all duration-150"
                    >
                      Merge
                    </ToggleGroupItem>
                    <ToggleGroupItem
                      value="create"
                      className="flex-1 text-xs data-[state=on]:bg-accent data-[state=on]:text-foreground transition-all duration-150"
                    >
                      Create New
                    </ToggleGroupItem>
                  </ToggleGroup>

                  <CollapseSection open={entry.action === 'merge' && !!entry.match}>
                    <div className="pt-1">
                      <MergeFieldPicker
                        parsed={entry.parsed}
                        existing={entry.match!.existingContact}
                        mergeFields={entry.mergeFields || {}}
                        onMergeFieldChange={(field, source) => setMergeField(i, field, source)}
                      />
                    </div>
                  </CollapseSection>
                </div>
              ))}
            </div>
          </ScrollArea>

          <Separator />
        </>
      )}

      <p className="text-sm text-muted-foreground">
        {newContacts.length} new contact{newContacts.length !== 1 ? 's' : ''} will be created
      </p>

      <div className="flex justify-between pt-2">
        <Button variant="outline" onClick={onBack}>Back</Button>
        <Button onClick={() => onConfirm(entries)}>
          Import
        </Button>
      </div>
    </div>
  )
}
