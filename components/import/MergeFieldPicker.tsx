'use client'

import type { ParsedContact } from '@/lib/import/types'
import type { Contact } from '@/lib/db/schema'

interface MergeFieldPickerProps {
  parsed: ParsedContact
  existing: Contact
  mergeFields: Record<string, 'existing' | 'imported'>
  onMergeFieldChange: (field: string, source: 'existing' | 'imported') => void
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
  birthday: 'Birthday',
  telegram: 'Telegram',
  linkedin: 'LinkedIn',
  twitter: 'Twitter',
  instagram: 'Instagram',
  github: 'GitHub',
  timezone: 'Timezone',
  gender: 'Gender',
}

function getExistingValue(contact: Contact, field: string): string | undefined {
  const v = (contact as Record<string, unknown>)[field]
  if (v === null || v === undefined) return undefined
  if (v instanceof Date) return v.toISOString().split('T')[0]
  return String(v)
}

export default function MergeFieldPicker({ parsed, existing, mergeFields, onMergeFieldChange }: MergeFieldPickerProps) {
  const fields = Object.keys(fieldLabels).filter((f) => {
    const importedVal = (parsed as unknown as Record<string, unknown>)[f]
    const existingVal = getExistingValue(existing, f)
    return importedVal && existingVal && String(importedVal) !== String(existingVal)
  })

  if (fields.length === 0) {
    return <p className="text-xs text-muted-foreground pl-4">No conflicting fields</p>
  }

  return (
    <div className="space-y-2 pl-4 border-l-2 border-border">
      {fields.map((field) => {
        const importedVal = String((parsed as unknown as Record<string, unknown>)[field])
        const existingVal = getExistingValue(existing, field)!
        const selected = mergeFields[field] || 'existing'

        return (
          <div key={field} className="text-xs space-y-1">
            <p className="font-medium text-muted-foreground">{fieldLabels[field]}</p>
            <div className="flex gap-2">
              <button
                onClick={() => onMergeFieldChange(field, 'existing')}
                className={`flex-1 p-1.5 rounded-md border text-left truncate transition-all duration-150 ${
                  selected === 'existing'
                    ? 'border-foreground/30 bg-accent text-foreground scale-[1.02]'
                    : 'border-border text-muted-foreground hover:border-foreground/20 scale-100'
                }`}
              >
                <span className="block text-[10px] text-muted-foreground/60 uppercase">Keep</span>
                {existingVal}
              </button>
              <button
                onClick={() => onMergeFieldChange(field, 'imported')}
                className={`flex-1 p-1.5 rounded-md border text-left truncate transition-all duration-150 ${
                  selected === 'imported'
                    ? 'border-foreground/30 bg-accent text-foreground scale-[1.02]'
                    : 'border-border text-muted-foreground hover:border-foreground/20 scale-100'
                }`}
              >
                <span className="block text-[10px] text-muted-foreground/60 uppercase">Import</span>
                {importedVal}
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
