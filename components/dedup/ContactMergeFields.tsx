'use client'

import { Check } from 'lucide-react'
import type { Contact } from '@/lib/db/schema'

interface ContactMergeFieldsProps {
  contactA: Contact
  contactB: Contact
  winnerId: string
  overrides: Record<string, string>
  onOverrideChange: (field: string, contactId: string) => void
}

const fieldLabels: Record<string, string> = {
  name: 'Name',
  email: 'Email',
  phone: 'Phone',
  company: 'Company',
  role: 'Role',
  city: 'City',
  country: 'Country',
  website: 'Website',
  notes: 'Notes',
  linkedin: 'LinkedIn',
  twitter: 'Twitter',
  telegram: 'Telegram',
  instagram: 'Instagram',
  github: 'GitHub',
  timezone: 'Timezone',
}

function getVal(contact: Contact, field: string): string | undefined {
  const v = (contact as Record<string, unknown>)[field]
  if (v === null || v === undefined) return undefined
  if (v instanceof Date) return v.toISOString().split('T')[0]
  return String(v)
}

export default function ContactMergeFields({ contactA, contactB, winnerId, overrides, onOverrideChange }: ContactMergeFieldsProps) {
  const loserId = winnerId === contactA.id ? contactB.id : contactA.id
  const winner = winnerId === contactA.id ? contactA : contactB
  const loser = winnerId === contactA.id ? contactB : contactA

  const fields = Object.keys(fieldLabels).filter((f) => {
    const valA = getVal(winner, f)
    const valB = getVal(loser, f)
    return valA && valB && valA !== valB
  })

  if (fields.length === 0) {
    return <p className="text-sm text-muted-foreground py-2">No conflicting fields</p>
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground uppercase font-medium tracking-wide">
        Resolve {fields.length} conflicting field{fields.length > 1 ? 's' : ''}
      </p>
      <div className="space-y-2">
        {fields.map((field) => {
          const winnerVal = getVal(winner, field)!
          const loserVal = getVal(loser, field)!
          const selected = overrides[field] || winnerId

          return (
            <div key={field} className="rounded-lg border border-border overflow-hidden">
              <div className="px-3 py-1.5 bg-muted/50 border-b border-border">
                <p className="text-xs font-medium text-muted-foreground">{fieldLabels[field]}</p>
              </div>
              <div className="grid grid-cols-2 gap-0">
                <button
                  onClick={() => onOverrideChange(field, winnerId)}
                  className={`relative p-3 text-left transition-colors duration-150 border-r border-border ${
                    selected === winnerId
                      ? 'bg-accent/60'
                      : 'hover:bg-muted/30'
                  }`}
                >
                  <span className="block text-[10px] text-muted-foreground uppercase mb-0.5 truncate">{winner.name}</span>
                  <span className="block text-sm truncate">{winnerVal}</span>
                  {selected === winnerId && (
                    <Check className="absolute top-2.5 right-2.5 h-3.5 w-3.5 text-foreground/60" />
                  )}
                </button>
                <button
                  onClick={() => onOverrideChange(field, loserId)}
                  className={`relative p-3 text-left transition-colors duration-150 ${
                    selected === loserId
                      ? 'bg-accent/60'
                      : 'hover:bg-muted/30'
                  }`}
                >
                  <span className="block text-[10px] text-muted-foreground uppercase mb-0.5 truncate">{loser.name}</span>
                  <span className="block text-sm truncate">{loserVal}</span>
                  {selected === loserId && (
                    <Check className="absolute top-2.5 right-2.5 h-3.5 w-3.5 text-foreground/60" />
                  )}
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
