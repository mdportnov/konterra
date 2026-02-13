'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { ThemeToggle } from '@/components/theme-toggle'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Loader2, Upload, Download, Trash2, Copy } from 'lucide-react'
import { toast } from 'sonner'
import type { ArcMode } from '@/types/display'
import type { SettingsTabProps } from './types'

const ARC_MODES: { value: ArcMode; label: string }[] = [
  { value: 'animated', label: 'Animated' },
  { value: 'static', label: 'Static' },
  { value: 'off', label: 'Off' },
]

function isArcMode(v: string): v is ArcMode {
  return ARC_MODES.some((m) => m.value === v)
}

export function SettingsTab({
  displayOptions,
  onDisplayChange,
  onOpenImport,
  onOpenExport,
  onOpenDuplicates,
  onDeleteAllContacts,
}: SettingsTabProps) {
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const handleDeleteAll = async () => {
    setDeleting(true)
    try {
      const res = await fetch('/api/contacts', { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete contacts')
      toast.success('All contacts removed')
      setDeleteConfirm(false)
      onDeleteAllContacts?.()
    } catch {
      toast.error('Failed to remove contacts')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-6 space-y-6">
        <div className="space-y-3">
          <span className="text-xs font-medium text-muted-foreground/60 uppercase tracking-wider">Appearance</span>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Theme</span>
            <ThemeToggle />
          </div>
          <div>
            <span className="text-xs text-muted-foreground mb-2 block">Connections</span>
            <ToggleGroup
              type="single"
              value={displayOptions.arcMode}
              onValueChange={(v) => {
                if (v && isArcMode(v)) onDisplayChange({ ...displayOptions, arcMode: v })
              }}
              className="w-full"
            >
              {ARC_MODES.map(({ value, label }) => (
                <ToggleGroupItem
                  key={value}
                  value={value}
                  className="flex-1 text-xs data-[state=on]:bg-accent data-[state=on]:text-foreground text-muted-foreground/60 hover:text-muted-foreground hover:bg-accent/50"
                >
                  {label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>
        </div>

        <Separator className="bg-border" />

        <div className="space-y-3">
          <span className="text-xs font-medium text-muted-foreground/60 uppercase tracking-wider">Data</span>
          <Button variant="outline" className="w-full justify-start" onClick={onOpenImport}>
            <Upload className="mr-2 h-4 w-4" />
            Import Contacts
          </Button>
          <Button variant="outline" className="w-full justify-start" onClick={onOpenExport}>
            <Download className="mr-2 h-4 w-4" />
            Export Contacts
          </Button>
          <Button variant="outline" className="w-full justify-start" onClick={onOpenDuplicates}>
            <Copy className="mr-2 h-4 w-4" />
            Resolve Duplicates
          </Button>
          {!deleteConfirm ? (
            <Button
              variant="outline"
              className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
              onClick={() => setDeleteConfirm(true)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Remove All Contacts
            </Button>
          ) : (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 space-y-2">
              <p className="text-sm text-destructive font-medium">
                This will permanently delete all your contacts, connections, interactions, and related data.
              </p>
              <div className="flex gap-2">
                <Button
                  variant="destructive"
                  size="sm"
                  className="flex-1"
                  onClick={handleDeleteAll}
                  disabled={deleting}
                >
                  {deleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                  Confirm Delete
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDeleteConfirm(false)}
                  disabled={deleting}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </ScrollArea>
  )
}
