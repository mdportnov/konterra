'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Search, X, MapPin, Building2, ChevronDown, ChevronRight, Plus, Globe as GlobeIcon } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { GLASS } from '@/lib/constants/ui'
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip'
import { useHotkey } from '@/hooks/use-hotkey'
import StatsRow from './widgets/StatsRow'
import TopCountriesChart from './widgets/TopCountriesChart'
import ActivityTimeline from './widgets/ActivityTimeline'
import ReconnectAlerts from './widgets/ReconnectAlerts'
import NetworkHealth from './widgets/NetworkHealth'
import FavorLedger from './widgets/FavorLedger'
import ConnectionInsightsSummary from './widgets/ConnectionInsightsSummary'
import { fetchRecentInteractions, fetchAllFavors } from '@/lib/api'
import type { Contact, ContactConnection, Interaction, Favor } from '@/lib/db/schema'

interface DashboardPanelProps {
  contacts: Contact[]
  connections?: ContactConnection[]
  selectedContact: Contact | null
  onContactClick: (contact: Contact) => void
  onAddContact: () => void
  onOpenContactsBrowser?: () => void
  onOpenInsights?: () => void
  isMobile?: boolean
  onSwitchToGlobe?: () => void
  contactsLoading?: boolean
  collapsed?: boolean
  onToggleCollapse?: () => void
}

export default function DashboardPanel({
  contacts,
  connections = [],
  selectedContact,
  onContactClick,
  onAddContact,
  onOpenContactsBrowser,
  onOpenInsights,
  isMobile,
  onSwitchToGlobe,
  contactsLoading = false,
  collapsed = false,
  onToggleCollapse,
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

  const isCollapsed = collapsed && !isMobile

  return (
    <div
      className={`h-full w-full flex flex-col overflow-hidden ${isCollapsed ? `${GLASS.panel} border-r border-border` : ''}`}
    >
      <ScrollArea className="flex-1 overflow-hidden">
        <div className={isCollapsed ? 'p-3 space-y-3' : 'p-4 md:p-5 space-y-5 md:space-y-6'}>
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <h1 className={`${isCollapsed ? 'text-sm' : 'text-lg'} font-semibold text-foreground truncate`}>Konterra</h1>
              {!isCollapsed && <p className="text-xs text-muted-foreground">Your network command center</p>}
            </div>
            <div className="flex items-center gap-1 shrink-0">
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
              {!isCollapsed && (
                <Button
                  size="sm"
                  onClick={onAddContact}
                  className="bg-orange-500 hover:bg-orange-600 text-white"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add
                </Button>
              )}
              {isCollapsed && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={onAddContact}
                        className="h-7 w-7 shrink-0 text-orange-500 hover:text-orange-600"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="text-xs">Add contact</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              {isCollapsed && onToggleCollapse && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={onToggleCollapse}
                        className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="text-xs">
                      Expand dashboard
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          </div>

          {!isCollapsed && (
            <>
              <StatsRow contacts={contacts} onContactsClick={onOpenContactsBrowser} loading={contactsLoading} />
              <NetworkHealth contacts={contacts} interactions={recentInteractions} loading={contactsLoading || interactionsLoading} />
              <ReconnectAlerts contacts={contacts} onContactClick={onContactClick} loading={contactsLoading} />
              <FavorLedger favors={favors} contacts={contacts} onContactClick={onContactClick} loading={contactsLoading || favorsLoading} />
              <ConnectionInsightsSummary
                contacts={contacts}
                connections={connections}
                interactions={recentInteractions}
                favors={favors}
                onOpenInsights={onOpenInsights || (() => {})}
                loading={contactsLoading || interactionsLoading || favorsLoading}
              />
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
            </>
          )}

          <div className="space-y-3">
            {!isCollapsed && (
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Contacts</span>
                <span className="text-xs text-muted-foreground/60">
                  {filteredContacts.length} of {contacts.length}
                </span>
              </div>
            )}

            <div className="relative">
              <Search className={`absolute ${isCollapsed ? 'left-2.5' : 'left-3'} top-1/2 -translate-y-1/2 ${isCollapsed ? 'h-3.5 w-3.5' : 'h-4 w-4'} text-muted-foreground`} />
              <Input
                ref={searchRef}
                placeholder={isCollapsed ? 'Search...' : 'Search contacts... (\u2318K)'}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className={`${isCollapsed ? 'pl-8 h-7 text-xs' : 'pl-9'} bg-muted/50 border-border text-foreground placeholder:text-muted-foreground/60 focus:border-ring`}
              />
            </div>

            {!isCollapsed && (
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
            )}

            <div className={isCollapsed ? 'space-y-0.5' : 'space-y-1'}>
              {contactsLoading ? Array.from({ length: isCollapsed ? 8 : 6 }).map((_, i) => (
                <div key={i} className={isCollapsed ? 'flex items-center gap-2 p-1.5 rounded-md' : 'p-3 rounded-lg'}>
                  {isCollapsed ? (
                    <>
                      <Skeleton className="h-7 w-7 rounded-full shrink-0" />
                      <Skeleton className="h-3 w-20" />
                    </>
                  ) : (
                    <div className="flex items-start gap-3">
                      <Skeleton className="h-9 w-9 rounded-full shrink-0" />
                      <div className="flex-1 space-y-1.5">
                        <Skeleton className="h-4 w-28" />
                        <Skeleton className="h-3 w-20" />
                        <Skeleton className="h-3 w-32" />
                      </div>
                    </div>
                  )}
                </div>
              )) : filteredContacts.map((contact) => {
                const initials = contact.name
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .toUpperCase()
                  .slice(0, 2)
                const isSelected = selectedContact?.id === contact.id

                if (isCollapsed) {
                  return (
                    <button
                      key={contact.id}
                      onClick={() => onContactClick(contact)}
                      className={`w-full text-left flex items-center gap-2 p-1.5 rounded-md transition-colors ${
                        isSelected
                          ? 'bg-accent border border-accent-foreground/20'
                          : 'hover:bg-muted/50'
                      }`}
                    >
                      <Avatar className={`h-7 w-7 shrink-0 ${
                        contact.gender === 'male'
                          ? 'ring-1 ring-blue-400/30'
                          : contact.gender === 'female'
                            ? 'ring-1 ring-pink-400/30'
                            : ''
                      }`}>
                        <AvatarImage src={contact.photo || undefined} />
                        <AvatarFallback className="text-[10px] bg-muted text-muted-foreground">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs font-medium truncate text-foreground">{contact.name}</span>
                    </button>
                  )
                }

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
