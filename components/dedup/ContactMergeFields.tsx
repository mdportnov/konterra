'use client'

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
    return <p className="text-xs text-muted-foreground pl-4">No conflicting fields</p>
  }

  return (
    <div className="space-y-2 pl-4 border-l-2 border-border">
      {fields.map((field) => {
        const winnerVal = getVal(winner, field)!
        const loserVal = getVal(loser, field)!
        const selected = overrides[field] || winnerId

        return (
          <div key={field} className="text-xs space-y-1">
            <p className="font-medium text-muted-foreground">{fieldLabels[field]}</p>
            <div className="flex gap-2">
              <button
                onClick={() => onOverrideChange(field, winnerId)}
                className={`flex-1 p-1.5 rounded border text-left truncate transition-all duration-150 ${
                  selected === winnerId
                    ? 'border-foreground/30 bg-accent text-foreground scale-[1.02]'
                    : 'border-border text-muted-foreground hover:border-foreground/20 scale-100'
                }`}
              >
                <span className="block text-[10px] text-muted-foreground/60 uppercase truncate">{winner.name}</span>
                {winnerVal}
              </button>
              <button
                onClick={() => onOverrideChange(field, loserId)}
                className={`flex-1 p-1.5 rounded border text-left truncate transition-all duration-150 ${
                  selected === loserId
                    ? 'border-foreground/30 bg-accent text-foreground scale-[1.02]'
                    : 'border-border text-muted-foreground hover:border-foreground/20 scale-100'
                }`}
              >
                <span className="block text-[10px] text-muted-foreground/60 uppercase truncate">{loser.name}</span>
                {loserVal}
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
