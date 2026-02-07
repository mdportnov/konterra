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

  const hasContacts = contacts.length > 0

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
    const isMobileView = typeof window !== 'undefined' && window.innerWidth < 640
    const w = isMobileView
      ? Math.min(window.innerWidth - pad * 2, 320)
      : 280
    const estH = hasContacts ? 450 : 180

    if (isMobileView) {
      const left = (window.innerWidth - w) / 2
      const top = Math.max(pad, (window.innerHeight - Math.min(estH, window.innerHeight - pad * 2)) / 2)
      return { left, top, w }
    }

    let left = x - w / 2
    let top = y + 12

    if (typeof window !== 'undefined') {
      if (left < pad) left = pad
      if (left + w > window.innerWidth - pad) left = window.innerWidth - pad - w
      if (top + estH > window.innerHeight - pad) top = y - estH - 12
      if (top < pad) top = pad
    }

    return { left, top, w }
  }, [x, y, hasContacts])

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
        maxHeight: typeof window !== 'undefined' && window.innerWidth < 640 ? '80dvh' : 450,
        zIndex: Z.overlay,
        opacity: open ? 1 : 0,
        transform: open ? 'scale(1) translateY(0)' : 'scale(0.95) translateY(4px)',
        transition: 'opacity 200ms cubic-bezier(0.32,0.72,0,1), transform 200ms cubic-bezier(0.32,0.72,0,1)',
        pointerEvents: open ? 'auto' : 'none',
      }}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm font-medium text-foreground truncate">{country}</span>
          {hasContacts && (
            <span className="text-xs text-muted-foreground/60 shrink-0">{contacts.length} contact{contacts.length === 1 ? '' : 's'}</span>
          )}
        </div>
        <button onClick={onClose} className="text-muted-foreground/60 hover:text-muted-foreground shrink-0 ml-2 cursor-pointer">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {onToggleVisited && (
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-border transition-colors duration-200">
          <span className="text-xs text-muted-foreground">{visited ? 'Visited' : 'Mark as visited'}</span>
          <Switch checked={!!visited} onCheckedChange={onToggleVisited} />
        </div>
      )}

      {hasContacts && (
        <ScrollArea className="max-h-[280px]">
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
                      className="w-full flex items-center gap-3 px-4 py-2 hover:bg-accent transition-colors text-left cursor-pointer"
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

      {onAddContact && (
        <div className={`${hasContacts ? 'border-t border-border' : ''} px-3 py-2`}>
          <button
            onClick={onAddContact}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-accent transition-colors cursor-pointer"
          >
            <UserPlus className="h-3.5 w-3.5" />
            Add contact
          </button>
        </div>
      )}
    </div>
  )
}
