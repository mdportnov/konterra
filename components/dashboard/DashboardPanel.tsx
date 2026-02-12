'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Search, X, MapPin, Building2, ChevronDown, ChevronRight, Plus, Globe as GlobeIcon, Settings, Sparkles, LogOut, Star, SlidersHorizontal, ArrowUpDown } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { GLASS } from '@/lib/constants/ui'
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip'
import { useHotkey } from '@/hooks/use-hotkey'
import { useSession, signOut } from 'next-auth/react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import StatsRow from './widgets/StatsRow'
import TopCountriesChart from './widgets/TopCountriesChart'
import ActivityTimeline from './widgets/ActivityTimeline'
import ReconnectAlerts from './widgets/ReconnectAlerts'
import NetworkHealth from './widgets/NetworkHealth'
import FavorLedger from './widgets/FavorLedger'
import ConnectionInsightsSummary from './widgets/ConnectionInsightsSummary'
import ContactDetailContent from '@/components/globe/ContactDetailContent'
import { fetchRecentInteractions, fetchAllFavors } from '@/lib/api'
import type { Contact, ContactConnection, ContactCountryConnection, Interaction, Favor } from '@/lib/db/schema'
import type { ConnectedContact } from '@/components/globe/ContactDetail'
import type { SidebarView } from '@/hooks/use-panel-navigation'

type SortKey = 'name' | 'rating' | 'lastContacted' | 'updatedAt'
const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'name', label: 'Name' },
  { key: 'rating', label: 'Rating' },
  { key: 'lastContacted', label: 'Last contacted' },
  { key: 'updatedAt', label: 'Recently updated' },
]
const PAGE_SIZE = 50
const RELATIONSHIP_TYPES = ['friend', 'business', 'investor', 'conference', 'mentor', 'colleague', 'family', 'dating'] as const

