'use client'

import { useCallback, useMemo, useState } from 'react'
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
} from 'lucide-react'
import { useHotkey } from '@/hooks/use-hotkey'
import { useTheme } from '@/components/providers'
import { countryFlag } from '@/lib/country-flags'
import type { Contact, Trip } from '@/lib/db/schema'
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
}: CommandMenuProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const { theme, setTheme } = useTheme()

  const toggleOpen = useCallback(() => {
    setOpen((prev) => {
      if (!prev) setSearch('')
      return !prev
    })
  }, [])

  useHotkey('k', toggleOpen, { meta: true })

  const runAction = useCallback((action: () => void) => {
    setOpen(false)
    action()
  }, [])

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

  const showContacts = search.length > 0

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput
        placeholder="Search contacts, trips, actions..."
        value={search}
        onValueChange={setSearch}
      />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        {showContacts && (
          <CommandGroup heading="Contacts">
            {contacts.slice(0, 10).map((contact) => (
              <CommandItem
                key={contact.id}
                value={`contact-${contact.name}-${contact.company || ''}-${contact.city || ''}-${contact.country || ''}`}
                onSelect={() => runAction(() => onContactClick(contact))}
              >
                <User className="text-muted-foreground" />
                <div className="flex flex-col min-w-0">
                  <span className="truncate">{countryFlag(contact.country)} {contact.name}</span>
                  {contactSubline(contact) && (
                    <span className="text-xs text-muted-foreground truncate">{contactSubline(contact)}</span>
                  )}
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {showContacts && trips.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Trips">
              {trips.slice(0, 8).map((trip) => (
                <CommandItem
                  key={trip.id}
                  value={`trip-${trip.city}-${trip.country}-${trip.arrivalDate}`}
                  onSelect={() => runAction(() => {
                    onDashboardTabChange('travel')
                  })}
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
              <CommandItem onSelect={() => runAction(onAddContact)}>
                <UserPlus className="text-muted-foreground" />
                <span>Add Contact</span>
                <CommandShortcut>⌘N</CommandShortcut>
              </CommandItem>
              <CommandItem onSelect={() => runAction(onAddTrip)}>
                <Plane className="text-muted-foreground" />
                <span>Add Trip</span>
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
                      value={`recent-${contact.name}-${contact.company || ''}`}
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
                      value={`upcoming-${trip.city}-${trip.country}`}
                      onSelect={() => runAction(() => onDashboardTabChange('travel'))}
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
                      value={`past-${trip.city}-${trip.country}`}
                      onSelect={() => runAction(() => onDashboardTabChange('travel'))}
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
                <span>Travel Journey</span>
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
  )
}
