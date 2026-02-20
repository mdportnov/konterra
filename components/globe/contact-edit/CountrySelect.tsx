'use client'

import { useState, useRef } from 'react'
import { Label } from '@/components/ui/label'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import { Search, Check, ChevronsUpDown, X } from 'lucide-react'
import { countryFlag } from '@/lib/country-flags'

const COUNTRY_LIST = [
  'Afghanistan', 'Albania', 'Algeria', 'Andorra', 'Angola', 'Antigua and Barbuda', 'Argentina', 'Armenia', 'Australia', 'Austria', 'Azerbaijan',
  'Bahamas', 'Bahrain', 'Bangladesh', 'Barbados', 'Belarus', 'Belgium', 'Belize', 'Benin', 'Bhutan', 'Bolivia', 'Bosnia and Herzegovina', 'Botswana', 'Brazil', 'Brunei', 'Bulgaria', 'Burkina Faso', 'Burundi',
  'Cambodia', 'Cameroon', 'Canada', 'Cape Verde', 'Central African Republic', 'Chad', 'Chile', 'China', 'Colombia', 'Comoros', 'Congo', 'Costa Rica', 'Croatia', 'Cuba', 'Cyprus', 'Czech Republic',
  'Denmark', 'Djibouti', 'Dominica', 'Dominican Republic', 'DR Congo',
  'East Timor', 'Ecuador', 'Egypt', 'El Salvador', 'Equatorial Guinea', 'Eritrea', 'Estonia', 'Eswatini', 'Ethiopia',
  'Fiji', 'Finland', 'France',
  'Gabon', 'Gambia', 'Georgia', 'Germany', 'Ghana', 'Greece', 'Grenada', 'Guatemala', 'Guinea', 'Guinea-Bissau', 'Guyana',
  'Haiti', 'Honduras', 'Hong Kong', 'Hungary',
  'Iceland', 'India', 'Indonesia', 'Iran', 'Iraq', 'Ireland', 'Israel', 'Italy', 'Ivory Coast',
  'Jamaica', 'Japan', 'Jordan',
  'Kazakhstan', 'Kenya', 'Kiribati', 'Kosovo', 'Kuwait', 'Kyrgyzstan',
  'Laos', 'Latvia', 'Lebanon', 'Lesotho', 'Liberia', 'Libya', 'Liechtenstein', 'Lithuania', 'Luxembourg',
  'Macau', 'Madagascar', 'Malawi', 'Malaysia', 'Maldives', 'Mali', 'Malta', 'Marshall Islands', 'Mauritania', 'Mauritius', 'Mexico', 'Micronesia', 'Moldova', 'Monaco', 'Mongolia', 'Montenegro', 'Morocco', 'Mozambique', 'Myanmar',
  'Namibia', 'Nauru', 'Nepal', 'Netherlands', 'New Zealand', 'Nicaragua', 'Niger', 'Nigeria', 'North Korea', 'North Macedonia', 'Norway',
  'Oman',
  'Pakistan', 'Palau', 'Palestine', 'Panama', 'Papua New Guinea', 'Paraguay', 'Peru', 'Philippines', 'Poland', 'Portugal', 'Puerto Rico',
  'Qatar',
  'Romania', 'Russia', 'Rwanda',
  'Saint Kitts and Nevis', 'Saint Lucia', 'Samoa', 'San Marino', 'Saudi Arabia', 'Senegal', 'Serbia', 'Seychelles', 'Sierra Leone', 'Singapore', 'Slovakia', 'Slovenia', 'Solomon Islands', 'Somalia', 'South Africa', 'South Korea', 'South Sudan', 'Spain', 'Sri Lanka', 'Sudan', 'Suriname', 'Sweden', 'Switzerland', 'Syria',
  'Taiwan', 'Tajikistan', 'Tanzania', 'Thailand', 'Togo', 'Tonga', 'Trinidad and Tobago', 'Tunisia', 'Turkey', 'Turkmenistan', 'Tuvalu',
  'Uganda', 'Ukraine', 'United Arab Emirates', 'United Kingdom', 'United States', 'Uruguay', 'Uzbekistan',
  'Vanuatu', 'Vatican City', 'Venezuela', 'Vietnam',
  'Yemen', 'Zambia', 'Zimbabwe',
]

interface CountrySelectProps {
  value: string
  onChange: (v: string) => void
  label?: string
  className?: string
}

export function CountrySelect({ value, onChange, label, className }: CountrySelectProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const filtered = search
    ? COUNTRY_LIST.filter(c => c.toLowerCase().includes(search.toLowerCase()))
    : COUNTRY_LIST

  return (
    <div className={`space-y-1.5 ${className || ''}`}>
      {label && <Label className="text-xs text-muted-foreground">{label}</Label>}
      <Popover open={open} onOpenChange={(v) => { setOpen(v); if (v) setTimeout(() => inputRef.current?.focus(), 0); if (!v) setSearch('') }}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="flex h-8 w-full items-center justify-between rounded-md border border-input bg-muted/50 px-3 text-sm cursor-pointer hover:bg-accent/50 transition-colors"
          >
            <span className={value ? 'truncate' : 'text-muted-foreground/40 truncate'}>
              {value ? `${countryFlag(value)} ${value}` : 'Select country'}
            </span>
            <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0 ml-1" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-[220px] p-0" side="bottom" align="start">
          <div className="flex items-center border-b border-border px-2">
            <Search className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
            <input
              ref={inputRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search country..."
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/40 h-8 px-2 outline-none"
            />
            {search && (
              <button type="button" onClick={() => setSearch('')} className="text-muted-foreground/50 hover:text-muted-foreground">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <div className="max-h-[200px] overflow-y-auto p-1">
            {filtered.map((c) => {
              const selected = value === c
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => { onChange(c); setOpen(false); setSearch('') }}
                  className={`flex w-full items-center gap-1.5 rounded-sm px-2 py-1.5 text-xs text-left cursor-pointer transition-colors ${
                    selected ? 'bg-accent text-foreground' : 'text-foreground hover:bg-accent/50'
                  }`}
                >
                  <span className="shrink-0 w-4">{countryFlag(c)}</span>
                  <span className="truncate">{c}</span>
                  {selected && <Check className="h-3 w-3 shrink-0 ml-auto" />}
                </button>
              )
            })}
            {filtered.length === 0 && (
              <p className="text-xs text-muted-foreground/60 text-center py-4">No countries found</p>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
