'use client'

import { useState, useRef } from 'react'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import { Search, ChevronsUpDown, X } from 'lucide-react'
import { LANGUAGES } from '@/lib/constants/languages'

export function LanguageMultiSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const selected = value ? value.split(',').map((s) => s.trim()).filter(Boolean) : []
  const selectedSet = new Set(selected)

  const filtered = search
    ? LANGUAGES.filter((l) => l.toLowerCase().includes(search.toLowerCase()))
    : [...LANGUAGES]

  const toggle = (lang: string) => {
    const next = new Set(selectedSet)
    if (next.has(lang)) next.delete(lang)
    else next.add(lang)
    onChange(Array.from(next).join(', '))
  }

  const remove = (lang: string) => {
    const next = selected.filter((s) => s !== lang)
    onChange(next.join(', '))
  }

  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">Languages</Label>
      <Popover open={open} onOpenChange={(v) => { setOpen(v); if (v) setTimeout(() => inputRef.current?.focus(), 0) }}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="flex h-auto min-h-8 w-full items-center gap-1 flex-wrap rounded-md border border-input bg-muted/50 px-2 py-1 text-sm text-foreground cursor-pointer hover:bg-accent/50 transition-colors"
          >
            {selected.length > 0 ? (
              <>
                {selected.map((lang) => (
                  <Badge
                    key={lang}
                    variant="secondary"
                    className="text-[10px] h-5 gap-0.5 px-1.5 bg-accent"
                  >
                    {lang}
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => { e.stopPropagation(); remove(lang) }}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); remove(lang) } }}
                      className="ml-0.5 hover:text-foreground text-muted-foreground cursor-pointer"
                    >
                      <X className="h-2.5 w-2.5" />
                    </span>
                  </Badge>
                ))}
              </>
            ) : (
              <span className="text-muted-foreground/40 px-1">Select...</span>
            )}
            <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0 ml-auto" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-[220px] p-0" side="bottom" align="start">
          <div className="flex items-center border-b border-border px-2">
            <Search className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
            <input
              ref={inputRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search language..."
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/40 h-9 px-2 outline-none"
            />
            {search && (
              <button type="button" onClick={() => setSearch('')} className="text-muted-foreground/50 hover:text-muted-foreground">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <ScrollArea className="h-[200px]">
            <div className="p-1 space-y-0.5">
              {filtered.map((lang) => (
                <label
                  key={lang}
                  className="flex items-center gap-2 rounded-sm px-2 py-1.5 text-xs cursor-pointer hover:bg-accent/50 transition-colors"
                >
                  <Checkbox
                    checked={selectedSet.has(lang)}
                    onCheckedChange={() => toggle(lang)}
                    className="h-3.5 w-3.5"
                  />
                  <span className="text-foreground">{lang}</span>
                </label>
              ))}
              {filtered.length === 0 && (
                <p className="text-xs text-muted-foreground/60 text-center py-4">No languages found</p>
              )}
            </div>
          </ScrollArea>
        </PopoverContent>
      </Popover>
    </div>
  )
}
