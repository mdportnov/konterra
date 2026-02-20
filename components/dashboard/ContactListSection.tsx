'use client'

import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Search, X, ChevronDown, Star, SlidersHorizontal, ArrowUpDown, List, LayoutGrid, Rows3, CheckSquare, Square, Trash2, Tag, MapPin, Clock, Bookmark, Save, Home } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip'
import { useHotkey } from '@/hooks/use-hotkey'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuLabel } from '@/components/ui/dropdown-menu'
import { useSavedViews } from '@/hooks/use-saved-views'
import { countryFlag } from '@/lib/country-flags'
import GettingStartedCard from './GettingStartedCard'
import StatsRow from './widgets/StatsRow'
import TopCountriesChart from './widgets/TopCountriesChart'
import ActivityTimeline from './widgets/ActivityTimeline'
import ReconnectAlerts from './widgets/ReconnectAlerts'
import NetworkHealth from './widgets/NetworkHealth'
import FavorLedger from './widgets/FavorLedger'
import ConnectionInsightsSummary from './widgets/ConnectionInsightsSummary'
import { fetchRecentInteractions, fetchAllFavors, bulkDeleteContacts, bulkTagContacts } from '@/lib/api'
import type { Contact, ContactConnection, Interaction, Favor } from '@/lib/db/schema'

type SortKey = 'name' | 'rating' | 'lastContacted' | 'updatedAt'
type ViewMode = 'list' | 'grid' | 'compact'

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'name', label: 'Name' },
  { key: 'rating', label: 'Rating' },
  { key: 'lastContacted', label: 'Last contacted' },
  { key: 'updatedAt', label: 'Recently updated' },
]
const PAGE_SIZE = 50
const RELATIONSHIP_TYPES = ['friend', 'business', 'investor', 'conference', 'mentor', 'colleague', 'family', 'dating'] as const
const VIEW_MODE_KEY = 'konterra-view-mode'

interface ContactListSectionProps {
  contacts: Contact[]
  connections: ContactConnection[]
  selectedContact: Contact | null
  onContactClick: (contact: Contact) => void
  onAddContact: () => void
  onOpenInsights?: () => void
  onOpenProfile?: () => void
  contactsLoading: boolean
  onSelectionChange?: (ids: Set<string>) => void
  onBulkDelete?: (ids: string[]) => void
  onReloadContacts?: () => void
}

