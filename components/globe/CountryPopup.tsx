'use client'

import { useRef, useMemo, useCallback } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { X, MapPinPlus, UserPlus } from 'lucide-react'
import { useClickOutside } from '@/hooks/use-click-outside'
import { useHotkey } from '@/hooks/use-hotkey'
import { GLASS, Z } from '@/lib/constants/ui'
import type { Contact } from '@/lib/db/schema'

interface CountryPopupProps {
  country: string
  contacts: Contact[]
  x: number
  y: number
  open: boolean
  onSelect: (contact: Contact) => void
  onClose: () => void
  visited?: boolean
  onToggleVisited?: () => void
  onAddContact?: () => void
}

export default function CountryPopup({ country, contacts, x, y, open, onSelect, onClose, visited, onToggleVisited, onAddContact }: CountryPopupProps) {
  const ref = useRef<HTMLDivElement>(null)
  useClickOutside(ref, onClose, open)
  useHotkey('Escape', onClose, { enabled: open })

  const isEmpty = contacts.length === 0 && !visited

  const grouped = useMemo(() => {
    const map = new Map<string, Contact[]>()
    for (const c of contacts) {
      const city = c.city || 'Unknown'
      const arr = map.get(city) || []
      arr.push(c)
      map.set(city, arr)
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]))
  }, [contacts])

  const pos = useMemo(() => {
    const pad = 16
    const w = isEmpty ? 220 : 320
    const estH = isEmpty ? 140 : 450
    let left = x - w / 2
    let top = y + 12

    if (typeof window !== 'undefined') {
      if (left < pad) left = pad
      if (left + w > window.innerWidth - pad) left = window.innerWidth - pad - w
      if (top + estH > window.innerHeight - pad) top = y - estH - 12
      if (top < pad) top = pad
    }

    return { left, top, w }
  }, [x, y, isEmpty])

  const handleSelect = useCallback((c: Contact) => {
    onSelect(c)
  }, [onSelect])

  return (
    <div
      ref={ref}
      className={`${GLASS.heavy} fixed rounded-xl overflow-hidden shadow-2xl`}
      style={{
        left: pos.left,
        top: pos.top,
        width: pos.w,
        maxHeight: isEmpty ? undefined : 450,
        zIndex: Z.overlay,
        opacity: open ? 1 : 0,
        transform: open ? 'scale(1) translateY(0)' : 'scale(0.95) translateY(4px)',
        transition: 'opacity 150ms ease-out, transform 150ms ease-out',
        pointerEvents: open ? 'auto' : 'none',
      }}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm font-medium text-foreground truncate">{country}</span>
          {contacts.length > 0 && (
            <span className="text-xs text-muted-foreground/60 shrink-0">{contacts.length} contact{contacts.length === 1 ? '' : 's'}</span>
          )}
        </div>
        <button onClick={onClose} className="text-muted-foreground/60 hover:text-muted-foreground shrink-0 ml-2">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {isEmpty && (
        <div className="p-3 space-y-1.5">
          {onToggleVisited && (
            <button
              onClick={onToggleVisited}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left hover:bg-accent transition-colors"
            >
              <MapPinPlus className="h-4 w-4 text-teal-500 shrink-0" />
              <span className="text-xs text-foreground">Mark as visited</span>
            </button>
          )}
          {onAddContact && (
            <button
              onClick={onAddContact}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left hover:bg-accent transition-colors"
            >
              <UserPlus className="h-4 w-4 text-orange-400 shrink-0" />
              <span className="text-xs text-foreground">Add contact here</span>
            </button>
          )}
        </div>
      )}

      {!isEmpty && onToggleVisited && (
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
          <span className="text-xs text-muted-foreground">Visited</span>
          <Switch checked={!!visited} onCheckedChange={onToggleVisited} />
        </div>
      )}

      {!isEmpty && contacts.length > 0 && (
        <ScrollArea className="max-h-[340px]">
          <div className="py-1">
            {grouped.map(([city, cityContacts], groupIdx) => (
              <div key={city}>
                {groupIdx > 0 && <Separator className="my-1" />}
                <div className="px-4 pt-2.5 pb-1">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{city}</span>
                </div>
                {cityContacts.map((c) => {
                  const initials = c.name
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2)

                  return (
                    <button
                      key={c.id}
                      onClick={() => handleSelect(c)}
                      className="w-full flex items-center gap-3 px-4 py-2 hover:bg-accent transition-colors text-left"
                    >
                      <Avatar className="h-8 w-8 border border-border shrink-0">
                        <AvatarImage src={c.photo || undefined} />
                        <AvatarFallback className="text-[10px] bg-orange-500/20 text-orange-600 dark:text-orange-300">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <div className="text-sm text-foreground truncate">{c.name}</div>
                        {(c.role || c.company) && (
                          <div className="text-xs text-muted-foreground/60 truncate">
                            {[c.role, c.company].filter(Boolean).join(' · ')}
                          </div>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            ))}
          </div>
        </ScrollArea>
      )}

      {!isEmpty && onAddContact && (
        <div className="border-t border-border px-3 py-2">
          <button
            onClick={onAddContact}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <UserPlus className="h-3.5 w-3.5" />
            Add contact
          </button>
        </div>
      )}

      {!isEmpty && contacts.length === 0 && visited && onAddContact && (
        <div className="p-3">
          <button
            onClick={onAddContact}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left hover:bg-accent transition-colors"
          >
            <UserPlus className="h-4 w-4 text-orange-400 shrink-0" />
            <span className="text-xs text-foreground">Add contact here</span>
          </button>
        </div>
      )}
    </div>
  )
}
