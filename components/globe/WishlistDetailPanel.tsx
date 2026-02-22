'use client'

import { useState, useCallback, useRef } from 'react'
import GlobePanel from '@/components/globe/GlobePanel'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Heart, Trash2 } from 'lucide-react'
import { PANEL_WIDTH } from '@/lib/constants/ui'
import { countryFlag } from '@/lib/country-flags'
import type { Contact, CountryWishlistEntry } from '@/lib/db/schema'

const PRIORITIES = ['low', 'medium', 'high', 'dream'] as const
const STATUSES = ['idea', 'researching', 'planning', 'ready'] as const

const PRIORITY_LABELS: Record<string, string> = {
  dream: 'Dream',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
}

const STATUS_LABELS: Record<string, string> = {
  idea: 'Idea',
  researching: 'Researching',
  planning: 'Planning',
  ready: 'Ready',
}

interface WishlistDetailPanelProps {
  open: boolean
  country: string | null
  entry: CountryWishlistEntry | null
  contacts: Contact[]
  indirectContacts: Contact[]
  onClose: () => void
  onUpdate: (country: string, patch: { priority?: string; status?: string; notes?: string | null }) => void
  onRemove: (country: string) => void
  onContactClick: (contact: Contact) => void
}

export default function WishlistDetailPanel({
  open,
  country,
  entry,
  contacts,
  indirectContacts,
  onClose,
  onUpdate,
  onRemove,
  onContactClick,
}: WishlistDetailPanelProps) {
  const [trackedId, setTrackedId] = useState(entry?.id)
  const [notes, setNotes] = useState(entry?.notes ?? '')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  if (entry?.id !== trackedId) {
    setTrackedId(entry?.id)
    setNotes(entry?.notes ?? '')
  }

  const handlePriorityChange = useCallback((value: string) => {
    if (country && value) onUpdate(country, { priority: value })
  }, [country, onUpdate])

  const handleStatusChange = useCallback((value: string) => {
    if (country && value) onUpdate(country, { status: value })
  }, [country, onUpdate])

  const handleNotesChange = useCallback((value: string) => {
    setNotes(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      if (country) onUpdate(country, { notes: value || null })
    }, 600)
  }, [country, onUpdate])

  const handleRemove = useCallback(() => {
    if (country) {
      onRemove(country)
      onClose()
    }
  }, [country, onRemove, onClose])

  if (!country) return null

  return (
    <GlobePanel
      open={open}
      side="right"
      width={PANEL_WIDTH.detail}
      glass="heavy"
      onClose={onClose}
    >
      <div className="flex flex-col h-full">
        <div className="px-6 pt-6 pb-4">
          <div className="flex items-center gap-2">
            <Heart className="h-4 w-4 fill-rose-500 text-rose-500 shrink-0" />
            <h2 className="text-lg font-semibold text-foreground">
              {countryFlag(country)} {country}
            </h2>
          </div>
        </div>

        <Separator className="bg-border" />

        <div className="flex-1 min-h-0 overflow-y-auto thin-scrollbar">
          <div className="px-6 py-4 space-y-5">
            <div className="space-y-2">
              <span className="text-xs font-medium text-muted-foreground/60 uppercase tracking-wider">Priority</span>
              <ToggleGroup
                type="single"
                value={entry?.priority ?? 'medium'}
                onValueChange={handlePriorityChange}
                className="w-full"
              >
                {PRIORITIES.map((p) => (
                  <ToggleGroupItem
                    key={p}
                    value={p}
                    className="flex-1 text-xs data-[state=on]:bg-rose-500/10 data-[state=on]:text-rose-500 text-muted-foreground/60"
                  >
                    {PRIORITY_LABELS[p]}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </div>

            <div className="space-y-2">
              <span className="text-xs font-medium text-muted-foreground/60 uppercase tracking-wider">Status</span>
              <ToggleGroup
                type="single"
                value={entry?.status ?? 'idea'}
                onValueChange={handleStatusChange}
                className="w-full"
              >
                {STATUSES.map((s) => (
                  <ToggleGroupItem
                    key={s}
                    value={s}
                    className="flex-1 text-xs data-[state=on]:bg-accent data-[state=on]:text-foreground text-muted-foreground/60"
                  >
                    {STATUS_LABELS[s]}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </div>

            <div className="space-y-2">
              <span className="text-xs font-medium text-muted-foreground/60 uppercase tracking-wider">Notes</span>
              <Textarea
                value={notes}
                onChange={(e) => handleNotesChange(e.target.value)}
                placeholder="What to see, where to go, who to meet..."
                className="min-h-[120px] text-sm resize-none"
              />
            </div>

            {contacts.length > 0 && (
              <div className="space-y-2">
                <span className="text-xs font-medium text-muted-foreground/60 uppercase tracking-wider">
                  Contacts in {country}
                </span>
                <div className="space-y-0.5">
                  {contacts.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => onContactClick(c)}
                      className="w-full flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-accent/60 transition-colors text-left cursor-pointer"
                    >
                      <Avatar className="h-7 w-7 border border-border/50 shrink-0">
                        <AvatarImage src={c.photo || undefined} />
                        <AvatarFallback className="text-[9px] bg-orange-500/20 text-orange-600 dark:text-orange-300">
                          {c.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm text-foreground truncate leading-tight">{c.name}</div>
                        {c.city && (
                          <div className="text-[10px] text-muted-foreground/60 truncate">{c.city}</div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {indirectContacts.length > 0 && (
              <div className="space-y-2">
                <span className="text-xs font-medium text-purple-500/60 uppercase tracking-wider">
                  Connections to {country}
                </span>
                <div className="space-y-0.5">
                  {indirectContacts.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => onContactClick(c)}
                      className="w-full flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-accent/60 transition-colors text-left cursor-pointer opacity-60"
                    >
                      <Avatar className="h-7 w-7 border border-purple-500/20 shrink-0">
                        <AvatarImage src={c.photo || undefined} />
                        <AvatarFallback className="text-[9px] bg-purple-500/15 text-purple-600 dark:text-purple-300">
                          {c.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm text-foreground truncate leading-tight">{c.name}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <Separator className="bg-border" />

        <div className="px-6 py-3 shrink-0">
          <button
            onClick={handleRemove}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Remove from wishlist
          </button>
        </div>
      </div>
    </GlobePanel>
  )
}
