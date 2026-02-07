'use client'

import { useMemo } from 'react'
import { Gift } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { GLASS } from '@/lib/constants/ui'
import type { Favor, Contact } from '@/lib/db/schema'

interface FavorLedgerProps {
  favors: Favor[]
  contacts: Contact[]
  onContactClick: (contact: Contact) => void
  loading?: boolean
}

export default function FavorLedger({ favors, contacts, onContactClick, loading }: FavorLedgerProps) {
  const ledger = useMemo(() => {
    const contactMap = new Map(contacts.map((c) => [c.id, c]))
    const balances = new Map<string, { given: number; received: number }>()

    for (const f of favors) {
      const entry = balances.get(f.contactId) || { given: 0, received: 0 }
      if (f.direction === 'given') entry.given++
      else entry.received++
      balances.set(f.contactId, entry)
    }

    return Array.from(balances.entries())
      .map(([contactId, balance]) => ({
        contact: contactMap.get(contactId),
        ...balance,
        net: balance.given - balance.received,
      }))
      .filter((e) => e.contact)
      .sort((a, b) => Math.abs(b.net) - Math.abs(a.net) || a.contact!.name.localeCompare(b.contact!.name))
      .slice(0, 6)
  }, [favors, contacts])

  if (loading) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Gift className="h-3.5 w-3.5 text-purple-400" />
          <Skeleton className="h-3.5 w-24" />
        </div>
        <div className={`${GLASS.control} rounded-xl p-3 space-y-1.5`}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-2 py-1 px-1">
              <Skeleton className="h-3.5 w-24 flex-1" />
              <Skeleton className="h-3 w-6" />
              <Skeleton className="h-3 w-6" />
              <Skeleton className="h-3 w-7" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Gift className="h-3.5 w-3.5 text-purple-400" />
        <span className="text-xs font-medium text-muted-foreground/60 uppercase tracking-wider">Favor Balance</span>
      </div>
      {ledger.length === 0 ? (
        <p className="text-[11px] text-muted-foreground/40 py-1">No favors recorded yet</p>
      ) : (
      <div className={`${GLASS.control} rounded-xl p-3 space-y-1.5`}>
        {ledger.map((entry) => (
          <button
            key={entry.contact!.id}
            onClick={() => onContactClick(entry.contact!)}
            className="w-full flex items-center gap-2 py-1 hover:bg-muted/50 rounded px-1 transition-colors"
          >
            <span className="text-xs text-foreground font-medium truncate flex-1 text-left">{entry.contact!.name}</span>
            <span className="text-[10px] text-green-500">+{entry.given}</span>
            <span className="text-[10px] text-red-400">-{entry.received}</span>
            <span className={`text-[10px] font-medium min-w-[28px] text-right ${
              entry.net > 0 ? 'text-green-500' : entry.net < 0 ? 'text-red-400' : 'text-muted-foreground'
            }`}>
              {entry.net >= 0 ? '+' : ''}{entry.net}
            </span>
          </button>
        ))}
      </div>
      )}
    </div>
  )
}