export default function ContactListSection({
  contacts,
  connections,
  selectedContact,
  onContactClick,
  onAddContact,
  onOpenInsights,
  onOpenProfile,
  contactsLoading,
  onSelectionChange,
  onBulkDelete,
  onReloadContacts,
}: ContactListSectionProps) {
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

  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    try { return (localStorage.getItem(VIEW_MODE_KEY) as ViewMode) || 'list' } catch { return 'list' }
  })
  const [selectMode, setSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkTagInput, setBulkTagInput] = useState('')
  const [showBulkTagInput, setShowBulkTagInput] = useState(false)
  const [bulkActionLoading, setBulkActionLoading] = useState(false)

  const { views: savedViews, saveView, deleteView, loadView } = useSavedViews()

  const handleSaveView = useCallback(() => {
    const name = prompt('View name:')
    if (!name?.trim()) return
    saveView(name.trim(), {
      tags: selectedTags,
      countries: selectedCountries,
      ratings: [...selectedRatings],
      relTypes: selectedRelTypes,
      sortKey,
    })
    toast.success(`Saved view "${name.trim()}"`)
  }, [selectedTags, selectedCountries, selectedRatings, selectedRelTypes, sortKey, saveView])

  const handleLoadView = useCallback((name: string) => {
    const view = loadView(name)
    if (!view) return
    setSelectedTags(view.tags)
    setSelectedCountries(view.countries)
    setSelectedRatings(new Set(view.ratings))
    setSelectedRelTypes(view.relTypes)
    setSortKey(view.sortKey as SortKey)
    setFiltersOpen(true)
    toast.success(`Loaded view "${name}"`)
  }, [loadView])

  const handleDeleteView = useCallback((name: string) => {
    deleteView(name)
    toast.success(`Deleted view "${name}"`)
  }, [deleteView])

  useEffect(() => {
    try { localStorage.setItem(VIEW_MODE_KEY, viewMode) } catch {}
  }, [viewMode])

  useEffect(() => {
    onSelectionChange?.(selectedIds)
  }, [selectedIds, onSelectionChange])

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

  useHotkey('/', () => searchRef.current?.focus())

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

  const toggleSelectContact = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(pagedContacts.map((c) => c.id)))
  }, [pagedContacts])

  const deselectAll = useCallback(() => {
    setSelectedIds(new Set())
  }, [])

  const exitSelectMode = useCallback(() => {
    setSelectMode(false)
    setSelectedIds(new Set())
    setShowBulkTagInput(false)
    setBulkTagInput('')
  }, [])

  const handleBulkDelete = useCallback(() => {
    if (selectedIds.size === 0) return
    const ids = [...selectedIds]
    onBulkDelete?.(ids)
    exitSelectMode()

    let cancelled = false
    const timer = setTimeout(() => {
      if (cancelled) return
      bulkDeleteContacts(ids).catch(() => {
        toast.error('Failed to delete contacts')
        onReloadContacts?.()
      })
    }, 5000)

    toast(`Deleted ${ids.length} contact${ids.length !== 1 ? 's' : ''}`, {
      action: {
        label: 'Undo',
        onClick: () => {
          cancelled = true
          clearTimeout(timer)
          onReloadContacts?.()
        },
      },
      duration: 5000,
    })
  }, [selectedIds, onBulkDelete, onReloadContacts, exitSelectMode])

  const handleBulkAddTag = useCallback(async () => {
    if (selectedIds.size === 0 || !bulkTagInput.trim()) return
    const ids = [...selectedIds]
    setBulkActionLoading(true)
    try {
      const result = await bulkTagContacts(ids, 'addTag', bulkTagInput.trim())
      toast.success(`Tagged ${result.updated} contact${result.updated !== 1 ? 's' : ''}`)
      onReloadContacts?.()
      setShowBulkTagInput(false)
      setBulkTagInput('')
    } catch {
      toast.error('Failed to add tag')
    } finally {
      setBulkActionLoading(false)
    }
  }, [selectedIds, bulkTagInput, onReloadContacts])

  const handleBulkRemoveTag = useCallback(async (tag: string) => {
    if (selectedIds.size === 0) return
    const ids = [...selectedIds]
    setBulkActionLoading(true)
    try {
      const result = await bulkTagContacts(ids, 'removeTag', tag)
      toast.success(`Removed tag from ${result.updated} contact${result.updated !== 1 ? 's' : ''}`)
      onReloadContacts?.()
    } catch {
      toast.error('Failed to remove tag')
    } finally {
      setBulkActionLoading(false)
    }
  }, [selectedIds, onReloadContacts])

  const handleContactClickWithSelect = useCallback((contact: Contact) => {
    if (selectMode) {
      toggleSelectContact(contact.id)
    } else {
      onContactClick(contact)
    }
  }, [selectMode, toggleSelectContact, onContactClick])

  const commonTagsInSelection = useMemo(() => {
    if (selectedIds.size === 0) return []
    const tagCounts = new Map<string, number>()
    contacts.filter((c) => selectedIds.has(c.id)).forEach((c) => {
      c.tags?.forEach((t) => tagCounts.set(t, (tagCounts.get(t) || 0) + 1))
    })
    return Array.from(tagCounts.entries())
      .filter(([, count]) => count > 0)
      .sort(([, a], [, b]) => b - a)
      .map(([tag]) => tag)
  }, [selectedIds, contacts])

  const selfContact = contacts.find((c) => c.isSelf)
  const nonSelfContacts = contacts.filter((c) => !c.isSelf)

  return (
    <div className="p-4 md:p-5 space-y-5 md:space-y-6">
      {selfContact && <SelfProfileCard contact={selfContact} onOpenProfile={onOpenProfile || (() => {})} />}
      {!contactsLoading && contacts.length < 3 && (
        <GettingStartedCard
          contacts={contacts}
          connections={connections}
          recentInteractions={recentInteractions}
          onAddContact={onAddContact}
          onOpenProfile={onOpenProfile || (() => {})}
        />
      )}
      <StatsRow contacts={contacts} loading={contactsLoading} />
      {nonSelfContacts.length > 0 && (
        <NetworkHealth contacts={contacts} interactions={recentInteractions} loading={contactsLoading || interactionsLoading} />
      )}
      <ReconnectAlerts contacts={contacts} onContactClick={onContactClick} loading={contactsLoading} />
      <FavorLedger favors={favors} contacts={contacts} onContactClick={onContactClick} loading={contactsLoading || favorsLoading} />
      {nonSelfContacts.length > 0 && (
        <ConnectionInsightsSummary
          contacts={contacts}
          connections={connections}
          interactions={recentInteractions}
          favors={favors}
          onOpenInsights={onOpenInsights || (() => {})}
          loading={contactsLoading || interactionsLoading || favorsLoading}
        />
      )}
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
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground/60">
              {filteredContacts.length} of {contacts.length}
            </span>
            <ViewModeToggle mode={viewMode} onChange={setViewMode} />
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => selectMode ? exitSelectMode() : setSelectMode(true)}
                    className={`p-1 rounded-md transition-colors ${selectMode ? 'text-orange-500 bg-orange-500/10' : 'text-muted-foreground/60 hover:text-muted-foreground'}`}
                  >
                    <CheckSquare className="h-3.5 w-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  {selectMode ? 'Exit selection' : 'Select contacts'}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        {selectMode && (
          <BulkActionBar
            selectedCount={selectedIds.size}
            totalVisible={pagedContacts.length}
            onSelectAll={selectAll}
            onDeselectAll={deselectAll}
            onDelete={handleBulkDelete}
            onAddTag={() => setShowBulkTagInput(!showBulkTagInput)}
            loading={bulkActionLoading}
            showTagInput={showBulkTagInput}
            tagInput={bulkTagInput}
            onTagInputChange={setBulkTagInput}
            onTagSubmit={handleBulkAddTag}
            commonTags={commonTagsInSelection}
            onRemoveTag={handleBulkRemoveTag}
            allTags={allTags}
            onExit={exitSelectMode}
          />
        )}

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            ref={searchRef}
            placeholder="Search contacts... (/)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-muted/50 border-border text-foreground placeholder:text-muted-foreground/60 focus:border-ring"
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2">
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
            {activeFilterCount > 0 && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={handleSaveView}
                      className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <Save className="h-3 w-3" />
                      <span>Save view</span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">Save current filters as a view</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            {savedViews.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors">
                    <Bookmark className="h-3 w-3" />
                    <span>Views</span>
                    <Badge className="bg-muted text-muted-foreground border-border text-[9px] px-1 py-0 h-3.5 leading-none">
                      {savedViews.length}
                    </Badge>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-52">
                  <DropdownMenuLabel className="text-[10px] text-muted-foreground">Saved Views</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {savedViews.map((v) => (
                    <DropdownMenuItem
                      key={v.name}
                      className="flex items-center justify-between gap-2 text-xs"
                      onSelect={(e) => e.preventDefault()}
                    >
                      <button
                        className="flex-1 text-left truncate"
                        onClick={() => handleLoadView(v.name)}
                      >
                        {v.name}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteView(v.name)
                        }}
                        className="shrink-0 p-0.5 rounded text-muted-foreground/50 hover:text-red-500 transition-colors"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

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
                            {countryFlag(country)} {country}
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
                    aria-label="Sort contacts by"
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

        {contactsLoading ? (
          <ContactListSkeleton viewMode={viewMode} />
        ) : (
          <ContactListView
            contacts={pagedContacts}
            viewMode={viewMode}
            selectMode={selectMode}
            selectedIds={selectedIds}
            selectedContact={selectedContact}
            onContactClick={handleContactClickWithSelect}
            onToggleSelect={toggleSelectContact}
          />
        )}
        {!contactsLoading && filteredContacts.length === 0 && (
          <p className="text-xs text-muted-foreground/60 text-center py-6">No contacts found</p>
        )}
      </div>
    </div>
  )
}

