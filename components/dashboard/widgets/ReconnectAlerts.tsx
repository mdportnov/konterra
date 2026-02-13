'use client'

import { useMemo, useState, useCallback } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { AlertTriangle, Clock, Cake, MessageSquare, X, AlarmClockOff, Check } from 'lucide-react'
import { toast } from 'sonner'
import { staleContacts, overdueFollowUps, upcomingBirthdays } from '@/lib/metrics'
import type { Contact } from '@/lib/db/schema'

const INTERACTION_TYPES = ['meeting', 'call', 'message', 'email', 'event', 'introduction', 'deal', 'note'] as const

interface ReconnectAlertsProps {
  contacts: Contact[]
  onContactClick: (contact: Contact) => void
  onInteractionLogged?: (contactId: string) => void
  onContactUpdated?: (contactId: string) => void
  loading?: boolean
}

function daysSince(date: Date | string | null | undefined): number {
  if (!date) return Infinity
  const d = date instanceof Date ? date : new Date(date)
  return Math.floor((Date.now() - d.getTime()) / 86400000)
}

function urgencyClass(days: number): string {
  if (days > 180) return 'border-red-500/30 bg-red-500/5'
  if (days > 90) return 'border-amber-500/30 bg-amber-500/5'
  return 'border-border bg-muted/50'
}

function urgencyDot(days: number): string {
  if (days > 180) return 'bg-red-400'
  if (days > 90) return 'bg-amber-400'
  return 'bg-muted-foreground/30'
}

function daysUntilBirthday(birthday: Date | string): number {
  const bd = birthday instanceof Date ? birthday : new Date(birthday)
  const now = new Date()
  const thisYear = new Date(now.getFullYear(), bd.getMonth(), bd.getDate())
  if (thisYear < now) thisYear.setFullYear(thisYear.getFullYear() + 1)
  return Math.ceil((thisYear.getTime() - now.getTime()) / 86400000)
}

