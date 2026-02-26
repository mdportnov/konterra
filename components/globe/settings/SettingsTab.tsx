'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ThemeToggle } from '@/components/theme-toggle'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Switch } from '@/components/ui/switch'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Loader2, Upload, Download, Trash2, Copy, UserX } from 'lucide-react'
import { toast } from 'sonner'
import { signOut } from 'next-auth/react'
import type { ArcMode } from '@/types/display'
import type { SettingsTabProps } from './types'
import { saveDefaultTab } from '@/hooks/use-dashboard-routing'

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
  defaultTab,
  onDefaultTabChange,
  onOpenImport,
  onOpenExport,
  onOpenDuplicates,
  onDeleteAllContacts,
}: SettingsTabProps) {
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [accountDeleteConfirm, setAccountDeleteConfirm] = useState(false)
  const [accountDeleting, setAccountDeleting] = useState(false)

  const handleDeleteAccount = async () => {
    setAccountDeleting(true)
    try {
      const res = await fetch('/api/me', { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete account')
      await signOut({ callbackUrl: '/' })
    } catch {
      toast.error('Failed to delete account')
      setAccountDeleteConfirm(false)
    } finally {
      setAccountDeleting(false)
    }
  }

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
      setDeleteConfirm(false)
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
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Connections</span>
            <Select
              value={displayOptions.arcMode}
              onValueChange={(v) => {
                if (isArcMode(v)) onDisplayChange({ ...displayOptions, arcMode: v })
              }}
            >
              <SelectTrigger className="w-[130px] h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ARC_MODES.map(({ value, label }) => (
                  <SelectItem key={value} value={value} className="text-xs">
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Globe auto-rotate</span>
            <Switch
              checked={displayOptions.autoRotate}
              onCheckedChange={(v) => onDisplayChange({ ...displayOptions, autoRotate: v })}
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Grid lines</span>
            <Switch
              checked={displayOptions.showGraticules}
              onCheckedChange={(v) => onDisplayChange({ ...displayOptions, showGraticules: v })}
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Default tab</span>
            <ToggleGroup
              type="single"
              value={defaultTab}
              onValueChange={(v) => { if (v === 'connections' || v === 'travel') { onDefaultTabChange(v); saveDefaultTab(v) } }}
              className="gap-0"
            >
              <ToggleGroupItem value="connections" className="h-8 px-3 text-xs rounded-r-none hover:bg-accent/50 data-[state=on]:bg-accent data-[state=on]:text-foreground">
                Connections
              </ToggleGroupItem>
              <ToggleGroupItem value="travel" className="h-8 px-3 text-xs rounded-l-none hover:bg-accent/50 data-[state=on]:bg-accent data-[state=on]:text-foreground">
                Travel
              </ToggleGroupItem>
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

        <Separator className="bg-border" />

        <div className="space-y-3">
          <span className="text-xs font-medium text-muted-foreground/60 uppercase tracking-wider">Account</span>
          {!accountDeleteConfirm ? (
            <Button
              variant="outline"
              className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
              onClick={() => setAccountDeleteConfirm(true)}
            >
              <UserX className="mr-2 h-4 w-4" />
              Delete Account
            </Button>
          ) : (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 space-y-2">
              <p className="text-sm text-destructive font-medium">
                This will permanently delete your account and all data. This action cannot be undone.
              </p>
              <div className="flex gap-2">
                <Button
                  variant="destructive"
                  size="sm"
                  className="flex-1"
                  onClick={handleDeleteAccount}
                  disabled={accountDeleting}
                >
                  {accountDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserX className="mr-2 h-4 w-4" />}
                  Confirm Delete Account
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setAccountDeleteConfirm(false)}
                  disabled={accountDeleting}
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
