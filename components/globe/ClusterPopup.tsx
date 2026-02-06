'use client'

import { useRef, useMemo, useCallback } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { X } from 'lucide-react'
import { useClickOutside } from '@/hooks/use-click-outside'
import { useHotkey } from '@/hooks/use-hotkey'
import { GLASS } from '@/lib/constants/ui'
import type { Contact } from '@/lib/db/schema'

interface ClusterPopupProps {
  contacts: Contact[]
  x: number
  y: number
  city: string
  open: boolean
  onSelect: (contact: Contact) => void
  onClose: () => void
}

export default function ClusterPopup({ contacts, x, y, city, open, onSelect, onClose }: ClusterPopupProps) {
  const ref = useRef<HTMLDivElement>(null)
  useClickOutside(ref, onClose, open)
  useHotkey('Escape', onClose, { enabled: open })

  const pos = useMemo(() => {
    const pad = 16
    const w = 280
    const maxH = Math.min(contacts.length * 64 + 56, 400)
    let left = x - w / 2
    let top = y + 12

    if (left < pad) left = pad
    if (left + w > window.innerWidth - pad) left = window.innerWidth - pad - w
    if (top + maxH > window.innerHeight - pad) top = y - maxH - 12

    return { left, top }
  }, [x, y, contacts.length])

  const handleSelect = useCallback((c: Contact) => {
    onSelect(c)
  }, [onSelect])

  return (
    <div
      ref={ref}
      className={`${GLASS.heavy} fixed rounded-xl overflow-hidden z-50 shadow-2xl`}
      style={{
        left: pos.left,
        top: pos.top,
        width: 280,
        opacity: open ? 1 : 0,
        transform: open ? 'scale(1) translateY(0)' : 'scale(0.95) translateY(4px)',
        transition: 'opacity 150ms ease-out, transform 150ms ease-out',
        pointerEvents: open ? 'auto' : 'none',
      }}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div>
          <span className="text-xs font-medium text-muted-foreground">{city || 'Location'}</span>
          <span className="text-xs text-muted-foreground/60 ml-2">{contacts.length} contacts</span>
        </div>
        <button onClick={onClose} className="text-muted-foreground/60 hover:text-muted-foreground">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <ScrollArea className="max-h-[340px]">
        <div className="py-1">
          {contacts.map((c) => {
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
                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-accent transition-colors text-left"
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
      </ScrollArea>
    </div>
  )
}