export default function ReconnectAlerts({ contacts, onContactClick, onInteractionLogged, onContactUpdated, loading }: ReconnectAlertsProps) {
  const stale = useMemo(() => staleContacts(contacts, 90).slice(0, 8), [contacts])
  const overdue = useMemo(() => overdueFollowUps(contacts), [contacts])
  const birthdays = useMemo(() => upcomingBirthdays(contacts, 7), [contacts])
  const [quickAdd, setQuickAdd] = useState<string | null>(null)
  const [quickForm, setQuickForm] = useState({ type: 'call', notes: '', date: new Date().toISOString().slice(0, 10) })
  const [saving, setSaving] = useState(false)
  const [pendingDone, setPendingDone] = useState<string | null>(null)

  const handleQuickLog = useCallback(async (contactId: string, clearFollowUp?: boolean) => {
    setSaving(true)
    try {
      const res = await fetch(`/api/contacts/${contactId}/interactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...quickForm, date: new Date(quickForm.date + 'T12:00:00').toISOString() }),
      })
      if (res.ok) {
        if (clearFollowUp) {
          await fetch(`/api/contacts/${contactId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nextFollowUp: null }),
          })
          onContactUpdated?.(contactId)
        }
        toast.success('Interaction logged')
        setQuickAdd(null)
        setPendingDone(null)
        setQuickForm({ type: 'call', notes: '', date: new Date().toISOString().slice(0, 10) })
        onInteractionLogged?.(contactId)
      }
    } catch {
      toast.error('Failed to log interaction')
    } finally {
      setSaving(false)
    }
  }, [quickForm, onInteractionLogged, onContactUpdated])

  const handleSnooze = useCallback(async (contactId: string) => {
    try {
      const snoozed = new Date()
      snoozed.setDate(snoozed.getDate() + 7)
      const res = await fetch(`/api/contacts/${contactId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nextFollowUp: snoozed.toISOString() }),
      })
      if (res.ok) {
        toast.success('Follow-up snoozed 7 days')
        onContactUpdated?.(contactId)
      }
    } catch {
      toast.error('Failed to snooze follow-up')
    }
  }, [onContactUpdated])

  const total = stale.length + overdue.length + birthdays.length

  if (loading) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
          <Skeleton className="h-3.5 w-20" />
        </div>
        <div className="space-y-1">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-2.5 p-2 rounded-lg border border-border">
              <Skeleton className="h-7 w-7 rounded-full shrink-0" />
              <Skeleton className="h-3.5 w-24 flex-1" />
              <Skeleton className="h-3 w-14 shrink-0" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Reconnect</span>
        {total > 0 && (
          <Badge className="bg-amber-500/20 text-amber-600 dark:text-amber-300 border-amber-500/30 text-[10px] px-1.5 py-0">
            {total}
          </Badge>
        )}
      </div>

      {total === 0 ? (
        <p className="text-[11px] text-muted-foreground/40 py-1">All caught up</p>
      ) : (
      <div className="space-y-1">
        {birthdays.map((c) => {
          const initials = c.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
          const days = daysUntilBirthday(c.birthday!)
          return (
            <button
              key={`bday-${c.id}`}
              onClick={() => onContactClick(c)}
              className="w-full text-left flex items-center gap-2.5 p-2 rounded-lg border border-pink-500/30 bg-pink-500/5 hover:bg-pink-500/10 transition-colors"
            >
              <Avatar className="h-7 w-7 shrink-0">
                <AvatarImage src={c.photo || undefined} />
                <AvatarFallback className="text-[10px] bg-muted text-muted-foreground">{initials}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground truncate">{c.name}</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Cake className="h-3 w-3 text-pink-400" />
                <span className="text-[10px] text-pink-400">{days === 0 ? 'Today!' : `in ${days}d`}</span>
              </div>
            </button>
          )
        })}

        {overdue.map((c) => {
          const ini = c.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
          return (
            <div key={`overdue-${c.id}`} className="space-y-0">
              <div className="flex items-center gap-2.5 p-2 rounded-lg border border-red-500/30 bg-red-500/5 hover:bg-red-500/10 transition-colors group">
                <button onClick={() => onContactClick(c)} className="flex items-center gap-2.5 flex-1 min-w-0 text-left cursor-pointer">
                  <Avatar className="h-7 w-7 shrink-0">
                    <AvatarImage src={c.photo || undefined} />
                    <AvatarFallback className="text-[10px] bg-muted text-muted-foreground">{ini}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">{c.name}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Clock className="h-3 w-3 text-red-400" />
                    <span className="text-[10px] text-red-400">Follow-up overdue</span>
                  </div>
                </button>
                <button
                  onClick={() => handleSnooze(c.id)}
                  className="opacity-0 group-hover:opacity-100 text-muted-foreground/40 hover:text-amber-500 transition-all shrink-0 cursor-pointer"
                  title="Snooze 7d"
                >
                  <AlarmClockOff className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => { setPendingDone(c.id); setQuickAdd(quickAdd === c.id ? null : c.id) }}
                  className="opacity-0 group-hover:opacity-100 text-muted-foreground/40 hover:text-green-500 transition-all shrink-0 cursor-pointer"
                  title="Done"
                >
                  <Check className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => { setPendingDone(null); setQuickAdd(quickAdd === c.id ? null : c.id) }}
                  className="opacity-0 group-hover:opacity-100 text-muted-foreground/40 hover:text-orange-500 transition-all shrink-0 cursor-pointer"
                  title="Log interaction"
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                </button>
              </div>
              {quickAdd === c.id && (
                <div className="ml-9 mr-1 mb-1 p-2 rounded-b-lg bg-accent/50 border border-t-0 border-border space-y-1.5">
                  <div className="flex items-center gap-1">
                    <select value={quickForm.type} onChange={(e) => setQuickForm((p) => ({ ...p, type: e.target.value }))} className="h-6 text-[10px] rounded border border-input bg-muted/50 px-1 text-foreground cursor-pointer">
                      {INTERACTION_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <input type="date" value={quickForm.date} max={new Date().toISOString().slice(0, 10)} onChange={(e) => setQuickForm((p) => ({ ...p, date: e.target.value }))} className="h-6 text-[10px] rounded border border-input bg-muted/50 px-1 text-foreground" />
                    <button onClick={() => { setQuickAdd(null); setPendingDone(null) }} className="ml-auto text-muted-foreground/40 hover:text-foreground cursor-pointer"><X className="h-3 w-3" /></button>
                  </div>
                  <Input value={quickForm.notes} onChange={(e) => setQuickForm((p) => ({ ...p, notes: e.target.value }))} placeholder="Notes (optional)..." className="h-6 text-[10px] bg-muted/50" />
                  <Button size="sm" className="h-6 text-[10px] w-full bg-orange-500 hover:bg-orange-600 text-white" disabled={saving} onClick={() => handleQuickLog(c.id, pendingDone === c.id)}>
                    {saving ? 'Saving...' : pendingDone === c.id ? 'Log & clear follow-up' : 'Log interaction'}
                  </Button>
                </div>
              )}
            </div>
          )
        })}

        {stale.filter((c) => !overdue.some((o) => o.id === c.id)).map((c) => {
          const ini = c.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
          const days = daysSince(c.lastContactedAt)

          return (
            <div key={`stale-${c.id}`} className="space-y-0">
              <div className={`flex items-center gap-2.5 p-2 rounded-lg border transition-colors hover:bg-muted/50 ${urgencyClass(days)} group`}>
                <button onClick={() => onContactClick(c)} className="flex items-center gap-2.5 flex-1 min-w-0 text-left cursor-pointer">
                  <div className="relative">
                    <Avatar className="h-7 w-7 shrink-0">
                      <AvatarImage src={c.photo || undefined} />
                      <AvatarFallback className="text-[10px] bg-muted text-muted-foreground">{ini}</AvatarFallback>
                    </Avatar>
                    <div className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full ${urgencyDot(days)}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">{c.name}</p>
                  </div>
                  <span className="text-[10px] text-muted-foreground shrink-0">
                    {days === Infinity ? 'Never' : `${days}d ago`}
                  </span>
                </button>
                <button
                  onClick={() => setQuickAdd(quickAdd === c.id ? null : c.id)}
                  className="opacity-0 group-hover:opacity-100 text-muted-foreground/40 hover:text-orange-500 transition-all shrink-0 cursor-pointer"
                  title="Log interaction"
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                </button>
              </div>
              {quickAdd === c.id && (
                <div className="ml-9 mr-1 mb-1 p-2 rounded-b-lg bg-accent/50 border border-t-0 border-border space-y-1.5">
                  <div className="flex items-center gap-1">
                    <select value={quickForm.type} onChange={(e) => setQuickForm((p) => ({ ...p, type: e.target.value }))} className="h-6 text-[10px] rounded border border-input bg-muted/50 px-1 text-foreground cursor-pointer">
                      {INTERACTION_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <input type="date" value={quickForm.date} max={new Date().toISOString().slice(0, 10)} onChange={(e) => setQuickForm((p) => ({ ...p, date: e.target.value }))} className="h-6 text-[10px] rounded border border-input bg-muted/50 px-1 text-foreground" />
                    <button onClick={() => setQuickAdd(null)} className="ml-auto text-muted-foreground/40 hover:text-foreground cursor-pointer"><X className="h-3 w-3" /></button>
                  </div>
                  <Input value={quickForm.notes} onChange={(e) => setQuickForm((p) => ({ ...p, notes: e.target.value }))} placeholder="Notes (optional)..." className="h-6 text-[10px] bg-muted/50" />
                  <Button size="sm" className="h-6 text-[10px] w-full bg-orange-500 hover:bg-orange-600 text-white" disabled={saving} onClick={() => handleQuickLog(c.id)}>
                    {saving ? 'Saving...' : 'Log interaction'}
                  </Button>
                </div>
              )}
            </div>
          )
        })}
      </div>
      )}
    </div>
  )
}
