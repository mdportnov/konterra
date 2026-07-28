'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { signOut } from 'next-auth/react'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from '@/components/ui/command'
import {
  UserPlus,
  Settings,
  User,
  Sparkles,
  Plane,
  MapPin,
  Upload,
  Download,
  Copy,
  Sun,
  Moon,
  Monitor,
  LogOut,
  Globe,
  Users,
  FileText,
  Zap,
} from 'lucide-react'
import { ANALYTICS_EVENTS, track } from '@/lib/analytics'
import { useHotkey } from '@/hooks/use-hotkey'
import { useTheme } from '@/components/providers'
import { countryFlag } from '@/lib/country-flags'
import type { Contact, Trip } from '@/lib/db/schema'
import type { SearchHit } from '@/lib/db/queries'
import type { DashboardTab } from '@/hooks/use-dashboard-routing'

interface CommandMenuProps {
  contacts: Contact[]
  trips: Trip[]
  dashboardTab: DashboardTab
  onContactClick: (contact: Contact) => void
  onAddContact: () => void
  onAddTrip: () => void
  onOpenSettings: () => void
  onOpenProfile: () => void
  onOpenInsights: () => void
  onDashboardTabChange: (tab: DashboardTab) => void
  onOpenImport: () => void
  onOpenTripImport: () => void
  onOpenExport: () => void
  onOpenDuplicates: () => void
  onTripClick?: (trip: Trip) => void
  onQuickLog?: () => void
  externalOpen?: boolean
  onExternalOpenChange?: (open: boolean) => void
}

