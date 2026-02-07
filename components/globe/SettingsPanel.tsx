'use client'

import { useState, useEffect, useRef } from 'react'
import { signOut } from 'next-auth/react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { ThemeToggle } from '@/components/theme-toggle'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import { LogOut, Loader2, Pencil, Check, X, Search, Upload } from 'lucide-react'
import { toast } from 'sonner'
import GlobePanel from '@/components/globe/GlobePanel'
import { PANEL_WIDTH } from '@/lib/constants/ui'
import { countryNames } from '@/components/globe/data/country-centroids'
import type { DisplayOptions, ArcMode } from '@/types/display'

interface SettingsPanelProps {
  open: boolean
  onClose: () => void
  displayOptions: DisplayOptions
  onDisplayChange: (opts: DisplayOptions) => void
  visitedCountries?: Set<string>
  onToggleVisitedCountry?: (country: string) => void
  onOpenImport?: () => void
}

const allCountryNames = Array.from(new Set(Object.values(countryNames))).sort()

interface SessionUser {
  name?: string | null
  email?: string | null
  image?: string | null
}

export default function SettingsPanel({ open, onClose, displayOptions, onDisplayChange, visitedCountries, onToggleVisitedCountry, onOpenImport }: SettingsPanelProps) {
  const [user, setUser] = useState<SessionUser | null>(null)
  const [signingOut, setSigningOut] = useState(false)
  const [editingName, setEditingName] = useState(false)
  const [nameValue, setNameValue] = useState('')
  const [countrySearch, setCountrySearch] = useState('')
  const fetched = useRef(false)

  const filteredCountries = countrySearch
    ? allCountryNames.filter((c) => c.toLowerCase().includes(countrySearch.toLowerCase()))
    : allCountryNames

  useEffect(() => {
    if (open && !fetched.current) {
      fetched.current = true
      fetch('/api/profile')
        .then((r) => r.json())
        .then((data) => setUser(data))
        .catch(() => {})
    }
  }, [open])

  const initials = user?.name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || '?'

  const handleSignOut = async () => {
    setSigningOut(true)
    await signOut({ callbackUrl: '/login' })
  }

  const handleEditName = () => {
    setNameValue(user?.name || '')
    setEditingName(true)
  }

  const handleCancelEdit = () => {
    setNameValue('')
    setEditingName(false)
  }

  const handleSaveName = async () => {
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: nameValue }),
      })
      if (!res.ok) throw new Error('Failed to update profile')
      const updated = await res.json()
      setUser((prev) => prev ? { ...prev, name: updated.name } : prev)
      setEditingName(false)
      toast.success('Name updated')
    } catch {
      toast.error('Failed to update name')
    }
  }

  return (
    <GlobePanel
      open={open}
      side="right"
      width={PANEL_WIDTH.detail}
      glass="heavy"
      onClose={onClose}
    >
      <div className="p-6 space-y-6">
        <h2 className="text-lg font-semibold text-foreground">Settings</h2>

        <div className="flex items-center gap-4">
          <Avatar className="h-14 w-14 border-2 border-border">
            <AvatarImage src={user?.image || undefined} />
            <AvatarFallback className="bg-orange-500/20 text-orange-600 dark:text-orange-300">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            {editingName ? (
              <div className="flex items-center gap-1">
                <Input
                  value={nameValue}
                  onChange={(e) => setNameValue(e.target.value)}
                  className="h-8 text-sm"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveName()
                    if (e.key === 'Escape') handleCancelEdit()
                  }}
                />
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={handleSaveName}>
                  <Check className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={handleCancelEdit}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-1">
                <p className="font-medium text-foreground truncate">{user?.name || 'User'}</p>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={handleEditName}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Edit name</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            )}
            <p className="text-sm text-muted-foreground">{user?.email}</p>
          </div>
        </div>

        <Separator className="bg-border" />

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
              onValueChange={(v) => { if (v) onDisplayChange({ ...displayOptions, arcMode: v as ArcMode }) }}
              className="w-full"
            >
              <ToggleGroupItem
                value="animated"
                className="flex-1 text-xs data-[state=on]:bg-accent data-[state=on]:text-foreground text-muted-foreground/60 hover:text-muted-foreground hover:bg-accent/50"
              >
                Animated
              </ToggleGroupItem>
              <ToggleGroupItem
                value="static"
                className="flex-1 text-xs data-[state=on]:bg-accent data-[state=on]:text-foreground text-muted-foreground/60 hover:text-muted-foreground hover:bg-accent/50"
              >
                Static
              </ToggleGroupItem>
              <ToggleGroupItem
                value="off"
                className="flex-1 text-xs data-[state=on]:bg-accent data-[state=on]:text-foreground text-muted-foreground/60 hover:text-muted-foreground hover:bg-accent/50"
              >
                Off
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
        </div>

        <Separator className="bg-border" />

        <div className="space-y-3">
          <span className="text-xs font-medium text-muted-foreground/60 uppercase tracking-wider">Data</span>
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={onOpenImport}
          >
            <Upload className="mr-2 h-4 w-4" />
            Import Contacts
          </Button>
        </div>

        <Separator className="bg-border" />

        {onToggleVisitedCountry && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground/60 uppercase tracking-wider">Countries I&apos;ve visited</span>
              <span className="text-xs text-muted-foreground/60">{visitedCountries?.size || 0} of {allCountryNames.length} selected</span>
            </div>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/60" />
              <Input
                placeholder="Search countries..."
                value={countrySearch}
                onChange={(e) => setCountrySearch(e.target.value)}
                className="h-8 pl-8 text-xs"
              />
            </div>
            <ScrollArea className="h-[200px]">
              <div className="space-y-0.5 pr-3">
                {filteredCountries.map((name) => (
                  <label key={name} className="flex items-center gap-2 px-1 py-1 rounded hover:bg-accent cursor-pointer">
                    <Checkbox
                      checked={visitedCountries?.has(name) || false}
                      onCheckedChange={() => onToggleVisitedCountry(name)}
                    />
                    <span className="text-sm text-foreground">{name}</span>
                  </label>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        <Separator className="bg-border" />

        <Button
          variant="ghost"
          className="w-full !border !border-border !text-muted-foreground !bg-transparent hover:!text-foreground hover:!bg-accent"
          onClick={handleSignOut}
          disabled={signingOut}
        >
          {signingOut ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogOut className="mr-2 h-4 w-4" />}
          Sign Out
        </Button>
      </div>
    </GlobePanel>
  )
}