function SelfProfileCard({ contact, onOpenProfile }: { contact: Contact; onOpenProfile: () => void }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border">
      <Avatar className="h-9 w-9 shrink-0">
        <AvatarImage src={contact.photo || undefined} />
        <AvatarFallback className="text-xs bg-orange-500/15 text-orange-500">
          {contact.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-foreground truncate">{contact.name}</p>
        <p className="text-[10px] text-muted-foreground truncate">
          {[contact.city, contact.country].filter(Boolean).join(', ')
            ? <>{[contact.city, contact.country].filter(Boolean).join(', ')} {countryFlag(contact.country)}</>
            : (
            <button onClick={onOpenProfile} className="text-orange-500 hover:text-orange-600 transition-colors cursor-pointer">
              Set your location
            </button>
          )}
        </p>
      </div>
      {contact.timezone && (
        <span className="text-[10px] text-muted-foreground/60 shrink-0">{contact.timezone}</span>
      )}
      {!contact.country && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button onClick={onOpenProfile} className="text-muted-foreground/40 hover:text-foreground transition-colors cursor-pointer">
                <Home className="h-3.5 w-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">Set home base</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  )
}

function ViewModeToggle({ mode, onChange }: { mode: ViewMode; onChange: (m: ViewMode) => void }) {
  const modes: { key: ViewMode; icon: typeof List; label: string }[] = [
    { key: 'list', icon: List, label: 'List' },
    { key: 'grid', icon: LayoutGrid, label: 'Grid' },
    { key: 'compact', icon: Rows3, label: 'Compact' },
  ]

  return (
    <TooltipProvider>
      <div className="flex items-center gap-0.5 bg-muted/50 rounded-md p-0.5">
        {modes.map(({ key, icon: Icon, label }) => (
          <Tooltip key={key}>
            <TooltipTrigger asChild>
              <button
                onClick={() => onChange(key)}
                className={`p-1 rounded-md transition-colors ${
                  mode === key
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground/60 hover:text-muted-foreground'
                }`}
              >
                <Icon className="h-3 w-3" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">{label} view</TooltipContent>
          </Tooltip>
        ))}
      </div>
    </TooltipProvider>
  )
}

function BulkActionBar({
  selectedCount,
  totalVisible,
  onSelectAll,
  onDeselectAll,
  onDelete,
  onAddTag,
  loading,
  showTagInput,
  tagInput,
  onTagInputChange,
  onTagSubmit,
  commonTags,
  onRemoveTag,
  allTags,
  onExit,
}: {
  selectedCount: number
  totalVisible: number
  onSelectAll: () => void
  onDeselectAll: () => void
  onDelete: () => void
  onAddTag: () => void
  loading: boolean
  showTagInput: boolean
  tagInput: string
  onTagInputChange: (v: string) => void
  onTagSubmit: () => void
  commonTags: string[]
  onRemoveTag: (tag: string) => void
  allTags: string[]
  onExit: () => void
}) {
  return (
    <div className="space-y-2 animate-in fade-in slide-in-from-top-1 duration-150">
      <div className="flex items-center gap-2 bg-muted/50 rounded-lg p-2">
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <span className="text-[10px] font-medium text-foreground shrink-0">
            {selectedCount} selected
          </span>
          <button
            onClick={selectedCount === totalVisible ? onDeselectAll : onSelectAll}
            className="text-[10px] text-orange-500 hover:text-orange-600 transition-colors shrink-0"
          >
            {selectedCount === totalVisible ? 'Deselect all' : 'Select all'}
          </button>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={onAddTag}
                  disabled={loading || selectedCount === 0}
                  className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-background transition-colors disabled:opacity-40"
                >
                  <Tag className="h-3.5 w-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">Tag selected</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={onDelete}
                  disabled={loading || selectedCount === 0}
                  className="p-1.5 rounded-md text-red-500 hover:text-red-600 hover:bg-red-500/10 transition-colors disabled:opacity-40"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">Delete selected</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <button
            onClick={onExit}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-background transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {showTagInput && (
        <div className="space-y-1.5 bg-muted/30 rounded-lg p-2">
          <div className="flex gap-1.5">
            <Input
              value={tagInput}
              onChange={(e) => onTagInputChange(e.target.value)}
              placeholder="Tag name..."
              className="h-7 text-xs bg-background"
              onKeyDown={(e) => { if (e.key === 'Enter') onTagSubmit() }}
            />
            <Button
              size="sm"
              onClick={onTagSubmit}
              disabled={loading || !tagInput.trim()}
              className="h-7 px-2 text-xs bg-orange-500 hover:bg-orange-600 text-white shrink-0"
            >
              Add
            </Button>
          </div>
          {allTags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {allTags.slice(0, 10).map((t) => (
                <button
                  key={t}
                  onClick={() => onTagInputChange(t)}
                  className="text-[10px] px-1.5 py-0.5 rounded-md bg-muted hover:bg-muted/80 text-muted-foreground transition-colors"
                >
                  {t}
                </button>
              ))}
            </div>
          )}
          {commonTags.length > 0 && (
            <div>
              <span className="text-[9px] text-muted-foreground/50 uppercase tracking-wider">Remove tag:</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {commonTags.slice(0, 8).map((t) => (
                  <button
                    key={t}
                    onClick={() => onRemoveTag(t)}
                    className="text-[10px] px-1.5 py-0.5 rounded-md bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors flex items-center gap-0.5"
                  >
                    <X className="h-2.5 w-2.5" />
                    {t}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function ContactListSkeleton({ viewMode }: { viewMode: ViewMode }) {
  if (viewMode === 'grid') {
    return (
      <div className="grid grid-cols-2 gap-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-border p-3 space-y-2">
            <Skeleton className="h-10 w-10 rounded-full mx-auto" />
            <Skeleton className="h-3.5 w-20 mx-auto" />
            <Skeleton className="h-3 w-16 mx-auto" />
          </div>
        ))}
      </div>
    )
  }
  return (
    <div className="space-y-0.5">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-2 px-2 py-1.5">
          <Skeleton className="h-7 w-7 rounded-full shrink-0" />
          <div className="flex-1 space-y-1">
            <Skeleton className="h-3.5 w-28" />
            {viewMode !== 'compact' && <Skeleton className="h-3 w-20" />}
          </div>
        </div>
      ))}
    </div>
  )
}

function ContactListView({
  contacts,
  viewMode,
  selectMode,
  selectedIds,
  selectedContact,
  onContactClick,
  onToggleSelect,
}: {
  contacts: Contact[]
  viewMode: ViewMode
  selectMode: boolean
  selectedIds: Set<string>
  selectedContact: Contact | null
  onContactClick: (c: Contact) => void
  onToggleSelect: (id: string) => void
}) {
  if (viewMode === 'grid') {
    return (
      <div className="grid grid-cols-2 gap-2">
        {contacts.map((contact) => (
          <ContactCard
            key={contact.id}
            contact={contact}
            selectMode={selectMode}
            isChecked={selectedIds.has(contact.id)}
            isSelected={selectedContact?.id === contact.id}
            onClick={() => onContactClick(contact)}
            onToggleSelect={() => onToggleSelect(contact.id)}
          />
        ))}
      </div>
    )
  }

  if (viewMode === 'compact') {
    return (
      <div className="space-y-0">
        <div className="grid grid-cols-[auto_1fr_auto_auto] gap-x-2 text-[9px] uppercase tracking-wider text-muted-foreground/50 px-2 pb-1 border-b border-border/50">
          {selectMode && <span />}
          <span>Name</span>
          <span>Location</span>
          <span>Rating</span>
        </div>
        {contacts.map((contact) => (
          <ContactCompactRow
            key={contact.id}
            contact={contact}
            selectMode={selectMode}
            isChecked={selectedIds.has(contact.id)}
            isSelected={selectedContact?.id === contact.id}
            onClick={() => onContactClick(contact)}
            onToggleSelect={() => onToggleSelect(contact.id)}
          />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-0.5">
      {contacts.map((contact) => (
        <ContactRow
          key={contact.id}
          contact={contact}
          selectMode={selectMode}
          isChecked={selectedIds.has(contact.id)}
          onSelect={onContactClick}
          onToggleSelect={() => onToggleSelect(contact.id)}
        />
      ))}
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
            className={`h-5 min-w-5 px-1 rounded-md text-[10px] font-medium transition-colors ${
              p === current
                ? 'bg-accent text-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
            }`}
          >
            {p}
          </button>
        )
      )}
    </div>
  )
}

function useNowMs() {
  const [now] = useState(() => Date.now())
  return now
}

function FollowUpBadge({ contact }: { contact: Contact }) {
  const nowMs = useNowMs()
  if (!contact.nextFollowUp) return null
  const followUp = new Date(contact.nextFollowUp).getTime()
  const daysUntil = Math.ceil((followUp - nowMs) / 86400000)
  if (daysUntil > 3) return null
  const isOverdue = daysUntil <= 0
  return (
    <Clock className={`h-3 w-3 shrink-0 ${isOverdue ? 'text-red-500' : 'text-amber-500'}`} />
  )
}

function ContactRow({ contact, selectMode, isChecked, onSelect, onToggleSelect }: {
  contact: Contact
  selectMode: boolean
  isChecked: boolean
  onSelect: (c: Contact) => void
  onToggleSelect: () => void
}) {
  const initials = contact.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <button
      onClick={() => selectMode ? onToggleSelect() : onSelect(contact)}
      className={`w-full text-left px-2 py-1.5 rounded-md flex items-center gap-2 transition-colors ${
        isChecked ? 'bg-orange-500/10 ring-1 ring-orange-500/20' : 'hover:bg-muted/50'
      }`}
    >
      {selectMode && (
        <span className="shrink-0 text-muted-foreground">
          {isChecked
            ? <CheckSquare className="h-3.5 w-3.5 text-orange-500" />
            : <Square className="h-3.5 w-3.5" />
          }
        </span>
      )}
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
      <FollowUpBadge contact={contact} />
      {contact.rating && contact.rating > 0 && (
        <div className="flex items-center gap-0.5 shrink-0">
          <Star className="h-2.5 w-2.5 text-orange-400 fill-orange-400" />
          <span className="text-[10px] text-muted-foreground">{contact.rating}</span>
        </div>
      )}
    </button>
  )
}

function ContactCard({ contact, selectMode, isChecked, isSelected, onClick, onToggleSelect }: {
  contact: Contact
  selectMode: boolean
  isChecked: boolean
  isSelected: boolean
  onClick: () => void
  onToggleSelect: () => void
}) {
  const initials = contact.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)

  return (
    <button
      onClick={() => selectMode ? onToggleSelect() : onClick()}
      className={`relative w-full text-left rounded-lg border p-3 transition-colors ${
        isChecked
          ? 'border-orange-500/40 bg-orange-500/5'
          : isSelected
            ? 'border-accent-foreground/20 bg-accent'
            : 'border-border hover:bg-muted/50'
      }`}
    >
      {selectMode && (
        <span className="absolute top-2 right-2 text-muted-foreground">
          {isChecked
            ? <CheckSquare className="h-3.5 w-3.5 text-orange-500" />
            : <Square className="h-3.5 w-3.5" />
          }
        </span>
      )}
      <div className="flex flex-col items-center text-center gap-1.5">
        <Avatar className={`h-10 w-10 ${
          contact.gender === 'male'
            ? 'ring-2 ring-blue-400/30'
            : contact.gender === 'female'
              ? 'ring-2 ring-pink-400/30'
              : ''
        }`}>
          <AvatarImage src={contact.photo || undefined} />
          <AvatarFallback className="text-xs bg-muted text-muted-foreground">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 w-full">
          <p className="text-xs font-medium text-foreground truncate">{contact.name}</p>
          {(contact.role || contact.company) && (
            <p className="text-[10px] text-muted-foreground truncate">
              {contact.role || contact.company}
            </p>
          )}
          {contact.country && (
            <p className="text-[10px] text-muted-foreground/60 truncate flex items-center justify-center gap-0.5 mt-0.5">
              <MapPin className="h-2.5 w-2.5" />
              {[contact.city, contact.country].filter(Boolean).join(', ')} {countryFlag(contact.country)}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1 justify-center">
          <FollowUpBadge contact={contact} />
          {contact.rating && contact.rating > 0 && (
            <div className="flex items-center gap-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className={`h-2.5 w-2.5 ${i < contact.rating! ? 'text-orange-400 fill-orange-400' : 'text-muted-foreground/20'}`} />
              ))}
            </div>
          )}
        </div>
        {contact.tags && contact.tags.length > 0 && (
          <div className="flex flex-wrap gap-0.5 justify-center">
            {contact.tags.slice(0, 2).map((tag) => (
              <span key={tag} className="text-[9px] px-1 py-0.5 rounded bg-muted text-muted-foreground">
                {tag}
              </span>
            ))}
            {contact.tags.length > 2 && (
              <span className="text-[9px] text-muted-foreground/50">+{contact.tags.length - 2}</span>
            )}
          </div>
        )}
      </div>
    </button>
  )
}

function ContactCompactRow({ contact, selectMode, isChecked, isSelected, onClick, onToggleSelect }: {
  contact: Contact
  selectMode: boolean
  isChecked: boolean
  isSelected: boolean
  onClick: () => void
  onToggleSelect: () => void
}) {
  return (
    <button
      onClick={() => selectMode ? onToggleSelect() : onClick()}
      className={`w-full text-left grid grid-cols-[auto_1fr_auto_auto] gap-x-2 items-center px-2 py-1 border-b border-border/30 transition-colors ${
        isChecked
          ? 'bg-orange-500/10'
          : isSelected
            ? 'bg-accent'
            : 'hover:bg-muted/50'
      }`}
    >
      {selectMode ? (
        <span className="text-muted-foreground w-4">
          {isChecked
            ? <CheckSquare className="h-3 w-3 text-orange-500" />
            : <Square className="h-3 w-3" />
          }
        </span>
      ) : null}
      <span className="text-[11px] font-medium text-foreground truncate" style={!selectMode ? { gridColumn: '1 / 2' } : undefined}>
        {contact.name}
        {contact.company && (
          <span className="text-muted-foreground/60 font-normal ml-1">{contact.company}</span>
        )}
      </span>
      <span className="text-[10px] text-muted-foreground/60 truncate text-right">
        {[contact.city, contact.country].filter(Boolean).join(', ') ? `${[contact.city, contact.country].filter(Boolean).join(', ')} ${countryFlag(contact.country)}` : '\u2014'}
      </span>
      <span className="text-[10px] text-right w-6 flex items-center gap-0.5 justify-end">
        <FollowUpBadge contact={contact} />
        {contact.rating && contact.rating > 0 ? (
          <span className="flex items-center gap-0.5 justify-end">
            <Star className="h-2.5 w-2.5 text-orange-400 fill-orange-400" />
            <span className="text-muted-foreground">{contact.rating}</span>
          </span>
        ) : (
          <span className="text-muted-foreground/30">&mdash;</span>
        )}
      </span>
    </button>
  )
}
