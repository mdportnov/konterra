'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import {
  Globe, MapPin, UserPlus, Upload, LayoutDashboard, Settings, ArrowRight, ArrowLeft, Loader2, Check,
} from 'lucide-react'
import { toast } from 'sonner'
import { GLASS, Z, TRANSITION } from '@/lib/constants/ui'

const STORAGE_KEY = 'konterra-onboarded'

const TIMEZONES = Intl.supportedValuesOf('timeZone')

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
            <Label htmlFor="wizard-timezone" className="text-sm">Timezone</Label>
            <Select value={timezone} onValueChange={setTimezone}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select timezone" />
              </SelectTrigger>
              <SelectContent position="popper" className="max-h-60">
                {TIMEZONES.map((tz) => (
                  <SelectItem key={tz} value={tz}>{tz.replace(/_/g, ' ')}</SelectItem>
                ))}
              </SelectContent>
            </Select>
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