export default function CommandMenu({
  contacts,
  trips,
  dashboardTab,
  onContactClick,
  onAddContact,
  onAddTrip,
  onOpenSettings,
  onOpenProfile,
  onOpenInsights,
  onDashboardTabChange,
  onOpenImport,
  onOpenTripImport,
  onOpenExport,
  onOpenDuplicates,
  onTripClick,
  onQuickLog,
  externalOpen,
  onExternalOpenChange,
}: CommandMenuProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const [search, setSearch] = useState('')
  const { theme, setTheme } = useTheme()

  const open = externalOpen ?? internalOpen
  const setOpen = useCallback((v: boolean | ((prev: boolean) => boolean)) => {
    const next = typeof v === 'function' ? v(externalOpen ?? internalOpen) : v
    if (onExternalOpenChange) onExternalOpenChange(next)
    else setInternalOpen(next)
  }, [externalOpen, internalOpen, onExternalOpenChange])

  const toggleOpen = useCallback(() => {
    setSearch('')
    setOpen((prev) => !prev)
  }, [setOpen])

  useHotkey('k', toggleOpen, { meta: true })
  useHotkey('f', toggleOpen, { meta: true })

  const handleHotkeyAddContact = useCallback(() => {
    if (!open) onAddContact()
  }, [open, onAddContact])

  const handleHotkeyAddTrip = useCallback(() => {
    if (!open) onAddTrip()
  }, [open, onAddTrip])

  const handleHotkeyInsights = useCallback(() => {
    if (!open) onOpenInsights()
  }, [open, onOpenInsights])

  const handleHotkeyQuickLog = useCallback(() => {
    if (!open && onQuickLog) onQuickLog()
  }, [open, onQuickLog])

  useHotkey('l', handleHotkeyQuickLog, { meta: true })
  useHotkey('n', handleHotkeyAddContact, { meta: true })
  useHotkey('j', handleHotkeyAddTrip, { meta: true })
  useHotkey('p', handleHotkeyAddTrip, { meta: true })
  useHotkey('i', handleHotkeyInsights, { meta: true })

  const runAction = useCallback((action: () => void) => {
    setOpen(false)
    action()
  }, [setOpen])

  const recentContacts = useMemo(() => {
    return [...contacts]
      .sort((a, b) => {
        const da = a.updatedAt ? new Date(a.updatedAt).getTime() : 0
        const db = b.updatedAt ? new Date(b.updatedAt).getTime() : 0
        return db - da
      })
      .slice(0, 5)
  }, [contacts])

  const upcomingTrips = useMemo(() => {
    const now = new Date()
    return [...trips]
      .filter((t) => new Date(t.arrivalDate) >= now)
      .sort((a, b) => new Date(a.arrivalDate).getTime() - new Date(b.arrivalDate).getTime())
      .slice(0, 5)
  }, [trips])

  const recentTrips = useMemo(() => {
    const now = new Date()
    return [...trips]
      .filter((t) => new Date(t.arrivalDate) < now)
      .sort((a, b) => new Date(b.arrivalDate).getTime() - new Date(a.arrivalDate).getTime())
      .slice(0, 3)
  }, [trips])

  const contactSubline = useCallback((c: Contact) => {
    const parts: string[] = []
    if (c.company) parts.push(c.company)
    if (c.city && c.country) parts.push(`${c.city}, ${c.country}`)
    else if (c.country) parts.push(c.country)
    else if (c.city) parts.push(c.city)
    return parts.join(' · ')
  }, [])

  const handleTripSelect = useCallback((trip: Trip) => {
    if (onTripClick) {
      onTripClick(trip)
    } else {
      onDashboardTabChange('travel')
    }
  }, [onTripClick, onDashboardTabChange])

  const showContacts = search.length > 0

  // The client-side filter above only sees loaded contacts and only matches their fields.
  // This second pass asks Postgres, which reaches note text, interaction history and trips.
  const [deepHits, setDeepHits] = useState<SearchHit[]>([])

  const query = search.trim()
  const searchable = open && query.length >= 2

  useEffect(() => {
    if (!searchable) return

    const controller = new AbortController()
    const timer = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(query)}&limit=8`, { signal: controller.signal })
        .then((r) => (r.ok ? r.json() : null))
        .then((data: { hits?: SearchHit[] } | null) => {
          if (data?.hits) {
            setDeepHits(data.hits)
            track(ANALYTICS_EVENTS.searchUsed, { hits: data.hits.length })
          }
        })
        .catch(() => {})
    }, 220)

    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [query, searchable])

  const localContactIds = useMemo(() => new Set(contacts.map((c) => c.id)), [contacts])

  // Contacts already listed above and hits with no note text add nothing here. Filtering
  // on `searchable` during render also clears stale hits without an effect writing state.
  const contextHits = useMemo(
    () =>
      searchable
        ? deepHits.filter((h) => (h.kind === 'contact' ? !localContactIds.has(h.id) : Boolean(h.snippet)))
        : [],
    [deepHits, localContactIds, searchable],
  )

  const handleDeepHitSelect = useCallback((hit: SearchHit) => {
    if (hit.contactId) {
      const contact = contacts.find((c) => c.id === hit.contactId)
      if (contact) {
        runAction(() => onContactClick(contact))
        return
      }
    }
    if (hit.kind === 'trip') {
      const trip = trips.find((t) => t.id === hit.id)
      if (trip) {
        runAction(() => handleTripSelect(trip))
        return
      }
    }
    runAction(() => onDashboardTabChange(hit.kind === 'trip' ? 'travel' : 'connections'))
  }, [contacts, trips, runAction, onContactClick, handleTripSelect, onDashboardTabChange])

  return (
    <>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          placeholder="Search contacts, trips, actions..."
          value={search}
          onValueChange={setSearch}
        />
        <CommandList className="max-h-[min(300px,60dvh)]">
          <CommandEmpty>No results found.</CommandEmpty>

          {showContacts && (
            <CommandGroup heading="Contacts">
              {contacts.slice(0, 10).map((contact) => {
                const sub = contactSubline(contact)
                return (
                  <CommandItem
                    key={contact.id}
                    value={`contact-${contact.id}-${contact.name}-${contact.company || ''}-${contact.city || ''}-${contact.country || ''}-${contact.communicationStyle || ''}-${contact.preferredChannel || ''}-${contact.financialCapacity || ''}`}
                    onSelect={() => runAction(() => onContactClick(contact))}
                  >
                    <User className="text-muted-foreground" />
                    <div className="flex flex-col min-w-0">
                      <span className="truncate">{countryFlag(contact.country)} {contact.name}</span>
                      {sub && (
                        <span className="text-xs text-muted-foreground truncate">{sub}</span>
                      )}
                    </div>
                  </CommandItem>
                )
              })}
            </CommandGroup>
          )}

          {contextHits.length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup heading="In notes & history">
                {contextHits.map((hit) => (
                  <CommandItem
                    // cmdk filters by `value`; embedding the raw query keeps server-side
                    // hits visible even when their text does not match the local filter.
                    key={`${hit.kind}-${hit.id}`}
                    value={`deep-${hit.kind}-${hit.id}-${search}`}
                    onSelect={() => handleDeepHitSelect(hit)}
                  >
                    {hit.kind === 'trip' ? (
                      <Plane className="text-muted-foreground" />
                    ) : hit.kind === 'contact' ? (
                      <User className="text-muted-foreground" />
                    ) : (
                      <FileText className="text-muted-foreground" />
                    )}
                    <div className="flex flex-col min-w-0">
                      <span className="truncate">{hit.title}</span>
                      {(hit.snippet || hit.subtitle) && (
                        <span className="text-xs text-muted-foreground truncate">
                          {hit.snippet ?? hit.subtitle}
                        </span>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}

          {showContacts && trips.length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Trips">
                {trips.slice(0, 8).map((trip) => (
                  <CommandItem
                    key={trip.id}
                    value={`trip-${trip.id}-${trip.city}-${trip.country}-${trip.arrivalDate}`}
                    onSelect={() => runAction(() => handleTripSelect(trip))}
                  >
                    <Plane className="text-muted-foreground" />
                    <div className="flex flex-col min-w-0">
                      <span className="truncate">{countryFlag(trip.country)} {trip.city}, {trip.country}</span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(trip.arrivalDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}

          {!showContacts && (
            <>
              <CommandGroup heading="Quick Actions">
                {onQuickLog && (
                  <CommandItem onSelect={() => runAction(onQuickLog)}>
                    <Zap className="text-muted-foreground" />
                    <span>Just met someone</span>
                    <CommandShortcut>⌘L</CommandShortcut>
                  </CommandItem>
                )}
                <CommandItem onSelect={() => runAction(onAddContact)}>
                  <UserPlus className="text-muted-foreground" />
                  <span>Add Contact</span>
                  <CommandShortcut>⌘N</CommandShortcut>
                </CommandItem>
                <CommandItem onSelect={() => runAction(onAddTrip)}>
                  <Plane className="text-muted-foreground" />
                  <span>Add Trip</span>
                  <CommandShortcut>⌘J / ⌘P</CommandShortcut>
                </CommandItem>
                <CommandItem onSelect={() => runAction(onOpenInsights)}>
                  <Sparkles className="text-muted-foreground" />
                  <span>Network Insights</span>
                  <CommandShortcut>⌘I</CommandShortcut>
                </CommandItem>
              </CommandGroup>

              <CommandSeparator />

              {recentContacts.length > 0 && (
                <>
                  <CommandGroup heading="Recent Contacts">
                    {recentContacts.map((contact) => (
                      <CommandItem
                        key={contact.id}
                        value={`recent-${contact.id}-${contact.name}-${contact.company || ''}`}
                        onSelect={() => runAction(() => onContactClick(contact))}
                      >
                        <User className="text-muted-foreground" />
                        <span className="truncate">{countryFlag(contact.country)} {contact.name}</span>
                        {contact.company && (
                          <span className="text-xs text-muted-foreground ml-auto truncate max-w-32">{contact.company}</span>
                        )}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                  <CommandSeparator />
                </>
              )}

              {upcomingTrips.length > 0 && (
                <>
                  <CommandGroup heading="Upcoming Trips">
                    {upcomingTrips.map((trip) => (
                      <CommandItem
                        key={trip.id}
                        value={`upcoming-${trip.id}-${trip.city}-${trip.country}`}
                        onSelect={() => runAction(() => handleTripSelect(trip))}
                      >
                        <MapPin className="text-muted-foreground" />
                        <span className="truncate">{countryFlag(trip.country)} {trip.city}, {trip.country}</span>
                        <span className="text-xs text-muted-foreground ml-auto">
                          {new Date(trip.arrivalDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                  <CommandSeparator />
                </>
              )}

              {recentTrips.length > 0 && upcomingTrips.length === 0 && (
                <>
                  <CommandGroup heading="Recent Trips">
                    {recentTrips.map((trip) => (
                      <CommandItem
                        key={trip.id}
                        value={`past-${trip.id}-${trip.city}-${trip.country}`}
                        onSelect={() => runAction(() => handleTripSelect(trip))}
                      >
                        <MapPin className="text-muted-foreground" />
                        <span className="truncate">{countryFlag(trip.country)} {trip.city}, {trip.country}</span>
                        <span className="text-xs text-muted-foreground ml-auto">
                          {new Date(trip.arrivalDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                  <CommandSeparator />
                </>
              )}

              <CommandGroup heading="Navigate">
                <CommandItem onSelect={() => runAction(() => onDashboardTabChange('connections'))}>
                  <Users className="text-muted-foreground" />
                  <span>Connections</span>
                  {dashboardTab === 'connections' && (
                    <span className="text-xs text-muted-foreground ml-auto">Active</span>
                  )}
                </CommandItem>
                <CommandItem onSelect={() => runAction(() => onDashboardTabChange('travel'))}>
                  <Globe className="text-muted-foreground" />
                  <span>Travel</span>
                  {dashboardTab === 'travel' && (
                    <span className="text-xs text-muted-foreground ml-auto">Active</span>
                  )}
                </CommandItem>
                <CommandItem onSelect={() => runAction(onOpenSettings)}>
                  <Settings className="text-muted-foreground" />
                  <span>Settings</span>
                </CommandItem>
                <CommandItem onSelect={() => runAction(onOpenProfile)}>
                  <User className="text-muted-foreground" />
                  <span>Profile</span>
                </CommandItem>
              </CommandGroup>

              <CommandSeparator />

              <CommandGroup heading="Data">
                <CommandItem onSelect={() => runAction(onOpenImport)}>
                  <Upload className="text-muted-foreground" />
                  <span>Import Contacts</span>
                </CommandItem>
                <CommandItem onSelect={() => runAction(onOpenTripImport)}>
                  <Upload className="text-muted-foreground" />
                  <span>Import Trips</span>
                </CommandItem>
                <CommandItem onSelect={() => runAction(onOpenExport)}>
                  <Download className="text-muted-foreground" />
                  <span>Export Data</span>
                </CommandItem>
                <CommandItem onSelect={() => runAction(onOpenDuplicates)}>
                  <Copy className="text-muted-foreground" />
                  <span>Find Duplicates</span>
                </CommandItem>
              </CommandGroup>

              <CommandSeparator />

              <CommandGroup heading="Theme">
                <CommandItem onSelect={() => runAction(() => setTheme('light'))}>
                  <Sun className="text-muted-foreground" />
                  <span>Light Mode</span>
                  {theme === 'light' && (
                    <span className="text-xs text-muted-foreground ml-auto">Active</span>
                  )}
                </CommandItem>
                <CommandItem onSelect={() => runAction(() => setTheme('dark'))}>
                  <Moon className="text-muted-foreground" />
                  <span>Dark Mode</span>
                  {theme === 'dark' && (
                    <span className="text-xs text-muted-foreground ml-auto">Active</span>
                  )}
                </CommandItem>
                <CommandItem onSelect={() => runAction(() => setTheme('system'))}>
                  <Monitor className="text-muted-foreground" />
                  <span>System Theme</span>
                  {theme === 'system' && (
                    <span className="text-xs text-muted-foreground ml-auto">Active</span>
                  )}
                </CommandItem>
              </CommandGroup>

              <CommandSeparator />

              <CommandGroup heading="Account">
                <CommandItem onSelect={() => runAction(() => signOut({ callbackUrl: '/login' }))}>
                  <LogOut className="text-muted-foreground" />
                  <span>Sign Out</span>
                </CommandItem>
              </CommandGroup>
            </>
          )}
        </CommandList>
      </CommandDialog>
    </>
  )
}
