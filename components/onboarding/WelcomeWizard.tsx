'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Globe, UserPlus, Upload, ArrowRight, ArrowLeft, Loader2, Check, ChevronsUpDown,
  Search, X, MapPin, Share2, Plug, CalendarRange, Radar,
} from 'lucide-react'
import { toast } from 'sonner'
import { GLASS, Z, TRANSITION } from '@/lib/constants/ui'
import { CountrySelect } from '@/components/globe/contact-edit/CountrySelect'
import { countryFlag } from '@/lib/country-flags'
import { ANALYTICS_EVENTS, track } from '@/lib/analytics'

const RAW_TIMEZONES = Intl.supportedValuesOf('timeZone')

function getUtcOffset(tz: string): string {
  try {
    const fmt = new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'shortOffset' })
    const parts = fmt.formatToParts(new Date())
    return parts.find(p => p.type === 'timeZoneName')?.value || ''
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

function StepDots({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center justify-center gap-1.5">
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className={`rounded-full transition-all duration-300 ${
            i === current ? 'w-6 h-2 bg-primary' : i < current ? 'w-2 h-2 bg-primary/40' : 'w-2 h-2 bg-muted-foreground/20'
          }`}
        />
      ))}
    </div>
  )
}

function FeatureRow({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="h-8 w-8 rounded-md bg-muted flex items-center justify-center shrink-0">{icon}</div>
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
  )
}

interface WelcomeWizardProps {
  onAddContact: (prefill?: Record<string, string>) => void
  onOpenImport: () => void
  onComplete: () => Promise<unknown>
}

const TOTAL_STEPS = 4