interface DashboardPanelProps {
  contacts: Contact[]
  connections?: ContactConnection[]
  selectedContact: Contact | null
  sidebarView: SidebarView
  onContactClick: (contact: Contact) => void
  onBackToList: () => void
  onAddContact: () => void
  onEditContact?: (contact: Contact) => void
  onDeleteContact?: (contactId: string) => void
  connectedContacts?: ConnectedContact[]
  onConnectedContactClick?: (cc: ConnectedContact) => void
  allContacts?: Contact[]
  onCountryConnectionsChange?: (contactId: string, connections: ContactCountryConnection[]) => void
  onOpenInsights?: () => void
  onOpenSettings?: () => void
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
  sidebarView,
  onContactClick,
  onBackToList,
  onAddContact,
  onEditContact,
  onDeleteContact,
  connectedContacts = [],
  onConnectedContactClick,
  allContacts,
  onCountryConnectionsChange,
  onOpenInsights,
  onOpenSettings,
  isMobile,
  onSwitchToGlobe,
  contactsLoading = false,
  collapsed = false,
  onToggleCollapse,
}: DashboardPanelProps) {
  const { data: session } = useSession()
  const [search, setSearch] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [selectedCountries, setSelectedCountries] = useState<string[]>([])
  const [selectedRatings, setSelectedRatings] = useState<Set<number>>(new Set())
  const [selectedRelTypes, setSelectedRelTypes] = useState<string[]>([])
  const [tagsExpanded, setTagsExpanded] = useState(false)
  const [countriesExpanded, setCountriesExpanded] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [sortKey, setSortKey] = useState<SortKey>('name')
  const [currentPage, setCurrentPage] = useState(1)
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

  const activeRelTypes = useMemo(() => {
    const types = new Set<string>()
    contacts.forEach((c) => { if (c.relationshipType) types.add(c.relationshipType) })
    return RELATIONSHIP_TYPES.filter((t) => types.has(t))
  }, [contacts])

  const activeFilterCount = selectedTags.length + selectedRatings.size + selectedRelTypes.length + selectedCountries.length

  const filteredContacts = useMemo(() => {
    const filtered = contacts.filter((c) => {
      const query = search.toLowerCase()
      const matchesSearch =
        !search ||
        c.name.toLowerCase().includes(query) ||
        c.company?.toLowerCase().includes(query) ||
        c.role?.toLowerCase().includes(query) ||
        c.city?.toLowerCase().includes(query) ||
        c.country?.toLowerCase().includes(query)
      const matchesTags =
        selectedTags.length === 0 || c.tags?.some((t) => selectedTags.includes(t))
      const matchesCountry =
        selectedCountries.length === 0 || selectedCountries.includes(c.country || '')
      const matchesRating =
        selectedRatings.size === 0 || (c.rating != null && selectedRatings.has(c.rating))
      const matchesRelType =
        selectedRelTypes.length === 0 || (c.relationshipType != null && selectedRelTypes.includes(c.relationshipType))
      return matchesSearch && matchesTags && matchesCountry && matchesRating && matchesRelType
    })
    const sorted = [...filtered]
    switch (sortKey) {
      case 'name':
        sorted.sort((a, b) => a.name.localeCompare(b.name))
        break
      case 'rating':
        sorted.sort((a, b) => (b.rating || 0) - (a.rating || 0))
        break
      case 'lastContacted':
        sorted.sort((a, b) => {
          const da = a.lastContactedAt ? new Date(a.lastContactedAt).getTime() : 0
          const db = b.lastContactedAt ? new Date(b.lastContactedAt).getTime() : 0
          return db - da
        })
        break
      case 'updatedAt':
        sorted.sort((a, b) => {
          const da = a.updatedAt ? new Date(a.updatedAt).getTime() : 0
          const db = b.updatedAt ? new Date(b.updatedAt).getTime() : 0
          return db - da
        })
        break
    }
    return sorted
  }, [contacts, search, selectedTags, selectedCountries, selectedRatings, selectedRelTypes, sortKey])

  useEffect(() => { setCurrentPage(1) }, [search, selectedTags, selectedCountries, selectedRatings, selectedRelTypes])

  const totalPages = Math.ceil(filteredContacts.length / PAGE_SIZE)
  const pagedContacts = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE
    return filteredContacts.slice(start, start + PAGE_SIZE)
  }, [filteredContacts, currentPage])

  const toggleTag = (tag: string) =>
    setSelectedTags((prev) => prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag])

  const toggleCountry = (country: string) =>
    setSelectedCountries((prev) => prev.includes(country) ? prev.filter((c) => c !== country) : [...prev, country])

  const toggleRating = (r: number) =>
    setSelectedRatings((prev) => {
      const next = new Set(prev)
      if (next.has(r)) next.delete(r)
      else next.add(r)
      return next
    })

  const toggleRelType = (t: string) =>
    setSelectedRelTypes((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]
    )

  const clearFilters = () => {
    setSelectedTags([])
    setSelectedCountries([])
    setSelectedRatings(new Set())
    setSelectedRelTypes([])
    setSearch('')
    setCurrentPage(1)
  }

  const hasFilters = search || selectedTags.length > 0 || selectedCountries.length > 0 || selectedRatings.size > 0 || selectedRelTypes.length > 0

  const isCollapsed = collapsed && !isMobile

  if (sidebarView === 'detail' && selectedContact) {
    return (
      <div className={`h-full w-full flex flex-col overflow-hidden ${isCollapsed ? `${GLASS.panel} border-r border-border` : ''}`}>
        <ContactDetailContent
          contact={selectedContact}
          onEdit={(c) => onEditContact?.(c)}
          onDelete={onDeleteContact}
          onBack={onBackToList}
          connectedContacts={connectedContacts}
          onConnectedContactClick={onConnectedContactClick}
          allContacts={allContacts}
          onCountryConnectionsChange={onCountryConnectionsChange}
        />
      </div>
    )
  }

  return (
    <div
      className={`h-full w-full flex flex-col overflow-hidden ${isCollapsed ? `${GLASS.panel} border-r border-border` : ''}`}
    >
      <div className={isCollapsed ? 'p-3 pb-0' : 'px-4 pt-4 md:px-5 md:pt-5'}>
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className={`${isCollapsed ? 'text-sm' : 'text-lg'} font-semibold text-foreground truncate hover:text-foreground/80 transition-colors cursor-pointer`}>
                  Konterra
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                {session?.user && (
                  <>
                    <div className="flex items-center gap-2 px-2 py-1.5">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={session.user.image || undefined} />
                        <AvatarFallback className="text-xs bg-muted text-muted-foreground">
                          {session.user.name?.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) || '?'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{session.user.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{session.user.email}</p>
                      </div>
                    </div>
                    <DropdownMenuSeparator />
                  </>
                )}
                <DropdownMenuItem onClick={onAddContact}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Contact
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onOpenInsights}>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Insights
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onOpenSettings}>
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => signOut({ callbackUrl: '/login' })}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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
      </div>

      <ScrollArea className="flex-1 overflow-hidden">
        <div className={isCollapsed ? 'p-3 space-y-3' : 'p-4 md:p-5 space-y-5 md:space-y-6'}>
          {!isCollapsed && (
            <>
              <StatsRow contacts={contacts} loading={contactsLoading} />
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
                <button
                  onClick={() => setFiltersOpen(!filtersOpen)}
                  className="flex items-center gap-1.5 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                >
                  <SlidersHorizontal className="h-3 w-3" />
                  <span>Filters</span>
                  {activeFilterCount > 0 && (
                    <Badge className="bg-orange-500/20 text-orange-500 border-orange-500/30 text-[9px] px-1 py-0 h-3.5 leading-none">
                      {activeFilterCount}
                    </Badge>
                  )}
                </button>

                {filtersOpen && (
                  <div className="space-y-2 animate-in fade-in slide-in-from-top-1 duration-150">
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
                                className={`cursor-pointer text-[10px] shrink-0 ${
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
                                className={`cursor-pointer text-[10px] shrink-0 ${
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

                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((r) => (
                        <button
                          key={r}
                          onClick={() => toggleRating(r)}
                          className="p-0.5 transition-colors"
                        >
                          <Star
                            className={`h-3.5 w-3.5 ${
                              selectedRatings.has(r)
                                ? 'text-orange-400 fill-orange-400'
                                : 'text-muted-foreground/30'
                            }`}
                          />
                        </button>
                      ))}
                      {selectedRatings.size > 0 && (
                        <span className="text-[9px] text-muted-foreground/50 ml-1">rating</span>
                      )}
                    </div>

                    {activeRelTypes.length > 0 && (
                      <div className="flex gap-1 overflow-x-auto pb-0.5 scrollbar-none">
                        {activeRelTypes.map((t) => (
                          <Badge
                            key={t}
                            variant={selectedRelTypes.includes(t) ? 'default' : 'outline'}
                            className={`cursor-pointer text-[10px] shrink-0 capitalize ${
                              selectedRelTypes.includes(t)
                                ? 'bg-blue-500/20 text-blue-600 dark:text-blue-300 border-blue-500/30 hover:bg-blue-500/30'
                                : 'border-border text-muted-foreground hover:bg-muted hover:text-foreground/80'
                            }`}
                            onClick={() => toggleRelType(t)}
                          >
                            {t}
                          </Badge>
                        ))}
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

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground/50">{filteredContacts.length} result{filteredContacts.length !== 1 ? 's' : ''}</span>
                    <div className="flex items-center gap-0.5">
                      <ArrowUpDown className="h-2.5 w-2.5 text-muted-foreground/40" />
                      <select
                        value={sortKey}
                        onChange={(e) => setSortKey(e.target.value as SortKey)}
                        className="text-[10px] text-muted-foreground/60 bg-transparent border-none outline-none cursor-pointer hover:text-muted-foreground"
                      >
                        {SORT_OPTIONS.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
                      </select>
                    </div>
                  </div>
                  {totalPages > 1 && (
                    <PaginationRow current={currentPage} total={totalPages} onChange={setCurrentPage} />
                  )}
                </div>
              </div>
            )}

            <div className={isCollapsed ? 'space-y-0.5' : 'space-y-0.5'}>
              {contactsLoading ? Array.from({ length: isCollapsed ? 8 : 6 }).map((_, i) => (
                <div key={i} className={isCollapsed ? 'flex items-center gap-2 p-1.5 rounded-md' : 'flex items-center gap-2 px-2 py-1.5'}>
                  <Skeleton className="h-7 w-7 rounded-full shrink-0" />
                  <div className="flex-1 space-y-1">
                    <Skeleton className="h-3.5 w-28" />
                    {!isCollapsed && <Skeleton className="h-3 w-20" />}
                  </div>
                </div>
              )) : (isCollapsed ? filteredContacts : pagedContacts).map((contact) => {
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
                  <ContactRow key={contact.id} contact={contact} onSelect={onContactClick} />
                )
              })}
              {!contactsLoading && filteredContacts.length === 0 && (
                <p className="text-xs text-muted-foreground/60 text-center py-6">No contacts found</p>
              )}
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  )
}

function PaginationRow({ current, total, onChange }: { current: number; total: number; onChange: (p: number) => void }) {
  const pages: (number | '...')[] = []
  if (total <= 5) {
    for (let i = 1; i <= total; i++) pages.push(i)
  } else {
    pages.push(1)
    if (current > 3) pages.push('...')
    const start = Math.max(2, current - 1)
    const end = Math.min(total - 1, current + 1)
    for (let i = start; i <= end; i++) pages.push(i)
    if (current < total - 2) pages.push('...')
    pages.push(total)
  }

  return (
    <div className="flex items-center gap-0.5">
      {pages.map((p, i) =>
        p === '...' ? (
          <span key={`e${i}`} className="text-[10px] text-muted-foreground/40 px-0.5">...</span>
        ) : (
          <button
            key={p}
            onClick={() => onChange(p)}
            className={`h-5 min-w-5 px-1 rounded text-[10px] font-medium transition-colors ${
              p === current
                ? 'bg-accent text-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            }`}
          >
            {p}
          </button>
        )
      )}
    </div>
  )
}

function ContactRow({ contact, onSelect }: { contact: Contact; onSelect: (c: Contact) => void }) {
  const initials = contact.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <button
      onClick={() => onSelect(contact)}
      className="w-full text-left px-2 py-1.5 rounded-md hover:bg-muted/50 flex items-center gap-2 transition-colors"
    >
      <Avatar className="h-7 w-7 shrink-0">
        <AvatarImage src={contact.photo || undefined} />
        <AvatarFallback className="text-[10px] bg-muted text-muted-foreground">
          {initials}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-foreground truncate">{contact.name}</p>
        {(contact.role || contact.company) && (
          <p className="text-[10px] text-muted-foreground truncate">
            {[contact.role, contact.company].filter(Boolean).join(' \u00b7 ')}
          </p>
        )}
      </div>
      {contact.rating && contact.rating > 0 && (
        <div className="flex items-center gap-0.5 shrink-0">
          <Star className="h-2.5 w-2.5 text-orange-400 fill-orange-400" />
          <span className="text-[10px] text-muted-foreground">{contact.rating}</span>
        </div>
      )}
    </button>
  )
}
