'use client'

import { FileSpreadsheet, MessageCircle, Contact, Globe, Linkedin } from 'lucide-react'

export type ImportSource = 'konterra-json' | 'google-csv' | 'telegram-json' | 'vcard' | 'linkedin-csv'

interface StepSourceSelectProps {
  onSelect: (source: ImportSource) => void
}

const sources = [
  {
    id: 'konterra-json' as ImportSource,
    label: 'Konterra',
    description: 'Konterra JSON export (.konterra.json)',
    icon: Globe,
  },
  {
    id: 'google-csv' as ImportSource,
    label: 'Google Contacts',
    description: 'CSV export from Google Contacts',
    icon: FileSpreadsheet,
  },
  {
    id: 'telegram-json' as ImportSource,
    label: 'Telegram',
    description: 'JSON export from Telegram',
    icon: MessageCircle,
  },
  {
    id: 'linkedin-csv' as ImportSource,
    label: 'LinkedIn',
    description: 'Connections CSV from LinkedIn data export',
    icon: Linkedin,
  },
  {
    id: 'vcard' as ImportSource,
    label: 'vCard',
    description: '.vcf contact files',
    icon: Contact,
  },
]

export default function StepSourceSelect({ onSelect }: StepSourceSelectProps) {
  return (
    <div className="grid gap-3">
      {sources.map((s, i) => (
        <button
          key={s.id}
          onClick={() => onSelect(s.id)}
          className="flex items-center gap-4 p-4 rounded-lg border border-border hover:bg-accent hover:border-foreground/20 active:scale-[0.98] text-left transition-all duration-200 ease-out"
          style={{ animationDelay: `${i * 50}ms` }}
        >
          <s.icon className="h-8 w-8 text-muted-foreground shrink-0 transition-colors duration-150" />
          <div>
            <p className="font-medium text-foreground">{s.label}</p>
            <p className="text-sm text-muted-foreground">{s.description}</p>
          </div>
        </button>
      ))}
    </div>
  )
}
