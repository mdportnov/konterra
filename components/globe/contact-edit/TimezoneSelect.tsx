'use client'

import { useState, useRef } from 'react'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import { Search, Check, ChevronsUpDown, X } from 'lucide-react'
import { TIMEZONES, TIMEZONE_LABELS } from '@/lib/constants/timezones'

export function TimezoneSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const filtered = search
    ? TIMEZONES.filter((tz) => {
        const label = TIMEZONE_LABELS[tz] || tz
        return label.toLowerCase().includes(search.toLowerCase()) || tz.toLowerCase().includes(search.toLowerCase())
      })
    : [...TIMEZONES]

  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">Timezone</Label>
      <Popover open={open} onOpenChange={(v) => { setOpen(v); if (v) setTimeout(() => inputRef.current?.focus(), 0) }}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="flex h-8 w-full items-center justify-between rounded-md border border-input bg-muted/50 px-3 text-sm text-foreground cursor-pointer hover:bg-accent/50 transition-colors"
          >
            <span className={value ? 'truncate' : 'text-muted-foreground/40 truncate'}>
              {value ? (TIMEZONE_LABELS[value] || value) : 'Select...'}
            </span>
            <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0 ml-1" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-[260px] p-0" side="bottom" align="start">
          <div className="flex items-center border-b border-border px-2">
            <Search className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
            <input
              ref={inputRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search timezone..."
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/40 h-9 px-2 outline-none"
            />
            {search && (
              <button type="button" onClick={() => setSearch('')} className="text-muted-foreground/50 hover:text-muted-foreground">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <ScrollArea className="h-[200px]">
            <div className="p-1">
              {value && (
                <button
                  type="button"
                  onClick={() => { onChange(''); setOpen(false); setSearch('') }}
                  className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-xs text-muted-foreground hover:bg-accent cursor-pointer"
                >
                  Clear
                </button>
              )}
              {filtered.map((tz) => {
                const label = TIMEZONE_LABELS[tz] || tz
                const selected = value === tz
                return (
                  <button
                    key={tz}
                    type="button"
                    onClick={() => { onChange(tz); setOpen(false); setSearch('') }}
                    className={`flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-xs cursor-pointer transition-colors ${
                      selected ? 'bg-accent text-foreground' : 'text-foreground hover:bg-accent/50'
                    }`}
                  >
                    <Check className={`h-3 w-3 shrink-0 ${selected ? 'opacity-100' : 'opacity-0'}`} />
                    <span className="truncate">{label}</span>
                  </button>
                )
              })}
              {filtered.length === 0 && (
                <p className="text-xs text-muted-foreground/60 text-center py-4">No timezones found</p>
              )}
            </div>
          </ScrollArea>
        </PopoverContent>
      </Popover>
    </div>
  )
}
