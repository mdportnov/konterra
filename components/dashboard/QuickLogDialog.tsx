'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Loader2, UserPlus, Check, Zap } from 'lucide-react'
import { toast } from 'sonner'
import { Z } from '@/lib/constants/ui'
import { getInitials } from '@/lib/format'
import { countryFlag } from '@/lib/country-flags'
import { ANALYTICS_EVENTS, track, trackOnce } from '@/lib/analytics'
import type { Contact, Trip } from '@/lib/db/schema'

interface QuickLogDialogProps {
  open: boolean
  contacts: Contact[]
  trips?: Trip[]
  onClose: () => void
  onLogged?: () => void
}

/** Where the user most plausibly is right now, used to prefill the location. */
function currentLocation(trips: Trip[] | undefined): string {
  if (!trips?.length) return ''
  const now = Date.now()
  const ongoing = trips.find((t) => {
    const arrival = new Date(t.arrivalDate).getTime()
    const departure = t.departureDate ? new Date(t.departureDate).getTime() : Infinity
    return arrival <= now && now <= departure
  })
  if (!ongoing) return ''
  return [ongoing.city, ongoing.country].filter(Boolean).join(', ')
}

export default function QuickLogDialog({ open, contacts, trips, onClose, onLogged }: QuickLogDialogProps) {
  const [name, setName] = useState('')
  const [selected, setSelected] = useState<Contact | null>(null)
  const [location, setLocation] = useState('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const nameRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setName('')
      setSelected(null)
      setNote('')
      setLocation(currentLocation(trips))
      setTimeout(() => nameRef.current?.focus(), 50)
    }
  }, [open, trips])

  const suggestions = useMemo(() => {
    const query = name.trim().toLowerCase()
    if (!query || selected) return []
    return contacts
      .filter((c) => !c.isSelf && c.name.toLowerCase().includes(query))
      .slice(0, 4)
  }, [name, contacts, selected])

  const exactMatch = useMemo(
    () => contacts.find((c) => !c.isSelf && c.name.trim().toLowerCase() === name.trim().toLowerCase()) ?? null,
    [contacts, name],
  )

  const handleSave = useCallback(async () => {
    const trimmedName = name.trim()
    if (!selected && !trimmedName) {
      toast.error('Who did you meet?')
      return
    }

    setSaving(true)
    try {
      let contact = selected ?? exactMatch

      // Someone met for the first time should not require a detour through the full
      // contact form — that friction is exactly why meetings never get logged.
      if (!contact) {
        const [city, country] = location.split(',').map((s) => s.trim())
        const res = await fetch('/api/contacts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: trimmedName,
            city: country ? city || null : null,
            country: country || city || null,
            metAt: location.trim() || null,
            metDate: new Date().toISOString(),
          }),
        })
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data.error || 'Failed to create the contact')
        }
        contact = await res.json()
        trackOnce(ANALYTICS_EVENTS.firstContactCreated, { source: 'quick_log' })
        track(ANALYTICS_EVENTS.contactCreated, { source: 'quick_log' })
      }

      const interactionRes = await fetch(`/api/contacts/${contact!.id}/interactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'meeting',
          date: new Date().toISOString(),
          location: location.trim() || null,
          notes: note.trim() || null,
        }),
      })
      if (!interactionRes.ok) {
        const data = await interactionRes.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to log the meeting')
      }

      track(ANALYTICS_EVENTS.quickLogUsed, { newContact: !selected && !exactMatch })
      track(ANALYTICS_EVENTS.interactionLogged, { type: 'meeting', source: 'quick_log' })
      toast.success(`Logged a meeting with ${contact!.name}`)
      onLogged?.()
      onClose()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to log')
    } finally {
      setSaving(false)
    }
  }, [name, selected, exactMatch, location, note, onClose, onLogged])

  const target = selected ?? exactMatch

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="sm:max-w-sm" style={{ zIndex: Z.modal }}>
        <DialogHeader>
          <DialogTitle className="k-serif italic text-[1.4rem] font-normal flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" />
            Just met someone
          </DialogTitle>
          <DialogDescription>
            Name is all you need. Everything else can wait.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-1">
          <div className="space-y-1.5">
            <Input
              ref={nameRef}
              value={selected ? selected.name : name}
              onChange={(e) => { setName(e.target.value); setSelected(null) }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSave()
                }
              }}
              placeholder="Name"
              className="h-11 text-base"
              autoCapitalize="words"
            />

            {suggestions.length > 0 && (
              <div className="space-y-0.5">
                {suggestions.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => { setSelected(c); setName(c.name) }}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-accent/50"
                  >
                    <Avatar className="h-6 w-6 shrink-0">
                      {c.photo && <AvatarImage src={c.photo} alt={c.name} />}
                      <AvatarFallback className="text-[9px]">{getInitials(c.name)}</AvatarFallback>
                    </Avatar>
                    <span className="min-w-0 flex-1 truncate text-xs text-foreground">{c.name}</span>
                    {c.country && (
                      <span className="shrink-0 text-[10px] text-muted-foreground">
                        {countryFlag(c.country)} {c.country}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}

            {target ? (
              <p className="flex items-center gap-1 text-[11px] text-emerald-500">
                <Check className="h-3 w-3" />
                Logging against {target.name}
              </p>
            ) : name.trim() ? (
              <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <UserPlus className="h-3 w-3" />
                New contact will be created
              </p>
            ) : null}
          </div>

          <Input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Where? (City, Country)"
            className="h-10 text-sm"
          />

          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="What was it about?"
            className="min-h-[72px] text-sm"
          />
        </div>

        <DialogFooter className="flex-row gap-2">
          <Button variant="ghost" onClick={onClose} disabled={saving} className="flex-1 sm:flex-none">
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || (!name.trim() && !selected)} className="flex-1 sm:flex-none">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Log it
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
