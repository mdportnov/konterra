'use client'

import { useRef, useMemo, useCallback } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Switch } from '@/components/ui/switch'
import { X, UserPlus } from 'lucide-react'
import { useClickOutside } from '@/hooks/use-click-outside'
import { useHotkey } from '@/hooks/use-hotkey'
import { GLASS, Z } from '@/lib/constants/ui'
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip'
import { countryFlag } from '@/lib/country-flags'
import { PerplexityIcon } from '@/components/icons/perplexity'
import type { Contact } from '@/lib/db/schema'

function buildPerplexityCountryUrl(country: string): string {
  const query = `Best hidden gems, specialty coffee shops, cocktail bars, popular local spots, and networking-friendly places in ${country}`
  return `https://www.perplexity.ai/search?q=${encodeURIComponent(query)}`
}

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
  indirectContacts?: Contact[]
}

const POPUP_W = 340
const MAX_H = 520
const SCROLL_MAX = 380

function ContactRow({ contact, onSelect, className }: { contact: Contact; onSelect: (c: Contact) => void; className?: string }) {
  const initials = contact.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <button
      onClick={() => onSelect(contact)}
      className={`w-full flex items-center gap-3 px-4 py-2 hover:bg-accent/60 transition-colors text-left cursor-pointer ${className ?? ''}`}
    >
      <Avatar className="h-8 w-8 border border-border/50 shrink-0">
        <AvatarImage src={contact.photo || undefined} />
        <AvatarFallback className="text-[10px] bg-orange-500/20 text-orange-600 dark:text-orange-300">
          {initials}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="text-sm text-foreground truncate leading-tight">{contact.name}</div>
        {(contact.role || contact.company) && (
          <div className="text-xs text-muted-foreground/60 truncate leading-tight mt-0.5">
            {[contact.role, contact.company].filter(Boolean).join(' · ')}
          </div>
        )}
      </div>
    </button>
  )
}

function IndirectContactRow({ contact, onSelect }: { contact: Contact; onSelect: (c: Contact) => void }) {
  const initials = contact.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <button
      onClick={() => onSelect(contact)}
      className="w-full flex items-center gap-3 px-4 py-2 hover:bg-accent/60 transition-colors text-left cursor-pointer opacity-60"
    >
      <Avatar className="h-8 w-8 border border-purple-500/20 shrink-0">
        <AvatarImage src={contact.photo || undefined} />
        <AvatarFallback className="text-[10px] bg-purple-500/15 text-purple-600 dark:text-purple-300">
          {initials}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="text-sm text-foreground truncate leading-tight">{contact.name}</div>
        {(contact.role || contact.company) && (
          <div className="text-xs text-muted-foreground/60 truncate leading-tight mt-0.5">
            {[contact.role, contact.company].filter(Boolean).join(' · ')}
          </div>
        )}
      </div>
    </button>
  )
}

export default function CountryPopup({ country, contacts, x, y, open, onSelect, onClose, visited, onToggleVisited, onAddContact, indirectContacts = [] }: CountryPopupProps) {
  const ref = useRef<HTMLDivElement>(null)
  useClickOutside(ref, onClose, open)
  useHotkey('Escape', onClose, { enabled: open })

  const hasContacts = contacts.length > 0
  const hasAny = hasContacts || indirectContacts.length > 0

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
      ? Math.min(window.innerWidth - pad * 2, POPUP_W)
      : POPUP_W
    const estH = hasContacts ? MAX_H : 180

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
      className={`${GLASS.heavy} fixed rounded-xl shadow-2xl overflow-hidden flex flex-col`}
      style={{
        left: pos.left,
        top: pos.top,
        width: pos.w,
        maxHeight: typeof window !== 'undefined' && window.innerWidth < 640 ? '80dvh' : MAX_H,
        zIndex: Z.overlay,
        opacity: open ? 1 : 0,
        transform: open ? 'scale(1) translateY(0)' : 'scale(0.95) translateY(4px)',
        transition: 'opacity 200ms cubic-bezier(0.32,0.72,0,1), transform 200ms cubic-bezier(0.32,0.72,0,1)',
        pointerEvents: open ? 'auto' : 'none',
      }}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm font-medium text-foreground truncate">{country} {countryFlag(country)}</span>
          {hasContacts && (
            <span className="text-xs text-muted-foreground/60 shrink-0">
              {contacts.length + indirectContacts.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0 ml-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <a
                  href={buildPerplexityCountryUrl(country)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground/60 hover:text-[#20808D] transition-colors cursor-pointer"
                >
                  <PerplexityIcon className="h-3.5 w-3.5" />
                </a>
              </TooltipTrigger>
              <TooltipContent>Explore on Perplexity</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <button onClick={onClose} className="text-muted-foreground/60 hover:text-muted-foreground shrink-0 cursor-pointer">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {onToggleVisited && (
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-border shrink-0">
          <span className="text-xs text-muted-foreground">{visited ? 'Visited' : 'Mark as visited'}</span>
          <Switch checked={!!visited} onCheckedChange={onToggleVisited} />
        </div>
      )}

      {hasAny && (
        <div className="min-h-0 flex-1 overflow-y-auto thin-scrollbar" style={{ maxHeight: SCROLL_MAX }}>
          {hasContacts && (
            <div className="py-1">
              {grouped.map(([city, cityContacts], groupIdx) => (
                <div key={city}>
                  {groupIdx > 0 && <div className="mx-4 my-1 border-t border-border/50" />}
                  <div className="px-4 pt-2.5 pb-1">
                    <span className="text-[10px] font-medium text-muted-foreground/70 uppercase tracking-wider">{city}</span>
                  </div>
                  {cityContacts.map((c) => (
                    <ContactRow key={c.id} contact={c} onSelect={handleSelect} />
                  ))}
                </div>
              ))}
            </div>
          )}

          {indirectContacts.length > 0 && (
            <div className={hasContacts ? 'border-t border-border/50' : ''}>
              <div className="py-1">
                <div className="px-4 pt-2.5 pb-1">
                  <span className="text-[10px] font-medium text-purple-500/60 uppercase tracking-wider">Has connections here</span>
                </div>
                {indirectContacts.map((c) => (
                  <IndirectContactRow key={c.id} contact={c} onSelect={handleSelect} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {onAddContact && (
        <div className="border-t border-border px-3 py-2 shrink-0">
          <button
            onClick={onAddContact}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-orange-500 hover:bg-orange-600 text-white transition-colors cursor-pointer"
          >
            <UserPlus className="h-3.5 w-3.5" />
            Add contact
          </button>
        </div>
      )}
    </div>
  )
}
