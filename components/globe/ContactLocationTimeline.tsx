'use client'

import { useCallback, useEffect, useState } from 'react'
import { Navigation, Plus, Loader2, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { countryFlag } from '@/lib/country-flags'
import { CountrySelect } from '@/components/globe/contact-edit/CountrySelect'
import type { ContactLocationHistoryEntry } from '@/lib/db/schema'

interface ContactLocationTimelineProps {
  contactId: string
  currentCity: string | null
  currentCountry: string | null
  currentLocationUpdatedAt: Date | string | null
  onUpdated?: () => void
}

function formatDate(value: Date | string | null): string {
  if (!value) return ''
  const d = value instanceof Date ? value : new Date(value)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

function staleness(value: Date | string | null): string | null {
  if (!value) return null
  const d = value instanceof Date ? value : new Date(value)
  if (isNaN(d.getTime())) return null
  const days = Math.floor((Date.now() - d.getTime()) / 86_400_000)
  if (days <= 1) return 'today'
  if (days < 30) return `${days}d ago`
  if (days < 365) return `${Math.floor(days / 30)}mo ago`
  return `${Math.floor(days / 365)}y ago`
}

export default function ContactLocationTimeline({
  contactId,
  currentCity,
  currentCountry,
  currentLocationUpdatedAt,
  onUpdated,
}: ContactLocationTimelineProps) {
  const [history, setHistory] = useState<ContactLocationHistoryEntry[] | null>(null)
  const [adding, setAdding] = useState(false)
  const [saving, setSaving] = useState(false)
  const [country, setCountry] = useState('')
  const [city, setCity] = useState('')
  const [observedAt, setObservedAt] = useState(() => new Date().toISOString().slice(0, 10))

  // History only ever exists alongside a current location, so a contact without one has
  // nothing to fetch — otherwise every contact you open costs a round trip for an empty
  // list.
  const hasHistory = Boolean(currentCountry)

  useEffect(() => {
    if (!hasHistory) {
      setHistory([])
      return
    }
    const controller = new AbortController()
    const load = async () => {
      setHistory(null)
      try {
        const res = await fetch(`/api/contacts/${contactId}/locations`, { signal: controller.signal })
        const data = res.ok ? await res.json() : []
        if (Array.isArray(data)) setHistory(data)
      } catch {
        if (!controller.signal.aborted) setHistory([])
      }
    }
    load()
    return () => controller.abort()
  }, [contactId, hasHistory])

  const handleAdd = useCallback(async () => {
    if (!country.trim()) {
      toast.error('Country is required')
      return
    }
    setSaving(true)
    try {
      const res = await fetch(`/api/contacts/${contactId}/locations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          country: country.trim(),
          city: city.trim() || null,
          observedAt: new Date(`${observedAt}T12:00:00Z`).toISOString(),
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to record location')
      }
      const refreshed = await fetch(`/api/contacts/${contactId}/locations`).then((r) => (r.ok ? r.json() : []))
      if (Array.isArray(refreshed)) setHistory(refreshed)
      setAdding(false)
      setCountry('')
      setCity('')
      toast.success('Location recorded')
      onUpdated?.()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to record location')
    } finally {
      setSaving(false)
    }
  }, [contactId, country, city, observedAt, onUpdated])

  const stale = staleness(currentLocationUpdatedAt)

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Navigation className="h-3.5 w-3.5 text-emerald-500/70" />
          <span className="meta-label">Where they are</span>
        </div>
        {!adding && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setAdding(true)}
            className="h-6 px-2 text-[10px] text-muted-foreground hover:text-foreground"
          >
            <Plus className="h-3 w-3" />
            Record
          </Button>
        )}
      </div>

      {currentCountry ? (
        <div className="flex items-center gap-2 text-sm text-foreground">
          <span>{countryFlag(currentCountry)}</span>
          <span>{[currentCity, currentCountry].filter(Boolean).join(', ')}</span>
          {stale && (
            <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground/60">
              <Clock className="h-2.5 w-2.5" />
              {stale}
            </span>
          )}
        </div>
      ) : (
        !adding && (
          <p className="text-[11px] text-muted-foreground/60">
            Not tracked — record where they are and they will show up in crossing paths.
          </p>
        )
      )}

      {adding && (
        <div className="space-y-2 rounded-lg border border-border bg-muted/20 p-2.5">
          <CountrySelect value={country} onChange={setCountry} label="Country" />
          <Input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="City (optional)"
            className="h-8 text-xs"
          />
          <Input
            type="date"
            value={observedAt}
            max={new Date().toISOString().slice(0, 10)}
            onChange={(e) => setObservedAt(e.target.value)}
            className="h-8 text-xs"
          />
          <div className="flex gap-2">
            <Button size="sm" className="h-7 flex-1 text-[11px]" onClick={handleAdd} disabled={saving || !country.trim()}>
              {saving && <Loader2 className="h-3 w-3 animate-spin" />}
              Save
            </Button>
            <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => setAdding(false)} disabled={saving}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {history === null ? (
        <Skeleton className="h-4 w-32" />
      ) : history.length > 1 ? (
        <div className="space-y-1 pt-1">
          {history.slice(0, 6).map((entry) => (
            <div key={entry.id} className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <span className="h-1 w-1 rounded-full bg-muted-foreground/40 shrink-0" />
              <span className="text-foreground/80">
                {countryFlag(entry.country ?? '')} {[entry.city, entry.country].filter(Boolean).join(', ')}
              </span>
              <span className="ml-auto text-muted-foreground/50">{formatDate(entry.observedAt)}</span>
            </div>
          ))}
          {history.length > 6 && (
            <p className="text-[10px] text-muted-foreground/50 pl-3">+{history.length - 6} earlier</p>
          )}
        </div>
      ) : null}
    </div>
  )
}
