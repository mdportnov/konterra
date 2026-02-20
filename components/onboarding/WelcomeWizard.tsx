'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Globe, UserPlus, Upload, LayoutDashboard, Settings, ArrowRight, ArrowLeft, Loader2, Check, ChevronsUpDown, Search, X,
} from 'lucide-react'
import { toast } from 'sonner'
import { GLASS, Z, TRANSITION } from '@/lib/constants/ui'

const STORAGE_KEY = 'konterra-onboarded'

const RAW_TIMEZONES = Intl.supportedValuesOf('timeZone')

function getUtcOffset(tz: string): string {
  try {
    const fmt = new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'shortOffset' })
    const parts = fmt.formatToParts(new Date())
    const offsetPart = parts.find(p => p.type === 'timeZoneName')
    return offsetPart?.value || ''
  } catch {
    return ''
  }
}

function parseOffsetMinutes(offset: string): number {
  if (offset === 'GMT') return 0
  const match = offset.match(/^GMT([+-])(\d{1,2})(?::(\d{2}))?$/)
  if (!match) return 0
  const sign = match[1] === '+' ? 1 : -1
  return sign * (parseInt(match[2]) * 60 + parseInt(match[3] || '0'))
}

interface WelcomeWizardProps {
  onAddContact: (prefill?: Record<string, string>) => void
  onOpenImport: () => void
  onComplete: () => Promise<unknown>
}

