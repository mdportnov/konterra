'use client'

import { useState, useEffect, useMemo } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { DatePickerField } from '@/components/globe/contact-edit'
import { toast } from 'sonner'
import type { Trip } from '@/lib/db/schema'

interface TripEditDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  trip?: Trip | null
  prefill?: { arrivalDate?: string; departureDate?: string; city?: string; country?: string }
  trips: Trip[]
  onSaved: () => void
}

function toDateStr(d: Date | string | null | undefined): string {
  if (!d) return ''
  const date = typeof d === 'string' ? new Date(d) : d
  if (isNaN(date.getTime())) return ''
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function diffDays(a: string, b: string): number | null {
  if (!a || !b) return null
  const da = new Date(a + 'T00:00:00')
  const db = new Date(b + 'T00:00:00')
  if (isNaN(da.getTime()) || isNaN(db.getTime())) return null
  return Math.round((db.getTime() - da.getTime()) / 86400000)
}

export default function TripEditDialog({ open, onOpenChange, trip, prefill, trips, onSaved }: TripEditDialogProps) {
  const isEdit = !!trip
  const [city, setCity] = useState('')
  const [country, setCountry] = useState('')
  const [arrivalDate, setArrivalDate] = useState('')
  const [departureDate, setDepartureDate] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    if (trip) {
      setCity(trip.city)
      setCountry(trip.country)
      setArrivalDate(toDateStr(trip.arrivalDate))
      setDepartureDate(toDateStr(trip.departureDate))
      setNotes(trip.notes || '')
    } else {
      setCity(prefill?.city || '')
      setCountry(prefill?.country || '')
      setArrivalDate(prefill?.arrivalDate || '')
      setDepartureDate(prefill?.departureDate || '')
      setNotes('')
    }
  }, [open, trip, prefill])

  const duration = useMemo(() => diffDays(arrivalDate, departureDate), [arrivalDate, departureDate])

  const dateError = useMemo(() => {
    if (arrivalDate && departureDate && duration !== null && duration < 0) {
      return 'Departure must be on or after arrival'
    }
    return null
  }, [arrivalDate, departureDate, duration])

  const overlapWarning = useMemo(() => {
    if (!arrivalDate) return null
    const aStart = new Date(arrivalDate + 'T00:00:00').getTime()
    const aEnd = departureDate ? new Date(departureDate + 'T00:00:00').getTime() : aStart
    for (const t of trips) {
      if (trip && t.id === trip.id) continue
      const tStart = new Date(t.arrivalDate).getTime()
      const tEnd = t.departureDate ? new Date(t.departureDate).getTime() : tStart
      if (aStart <= tEnd && aEnd >= tStart) {
        return `Overlaps with ${t.city} (${toDateStr(t.arrivalDate)})`
      }
    }
    return null
  }, [arrivalDate, departureDate, trips, trip])

  const canSave = city.trim() && country.trim() && arrivalDate && !dateError && !saving

  async function handleSave() {
    if (!canSave) return
    setSaving(true)
    try {
      const payload: Record<string, unknown> = {
        city: city.trim(),
        country: country.trim(),
        arrivalDate,
        departureDate: departureDate || null,
        durationDays: duration != null && duration >= 0 ? duration : null,
        notes: notes.trim() || null,
      }

      const url = isEdit ? `/api/trips/${trip!.id}` : '/api/trips'
      const method = isEdit ? 'PUT' : 'POST'
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to save trip')
      }
      toast.success(isEdit ? 'Trip updated' : 'Trip added')
      onOpenChange(false)
      onSaved()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save trip')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit trip' : 'Add trip'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">City *</Label>
              <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Berlin" className="h-8 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Country *</Label>
              <Input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="Germany" className="h-8 text-sm" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <DatePickerField label="Arrival *" value={arrivalDate} onChange={setArrivalDate} />
            <DatePickerField label="Departure" value={departureDate} onChange={setDepartureDate} />
          </div>
          {dateError && <p className="text-[10px] text-destructive">{dateError}</p>}
          {overlapWarning && <p className="text-[10px] text-amber-500">{overlapWarning}</p>}
          {duration != null && duration >= 0 && (
            <p className="text-[10px] text-muted-foreground">{duration} day{duration !== 1 ? 's' : ''}</p>
          )}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Notes</Label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="flex w-full rounded-md border border-input bg-muted/50 px-3 py-2 text-sm placeholder:text-muted-foreground/40 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
              placeholder="Optional notes..."
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} size="sm">Cancel</Button>
          <Button onClick={handleSave} disabled={!canSave} size="sm">
            {saving ? 'Saving...' : isEdit ? 'Save' : 'Add trip'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
