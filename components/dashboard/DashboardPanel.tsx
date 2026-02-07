'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Search, X, MapPin, Building2, ChevronDown, Plus, Globe as GlobeIcon } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { GLASS, PANEL_WIDTH } from '@/lib/constants/ui'
import { useHotkey } from '@/hooks/use-hotkey'
import StatsRow from './widgets/StatsRow'
import TopCountriesChart from './widgets/TopCountriesChart'
import ActivityTimeline from './widgets/ActivityTimeline'
import ReconnectAlerts from './widgets/ReconnectAlerts'
import NetworkHealth from './widgets/NetworkHealth'
import FavorLedger from './widgets/FavorLedger'
import { fetchRecentInteractions, fetchAllFavors } from '@/lib/api'
import type { Contact, Interaction, Favor } from '@/lib/db/schema'

interface DashboardPanelProps {
  contacts: Contact[]
  selectedContact: Contact | null
  onContactClick: (contact: Contact) => void
  onAddContact: () => void
  onOpenContactsBrowser?: () => void
  isMobile?: boolean
  onSwitchToGlobe?: () => void
  contactsLoading?: boolean
}

export default function DashboardPanel({
  contacts,
  selectedContact,
  onContactClick,
  onAddContact,
  onOpenContactsBrowser,
  isMobile,
  onSwitchToGlobe,
  contactsLoading = false,
}: DashboardPanelProps) {
  const [search, setSearch] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [selectedCountries, setSelectedCountries] = useState<string[]>([])
  const [tagsExpanded, setTagsExpanded] = useState(false)
  const [countriesExpanded, setCountriesExpanded] = useState(false)
  const [recentInteractions, setRecentInteractions] = useState<(Interaction & { contactName: string })[]>([])
  const [favors, setFavors] = useState<Favor[]>([])
  const [interactionsLoading, setInteractionsLoading] = useState(true)
  const [favorsLoading, setFavorsLoading] = useState(true)
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchRecentInteractions()
      .then(setRecentInteractions)
      .catch(() => toast.error('Failed to load interactions'))
      .finally(() => setInteractionsLoading(false))
    fetchAllFavors()
      .then(setFavors)
      .catch(() => toast.error('Failed to load favors'))
      .finally(() => setFavorsLoading(false))
  }, [])

  useHotkey('k', () => searchRef.current?.focus(), { meta: true })

  const allTags = useMemo(() => {
    const tags = new Set<string>()
    contacts.forEach((c) => c.tags?.forEach((t) => tags.add(t)))
    return Array.from(tags).sort()
  }, [contacts])

  const allCountries = useMemo(() => {
    const countries = new Set<string>()
    contacts.forEach((c) => c.country && countries.add(c.country))
    return Array.from(countries).sort()
  }, [contacts])

  const filteredContacts = useMemo(() => {
    return contacts.filter((c) => {
      const query = search.toLowerCase()
      const matchesSearch =
        !search ||
        c.name.toLowerCase().includes(query) ||
        c.company?.toLowerCase().includes(query) ||
        c.city?.toLowerCase().includes(query) ||
        c.country?.toLowerCase().includes(query)
      const matchesTags =
        selectedTags.length === 0 || c.tags?.some((t) => selectedTags.includes(t))
      const matchesCountry =
        selectedCountries.length === 0 || selectedCountries.includes(c.country || '')
      return matchesSearch && matchesTags && matchesCountry
    })
  }, [contacts, search, selectedTags, selectedCountries])

  const toggleTag = (tag: string) =>
    setSelectedTags((prev) => prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag])

  const toggleCountry = (country: string) =>
    setSelectedCountries((prev) => prev.includes(country) ? prev.filter((c) => c !== country) : [...prev, country])

  const clearFilters = () => {
    setSelectedTags([])
    setSelectedCountries([])
    setSearch('')
  }

  const hasFilters = search || selectedTags.length > 0 || selectedCountries.length > 0

  return (
    <div
      className={`h-full ${isMobile ? 'w-full' : 'w-[55%]'} shrink-0 ${GLASS.panel} border-r border-border flex flex-col overflow-hidden`}
      style={isMobile ? undefined : { minWidth: PANEL_WIDTH.dashboard.min, maxWidth: PANEL_WIDTH.dashboard.max }}
    >
      <ScrollArea className="flex-1 overflow-hidden">
        <div className="p-4 md:p-5 space-y-5 md:space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-semibold text-foreground">Konterra</h1>
              <p className="text-xs text-muted-foreground">Your network command center</p>
            </div>
            <div className="flex items-center gap-2">
              {isMobile && onSwitchToGlobe && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onSwitchToGlobe}
                  className="border-border text-muted-foreground"
                >
                  <GlobeIcon className="h-4 w-4 mr-1" />
                  Globe
                </Button>
              )}
              <Button
                size="sm"
                onClick={onAddContact}
                className="bg-orange-500 hover:bg-orange-600 text-white"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add
              </Button>
            </div>
          </div>

          <StatsRow contacts={contacts} onContactsClick={onOpenContactsBrowser} loading={contactsLoading} />

          <NetworkHealth contacts={contacts} interactions={recentInteractions} loading={contactsLoading || interactionsLoading} />

          <ReconnectAlerts contacts={contacts} onContactClick={onContactClick} loading={contactsLoading} />

          <FavorLedger favors={favors} contacts={contacts} onContactClick={onContactClick} loading={contactsLoading || favorsLoading} />

          <TopCountriesChart contacts={contacts} loading={contactsLoading} />

          <ActivityTimeline
            interactions={recentInteractions}
            onContactClick={(contactId) => {
              const c = contacts.find((x) => x.id === contactId)
              if (c) onContactClick(c)
            }}
            loading={interactionsLoading}
          />

          <Separator className="bg-border" />

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Contacts</span>
              <span className="text-xs text-muted-foreground/60">
                {filteredContacts.length} of {contacts.length}
              </span>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                ref={searchRef}
                placeholder="Search contacts... (⌘K)"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-muted/50 border-border text-foreground placeholder:text-muted-foreground/60 focus:border-ring"
              />
            </div>

            <div className="space-y-2">
              {allTags.length > 0 && (
                <div>
                  <button
                    onClick={() => setTagsExpanded(!tagsExpanded)}
                    className="flex items-center gap-1 text-xs text-muted-foreground mb-1.5 hover:text-foreground/70"
                  >
                    <ChevronDown className={`h-3 w-3 transition-transform duration-200 ${tagsExpanded ? '' : '-rotate-90'}`} />
                    Tags
                  </button>
                  {tagsExpanded && (
                    <div className="flex flex-wrap gap-1">
                      {allTags.map((tag) => (
                        <Badge
                          key={tag}
                          variant={selectedTags.includes(tag) ? 'default' : 'outline'}
                          className={`cursor-pointer text-xs ${
                            selectedTags.includes(tag)
                              ? 'bg-orange-500/20 text-orange-600 dark:text-orange-300 border-orange-500/30 hover:bg-orange-500/30'
                              : 'border-border text-muted-foreground hover:bg-muted hover:text-foreground/80'
                          }`}
                          onClick={() => toggleTag(tag)}
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {allCountries.length > 0 && (
                <div>
                  <button
                    onClick={() => setCountriesExpanded(!countriesExpanded)}
                    className="flex items-center gap-1 text-xs text-muted-foreground mb-1.5 hover:text-foreground/70"
                  >
                    <ChevronDown className={`h-3 w-3 transition-transform duration-200 ${countriesExpanded ? '' : '-rotate-90'}`} />
                    Countries
                  </button>
                  {countriesExpanded && (
                    <div className="flex flex-wrap gap-1">
                      {allCountries.map((country) => (
                        <Badge
                          key={country}
                          variant={selectedCountries.includes(country) ? 'default' : 'outline'}
                          className={`cursor-pointer text-xs ${
                            selectedCountries.includes(country)
                              ? 'bg-blue-500/20 text-blue-600 dark:text-blue-300 border-blue-500/30 hover:bg-blue-500/30'
                              : 'border-border text-muted-foreground hover:bg-muted hover:text-foreground/80'
                          }`}
                          onClick={() => toggleCountry(country)}
                        >
                          {country}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {hasFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="w-full text-muted-foreground hover:text-foreground/80 hover:bg-muted"
                >
                  <X className="h-3 w-3 mr-1" />
                  Clear filters
                </Button>
              )}
            </div>

            <div className="space-y-1">
              {contactsLoading ? Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="p-3 rounded-lg">
                  <div className="flex items-start gap-3">
                    <Skeleton className="h-9 w-9 rounded-full shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-4 w-28" />
                      <Skeleton className="h-3 w-20" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                  </div>
                </div>
              )) : filteredContacts.map((contact) => {
                const initials = contact.name
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .toUpperCase()
                  .slice(0, 2)
                const isSelected = selectedContact?.id === contact.id

                return (
                  <button
                    key={contact.id}
                    onClick={() => onContactClick(contact)}
                    className={`w-full text-left p-3 rounded-lg transition-colors ${
                      isSelected
                        ? 'bg-accent border border-accent-foreground/20'
                        : 'hover:bg-muted/50'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="relative">
                        <Avatar className={`h-9 w-9 ${
                          contact.gender === 'male'
                            ? 'ring-1 ring-blue-400/30'
                            : contact.gender === 'female'
                              ? 'ring-1 ring-pink-400/30'
                              : ''
                        }`}>
                          <AvatarImage src={contact.photo || undefined} />
                          <AvatarFallback className="text-xs bg-muted text-muted-foreground">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        <div
                          className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-background"
                          style={{
                            backgroundColor: contact.lat && contact.lng ? '#f97316' : '#6b7280',
                          }}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate text-foreground">{contact.name}</p>
                        {contact.role && (
                          <p className="text-xs text-muted-foreground truncate">{contact.role}</p>
                        )}
                        <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground/70">
                          {contact.company && (
                            <span className="flex items-center gap-1 truncate">
                              <Building2 className="h-3 w-3 shrink-0" />
                              {contact.company}
                            </span>
                          )}
                          {contact.city && (
                            <span className="flex items-center gap-1 truncate">
                              <MapPin className="h-3 w-3 shrink-0" />
                              {contact.city}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  )
}