export default function WelcomeWizard({ onAddContact, onOpenImport, onComplete }: WelcomeWizardProps) {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState(0)
  const [country, setCountry] = useState('')
  const [city, setCity] = useState('')
  const [timezone, setTimezone] = useState(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone
    } catch {
      return ''
    }
  })
  const [saving, setSaving] = useState(false)
  const [tzOpen, setTzOpen] = useState(false)
  const [tzSearch, setTzSearch] = useState('')
  const tzInputRef = useRef<HTMLInputElement>(null)

  const timezones = useMemo(() => {
    const list = RAW_TIMEZONES.map(tz => {
      const offset = getUtcOffset(tz)
      return { tz, label: tz.replace(/_/g, ' '), offset, minutes: parseOffsetMinutes(offset) }
    })
    list.sort((a, b) => a.minutes - b.minutes || a.tz.localeCompare(b.tz))
    return list
  }, [])

  const filteredTz = useMemo(() => {
    if (!tzSearch) return timezones
    const q = tzSearch.toLowerCase()
    return timezones.filter(({ tz, label, offset }) =>
      label.toLowerCase().includes(q) || tz.toLowerCase().includes(q) || offset.toLowerCase().includes(q)
    )
  }, [timezones, tzSearch])

  const selectedTzLabel = useMemo(() => {
    if (!timezone) return ''
    const found = timezones.find(t => t.tz === timezone)
    return found ? `${found.label} (${found.offset})` : timezone.replace(/_/g, ' ')
  }, [timezone, timezones])

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) {
      setOpen(true)
    }
  }, [])

  const finish = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, '1')
    setOpen(false)
  }, [])

  const handleSaveHomeBase = useCallback(async () => {
    if (!country.trim()) {
      toast.error('Country is required')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Me',
          country: country.trim(),
          city: city.trim() || null,
          timezone: timezone || null,
          isSelf: true,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Failed' }))
        throw new Error(data.error || 'Failed to save home base')
      }
      toast.success('Home base saved')
      await onComplete()
      setStep(2)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save home base')
    } finally {
      setSaving(false)
    }
  }, [country, city, timezone, onComplete])

  const handleCreateManually = useCallback(() => {
    finish()
    onAddContact()
  }, [finish, onAddContact])

  const handleImport = useCallback(() => {
    finish()
    onOpenImport()
  }, [finish, onOpenImport])

  if (!open) return null

  const steps = [
    {
      title: 'Welcome to Konterra',
      description: 'Your personal network, visualized on a globe. Let\'s get you set up in a few quick steps.',
      content: (
        <div className="flex flex-col items-center gap-4 py-6">
          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Globe className="h-8 w-8 text-primary" />
          </div>
          <p className="text-sm text-muted-foreground text-center max-w-sm">
            Map your contacts across the world, track relationships, and never lose sight of your network.
          </p>
        </div>
      ),
      footer: (
        <DialogFooter>
          <Button onClick={() => setStep(1)}>
            Get started
            <ArrowRight className="h-4 w-4" />
          </Button>
        </DialogFooter>
      ),
    },
    {
      title: 'Set your home base',
      description: 'Where are you located? This creates your profile pin on the globe.',
      content: (
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="wizard-country" className="text-sm">Country *</Label>
            <Input
              id="wizard-country"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              placeholder="e.g. Germany"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="wizard-city" className="text-sm">City</Label>
            <Input
              id="wizard-city"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="e.g. Berlin"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm">Timezone</Label>
            <Popover open={tzOpen} onOpenChange={(v) => { setTzOpen(v); if (v) setTimeout(() => tzInputRef.current?.focus(), 0); if (!v) setTzSearch('') }}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 text-sm shadow-xs transition-[color,box-shadow] outline-none hover:bg-accent/50 cursor-pointer"
                >
                  <span className={selectedTzLabel ? 'truncate' : 'text-muted-foreground truncate'}>
                    {selectedTzLabel || 'Select timezone'}
                  </span>
                  <ChevronsUpDown className="h-4 w-4 text-muted-foreground/50 shrink-0 ml-1" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" side="bottom" align="start">
                <div className="flex items-center border-b border-border px-2">
                  <Search className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
                  <input
                    ref={tzInputRef}
                    value={tzSearch}
                    onChange={(e) => setTzSearch(e.target.value)}
                    placeholder="Search timezone..."
                    className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/40 h-9 px-2 outline-none"
                  />
                  {tzSearch && (
                    <button type="button" onClick={() => setTzSearch('')} className="text-muted-foreground/50 hover:text-muted-foreground">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                <ScrollArea className="h-[200px]">
                  <div className="p-1">
                    {filteredTz.map(({ tz, label, offset }) => {
                      const selected = timezone === tz
                      return (
                        <button
                          key={tz}
                          type="button"
                          onClick={() => { setTimezone(tz); setTzOpen(false); setTzSearch('') }}
                          className={`flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-xs cursor-pointer transition-colors ${
                            selected ? 'bg-accent text-foreground' : 'text-foreground hover:bg-accent/50'
                          }`}
                        >
                          <Check className={`h-3 w-3 shrink-0 ${selected ? 'opacity-100' : 'opacity-0'}`} />
                          <span className="truncate">{label}</span>
                          <span className="text-muted-foreground text-[10px] shrink-0 ml-auto">{offset}</span>
                        </button>
                      )
                    })}
                    {filteredTz.length === 0 && (
                      <p className="text-xs text-muted-foreground/60 text-center py-4">No timezones found</p>
                    )}
                  </div>
                </ScrollArea>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      ),
      footer: (
        <DialogFooter className="flex-row justify-between sm:justify-between">
          <Button variant="ghost" onClick={() => setStep(0)}>
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <Button onClick={handleSaveHomeBase} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Save and continue
            {!saving && <ArrowRight className="h-4 w-4" />}
          </Button>
        </DialogFooter>
      ),
    },
    {
      title: 'Add your first contact',
      description: 'Start building your network. You can always add more later.',
      content: (
        <div className="flex flex-col gap-3 py-4">
          <button
            onClick={handleCreateManually}
            className={`${GLASS.control} rounded-lg p-4 text-left ${TRANSITION.color} hover:bg-accent group`}
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <UserPlus className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Create manually</p>
                <p className="text-xs text-muted-foreground">Add a contact with name, location, and details</p>
              </div>
            </div>
          </button>
          <button
            onClick={handleImport}
            className={`${GLASS.control} rounded-lg p-4 text-left ${TRANSITION.color} hover:bg-accent group`}
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Upload className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Import contacts</p>
                <p className="text-xs text-muted-foreground">Upload a CSV or JSON file with your contacts</p>
              </div>
            </div>
          </button>
        </div>
      ),
      footer: (
        <DialogFooter className="flex-row justify-between sm:justify-between">
          <Button variant="ghost" onClick={() => setStep(1)}>
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <Button variant="outline" onClick={() => setStep(3)}>
            Skip for now
            <ArrowRight className="h-4 w-4" />
          </Button>
        </DialogFooter>
      ),
    },
    {
      title: 'Quick UI overview',
      description: 'Here is how Konterra is organized.',
      content: (
        <div className="space-y-3 py-2">
          <div className="flex items-start gap-3">
            <div className="h-9 w-9 rounded-md bg-muted flex items-center justify-center shrink-0">
              <LayoutDashboard className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Dashboard (left)</p>
              <p className="text-xs text-muted-foreground">Browse, search, and manage your contacts list</p>
            </div>
          </div>
          <Separator />
          <div className="flex items-start gap-3">
            <div className="h-9 w-9 rounded-md bg-muted flex items-center justify-center shrink-0">
              <Globe className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Globe (right)</p>
              <p className="text-xs text-muted-foreground">See your network plotted on a 3D globe, click pins to view details</p>
            </div>
          </div>
          <Separator />
          <div className="flex items-start gap-3">
            <div className="h-9 w-9 rounded-md bg-muted flex items-center justify-center shrink-0">
              <Settings className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Settings (gear icon)</p>
              <p className="text-xs text-muted-foreground">Display options, visited countries, import/export, and more</p>
            </div>
          </div>
        </div>
      ),
      footer: (
        <DialogFooter>
          <Button onClick={finish}>
            <Check className="h-4 w-4" />
            Done
          </Button>
        </DialogFooter>
      ),
    },
  ]

  const current = steps[step]

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) finish() }}>
      <DialogContent
        showCloseButton={false}
        className="sm:max-w-md"
        style={{ zIndex: Z.modal }}
      >
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>{current.title}</DialogTitle>
            <span className="text-xs text-muted-foreground">{step + 1} / {steps.length}</span>
          </div>
          <DialogDescription>{current.description}</DialogDescription>
        </DialogHeader>
        {current.content}
        {current.footer}
      </DialogContent>
    </Dialog>
  )
}
