'use client'

import { useMemo } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle, Clock } from 'lucide-react'
import { staleContacts, overdueFollowUps } from '@/lib/metrics'
import type { Contact } from '@/lib/db/schema'

interface ReconnectAlertsProps {
  contacts: Contact[]
  onContactClick: (contact: Contact) => void
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

export default function ReconnectAlerts({ contacts, onContactClick }: ReconnectAlertsProps) {
  const stale = useMemo(() => staleContacts(contacts, 90).slice(0, 8), [contacts])
  const overdue = useMemo(() => overdueFollowUps(contacts), [contacts])

  if (stale.length === 0 && overdue.length === 0) return null

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Reconnect</span>
        {(stale.length + overdue.length) > 0 && (
          <Badge className="bg-amber-500/20 text-amber-600 dark:text-amber-300 border-amber-500/30 text-[10px] px-1.5 py-0">
            {stale.length + overdue.length}
          </Badge>
        )}
      </div>

      <div className="space-y-1">
        {overdue.map((c) => {
          const initials = c.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
          return (
            <button
              key={`overdue-${c.id}`}
              onClick={() => onContactClick(c)}
              className="w-full text-left flex items-center gap-2.5 p-2 rounded-lg border border-red-500/30 bg-red-500/5 hover:bg-red-500/10 transition-colors"
            >
              <Avatar className="h-7 w-7 shrink-0">
                <AvatarImage src={c.photo || undefined} />
                <AvatarFallback className="text-[10px] bg-muted text-muted-foreground">{initials}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground truncate">{c.name}</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Clock className="h-3 w-3 text-red-400" />
                <span className="text-[10px] text-red-400">Follow-up overdue</span>
              </div>
            </button>
          )
        })}

        {stale.filter((c) => !overdue.some((o) => o.id === c.id)).map((c) => {
          const initials = c.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
          const days = daysSince(c.lastContactedAt)

          return (
            <button
              key={`stale-${c.id}`}
              onClick={() => onContactClick(c)}
              className={`w-full text-left flex items-center gap-2.5 p-2 rounded-lg border transition-colors hover:bg-muted/50 ${urgencyClass(days)}`}
            >
              <div className="relative">
                <Avatar className="h-7 w-7 shrink-0">
                  <AvatarImage src={c.photo || undefined} />
                  <AvatarFallback className="text-[10px] bg-muted text-muted-foreground">{initials}</AvatarFallback>
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
          )
        })}
      </div>
    </div>
  )
}