export default function WelcomeWizard({ onAddContact, onOpenImport, onComplete }: WelcomeWizardProps) {
  const { data: session } = useSession()
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState(0)

  const [country, setCountry] = useState('')
  const [city, setCity] = useState('')
  const [timezone, setTimezone] = useState(() => {
    try { return Intl.DateTimeFormat().resolvedOptions().timeZone } catch { return '' }
  })
  const [saving, setSaving] = useState(false)
  const [tzOpen, setTzOpen] = useState(false)
  const [tzSearch, setTzSearch] = useState('')
  const [visited, setVisited] = useState<string[]>([])
  const [savingVisited, setSavingVisited] = useState(false)
  const [username, setUsername] = useState('')
  const [makePublic, setMakePublic] = useState(false)
  const [savingClaim, setSavingClaim] = useState(false)
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
    fetch('/api/me/onboarding')
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data && !data.onboardedAt) {
          setStep(typeof data.wizardStep === 'number' ? Math.min(data.wizardStep, TOTAL_STEPS - 1) : 0)
          setOpen(true)
          track(ANALYTICS_EVENTS.onboardingShown)
        }
      })
      .catch(() => {})
  }, [])

  const goToStep = useCallback((next: number) => {
    setStep(next)
    track(ANALYTICS_EVENTS.onboardingStep, { step: next })
    // Persist progress so closing the tab mid-setup does not restart the whole flow.
    fetch('/api/me/onboarding', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wizardStep: next, complete: false }),
    }).catch(() => {})
  }, [])

  const finish = useCallback(async (reason: 'completed' | 'skipped') => {
    setOpen(false)
    track(reason === 'completed' ? ANALYTICS_EVENTS.onboardingCompleted : ANALYTICS_EVENTS.onboardingSkipped, { step })
    try {
      const res = await fetch('/api/me/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ complete: true }),
      })
      // A failed write would resurrect the wizard on the next visit, which reads as a bug.
      if (!res.ok) throw new Error()
    } catch {
      toast.error('Could not save your setup progress — you may see this again next time.')
    }
  }, [step])

  /**
   * Closing the dialog is not the same as being done with setup. Escape and backdrop clicks
   * are easy to hit by accident, and marking onboarding complete there would silently
   * destroy it with no way back — only the explicit Skip and the final step do that.
   */
  const dismissForNow = useCallback(() => {
    setOpen(false)
    fetch('/api/me/onboarding', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wizardStep: step, complete: false }),
    }).catch(() => {})
  }, [step])

  const handleSaveHomeBase = useCallback(async () => {
    if (!country.trim()) {
      toast.error('Pick a country to place your pin')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // Use the real name rather than a hardcoded "Me" — this pin is labelled on the globe.
          name: session?.user?.name?.trim() || 'Me',
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
      await onComplete()
      if (!visited.includes(country.trim())) setVisited((v) => [...v, country.trim()])
      toast.success('You are on the map')
      goToStep(2)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save home base')
    } finally {
      setSaving(false)
    }
  }, [country, city, timezone, visited, onComplete, goToStep, session])

  const handleSaveVisited = useCallback(async () => {
    if (visited.length === 0) {
      goToStep(3)
      return
    }
    setSavingVisited(true)
    try {
      const res = await fetch('/api/visited-countries', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ countries: visited }),
      })
      if (!res.ok) throw new Error('Failed to save countries')
      await onComplete()
      toast.success(`${visited.length} ${visited.length === 1 ? 'country' : 'countries'} lit up`)
      goToStep(3)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save countries')
    } finally {
      setSavingVisited(false)
    }
  }, [visited, onComplete, goToStep])

  const handleClaim = useCallback(async () => {
    const u = username.trim().toLowerCase()
    if (!u) {
      finish('completed')
      return
    }
    setSavingClaim(true)
    try {
      const body: Record<string, unknown> = { username: u }
      if (makePublic) body.profileVisibility = 'public'
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Failed' }))
        throw new Error(data.error || 'Failed to claim username')
      }
      if (makePublic) track(ANALYTICS_EVENTS.atlasPublished, { source: 'onboarding' })
      toast.success(makePublic ? 'Your atlas is live' : 'Username reserved')
      finish('completed')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to claim username')
    } finally {
      setSavingClaim(false)
    }
  }, [username, makePublic, finish])

  if (!open) return null

  const steps = [
    {
      title: 'Welcome to Konterra',
      description: 'Your people and your places on one globe. Two minutes of setup, or skip and explore.',
      content: (
        <div className="space-y-3 py-3">
          <FeatureRow
            icon={<Globe className="h-4 w-4 text-muted-foreground" />}
            title="Everyone on a globe"
            description="Contacts and trips plotted where they actually are"
          />
          <FeatureRow
            icon={<CalendarRange className="h-4 w-4 text-muted-foreground" />}
            title="Days per country"
            description="How long you have spent everywhere, counted for you"
          />
          <FeatureRow
            icon={<Radar className="h-4 w-4 text-muted-foreground" />}
            title="Crossing paths"
            description="Who you can actually catch on your next trip"
          />
          <FeatureRow
            icon={<Plug className="h-4 w-4 text-muted-foreground" />}
            title="Works with your AI assistant"
            description="Connect Claude or ChatGPT over MCP from Settings"
          />
        </div>
      ),
      footer: (
        <DialogFooter className="flex-row justify-between sm:justify-between">
          <Button variant="ghost" onClick={() => finish('skipped')}>Skip setup</Button>
          <Button onClick={() => goToStep(1)}>
            Get started
            <ArrowRight className="h-4 w-4" />
          </Button>
        </DialogFooter>
      ),
    },
    {
      title: 'Where are you based?',
      description: 'This drops your pin and sets the centre of your globe.',
      content: (
        <div className="space-y-4 py-2">
          <CountrySelect value={country} onChange={setCountry} label="Country *" />
          <div className="space-y-2">
            <Label htmlFor="wizard-city" className="text-sm">City</Label>
            <Input
              id="wizard-city"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="e.g. Lisbon"
              className="h-10 sm:h-9"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm">Timezone</Label>
            <Popover open={tzOpen} onOpenChange={(v) => { setTzOpen(v); if (v) setTimeout(() => tzInputRef.current?.focus(), 0); if (!v) setTzSearch('') }}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="flex h-10 sm:h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 text-sm shadow-xs transition-[color,box-shadow] outline-none hover:bg-accent/50 cursor-pointer"
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
                    className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/40 h-10 sm:h-9 px-2 outline-none"
                  />
                  {tzSearch && (
                    <button type="button" onClick={() => setTzSearch('')} className="text-muted-foreground/50 hover:text-muted-foreground p-1">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                <ScrollArea className="h-[240px] sm:h-[200px]">
                  <div className="p-1">
                    {filteredTz.map(({ tz, label, offset }) => {
                      const selected = timezone === tz
                      return (
                        <button
                          key={tz}
                          type="button"
                          onClick={() => { setTimezone(tz); setTzOpen(false); setTzSearch('') }}
                          className={`flex w-full items-center gap-2 rounded-sm px-2 py-2.5 sm:py-1.5 text-xs cursor-pointer transition-colors ${
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
          <Button variant="ghost" onClick={() => goToStep(0)}>
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => goToStep(2)}>Skip</Button>
            <Button onClick={handleSaveHomeBase} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Continue
              {!saving && <ArrowRight className="h-4 w-4" />}
            </Button>
          </div>
        </DialogFooter>
      ),
    },
    {
      title: 'Fill in your atlas',
      description: 'Mark countries you have been to, or bring in what you already have.',
      content: (
        <div className="space-y-3 py-2">
          <CountrySelect
            value=""
            onChange={(c) => { if (c && !visited.includes(c)) setVisited((v) => [...v, c]) }}
            label="Countries you have visited"
          />
          {visited.length > 0 ? (
            <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto thin-scrollbar">
              {visited.map((c) => (
                <span
                  key={c}
                  className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/40 pl-2 pr-1 py-0.5 text-xs text-foreground"
                >
                  <span>{countryFlag(c)}</span>
                  <span>{c}</span>
                  <button
                    type="button"
                    onClick={() => setVisited((v) => v.filter((x) => x !== c))}
                    className="rounded-full p-0.5 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" />
              Pick a few — they light up on the globe right away.
            </p>
          )}

          <Separator />

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => { finish('completed'); onOpenImport() }}
              className={`${GLASS.control} rounded-lg p-3 text-left ${TRANSITION.color} hover:bg-accent active:scale-[0.98] transition-transform`}
            >
              <Upload className="h-4 w-4 text-primary mb-1.5" />
              <p className="text-xs font-medium text-foreground">Import a file</p>
              <p className="text-[10px] text-muted-foreground">CSV, vCard or JSON</p>
            </button>
            <button
              onClick={() => { finish('completed'); onAddContact() }}
              className={`${GLASS.control} rounded-lg p-3 text-left ${TRANSITION.color} hover:bg-accent active:scale-[0.98] transition-transform`}
            >
              <UserPlus className="h-4 w-4 text-primary mb-1.5" />
              <p className="text-xs font-medium text-foreground">Add someone</p>
              <p className="text-[10px] text-muted-foreground">One contact by hand</p>
            </button>
          </div>
        </div>
      ),
      footer: (
        <DialogFooter className="flex-row justify-between sm:justify-between">
          <Button variant="ghost" onClick={() => goToStep(1)}>
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <Button onClick={handleSaveVisited} disabled={savingVisited}>
            {savingVisited && <Loader2 className="h-4 w-4 animate-spin" />}
            {visited.length > 0 ? 'Save and continue' : 'Skip'}
            {!savingVisited && <ArrowRight className="h-4 w-4" />}
          </Button>
        </DialogFooter>
      ),
    },
    {
      title: 'Claim your atlas',
      description: 'Reserve a link you can share. Publishing is optional and reversible — contacts are never shown.',
      content: (
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="wizard-username" className="text-sm">Username</Label>
            <div className="flex items-center gap-0 rounded-md border border-input bg-transparent focus-within:border-ring">
              <span className="pl-3 text-sm text-muted-foreground font-mono shrink-0">konterra.space/u/</span>
              <input
                id="wizard-username"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase())}
                placeholder="yourname"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                className="flex-1 min-w-0 bg-transparent h-10 sm:h-9 pr-3 pl-0.5 text-sm text-foreground placeholder:text-muted-foreground/40 outline-none font-mono"
              />
            </div>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5">
            <div className="flex items-center gap-2.5">
              <Share2 className="h-4 w-4 text-primary shrink-0" />
              <div>
                <p className="text-sm text-foreground">Publish it now</p>
                <p className="text-[11px] text-muted-foreground">Off by default. Countries only — never your contacts.</p>
              </div>
            </div>
            <Switch checked={makePublic} onCheckedChange={setMakePublic} disabled={!username.trim()} />
          </div>
        </div>
      ),
      footer: (
        <DialogFooter className="flex-row justify-between sm:justify-between">
          <Button variant="ghost" onClick={() => goToStep(2)}>
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <Button onClick={handleClaim} disabled={savingClaim}>
            {savingClaim && <Loader2 className="h-4 w-4 animate-spin" />}
            {username.trim() ? 'Claim and finish' : 'Finish'}
            {!savingClaim && <Check className="h-4 w-4" />}
          </Button>
        </DialogFooter>
      ),
    },
  ]

  const current = steps[step] ?? steps[0]

  return (
    // Closable at every step so nobody is trapped behind a form before they have seen the
    // product — but closing only puts it away until next time.
    <Dialog open={open} onOpenChange={(v) => { if (!v) dismissForNow() }}>
      <DialogContent className="sm:max-w-md max-h-[90dvh] overflow-y-auto" style={{ zIndex: Z.modal }}>
        <DialogHeader>
          <DialogTitle className="k-serif italic text-[1.6rem] leading-tight font-normal text-center sm:text-left">
            {current.title}
          </DialogTitle>
          <DialogDescription className="text-center sm:text-left">{current.description}</DialogDescription>
        </DialogHeader>
        {current.content}
        <StepDots current={step} total={TOTAL_STEPS} />
        {current.footer}
      </DialogContent>
    </Dialog>
  )
}
