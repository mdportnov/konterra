'use client'

import { useMemo, useState, useCallback, useEffect } from 'react'
import GlobePanel from '@/components/globe/GlobePanel'
import { PANEL_WIDTH, Z } from '@/lib/constants/ui'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Search, X, Star, ChevronRight, ArrowLeft, MapPin, SlidersHorizontal, ArrowUpDown } from 'lucide-react'
import type { Contact } from '@/lib/db/schema'

type SortKey = 'name' | 'rating' | 'lastContacted' | 'updatedAt'
const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'name', label: 'Name' },
  { key: 'rating', label: 'Rating' },
  { key: 'lastContacted', label: 'Last contacted' },
  { key: 'updatedAt', label: 'Recently updated' },
]

interface ContactsBrowserPanelProps {
  open: boolean
  onClose: () => void
  contacts: Contact[]
  onSelectContact: (contact: Contact) => void
}

type Tab = 'contacts' | 'places'

const PAGE_SIZE = 50
const RELATIONSHIP_TYPES = ['friend', 'business', 'investor', 'conference', 'mentor', 'colleague', 'family', 'dating'] as const

export default function ContactsBrowserPanel({
  open,
  onClose,
  contacts,
  onSelectContact,
}: ContactsBrowserPanelProps) {
  const [tab, setTab] = useState<Tab>('contacts')
  const [search, setSearch] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [selectedRatings, setSelectedRatings] = useState<Set<number>>(new Set())
  const [selectedRelTypes, setSelectedRelTypes] = useState<string[]>([])
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [sortKey, setSortKey] = useState<SortKey>('name')

  const activeFilterCount = selectedTags.length + selectedRatings.size + selectedRelTypes.length

  const allTags = useMemo(() => {
    const tags = new Set<string>()
    contacts.forEach((c) => c.tags?.forEach((t) => tags.add(t)))
    return Array.from(tags).sort()
  }, [contacts])

  const activeRelTypes = useMemo(() => {
    const types = new Set<string>()
    contacts.forEach((c) => { if (c.relationshipType) types.add(c.relationshipType) })
    return RELATIONSHIP_TYPES.filter((t) => types.has(t))
  }, [contacts])

  const filteredContacts = useMemo(() => {
    const filtered = contacts.filter((c) => {
      const q = search.toLowerCase()
      const matchesSearch =
        !search ||
        c.name.toLowerCase().includes(q) ||
        c.company?.toLowerCase().includes(q) ||
        c.role?.toLowerCase().includes(q) ||
        c.city?.toLowerCase().includes(q) ||
        c.country?.toLowerCase().includes(q)
      const matchesTags =
        selectedTags.length === 0 || c.tags?.some((t) => selectedTags.includes(t))
      const matchesRating =
        selectedRatings.size === 0 || (c.rating != null && selectedRatings.has(c.rating))
      const matchesRelType =
        selectedRelTypes.length === 0 || (c.relationshipType != null && selectedRelTypes.includes(c.relationshipType))
      return matchesSearch && matchesTags && matchesRating && matchesRelType
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
  }, [contacts, search, selectedTags, selectedRatings, selectedRelTypes, sortKey])

  useEffect(() => { setCurrentPage(1) }, [search, selectedTags, selectedRatings, selectedRelTypes])

  const totalPages = Math.ceil(filteredContacts.length / PAGE_SIZE)
  const pagedContacts = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE
    return filteredContacts.slice(start, start + PAGE_SIZE)
  }, [filteredContacts, currentPage])

  const countryData = useMemo(() => {
    const map = new Map<string, Contact[]>()
    contacts.forEach((c) => {
      if (c.country) {
        const arr = map.get(c.country) || []
        arr.push(c)
        map.set(c.country, arr)
      }
    })
    return Array.from(map.entries())
      .map(([country, list]) => ({ country, contacts: list }))
      .sort((a, b) => b.contacts.length - a.contacts.length)
  }, [contacts])

  const filteredCountries = useMemo(() => {
    if (!search) return countryData
    const q = search.toLowerCase()
    return countryData.filter((d) => d.country.toLowerCase().includes(q))
  }, [countryData, search])

  const selectedCountryContacts = useMemo(() => {
    if (!selectedCountry) return []
    return contacts.filter((c) => c.country === selectedCountry)
  }, [contacts, selectedCountry])

  const cityGroups = useMemo(() => {
    const map = new Map<string, Contact[]>()
    selectedCountryContacts.forEach((c) => {
      const city = c.city || 'Unknown'
      const arr = map.get(city) || []
      arr.push(c)
      map.set(city, arr)
    })
    return Array.from(map.entries()).sort((a, b) => b[1].length - a[1].length)
  }, [selectedCountryContacts])

  const filteredCityGroups = useMemo(() => {
    if (!search) return cityGroups
    const q = search.toLowerCase()
    return cityGroups
      .map(([city, list]) => {
        if (city.toLowerCase().includes(q)) return [city, list] as [string, Contact[]]
        const filtered = list.filter(
          (c) =>
            c.name.toLowerCase().includes(q) ||
            c.company?.toLowerCase().includes(q) ||
            c.role?.toLowerCase().includes(q)
        )
        if (filtered.length > 0) return [city, filtered] as [string, Contact[]]
        return null
      })
      .filter(Boolean) as [string, Contact[]][]
  }, [cityGroups, search])

  const toggleTag = (tag: string) =>
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    )

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

  const clearAllFilters = useCallback(() => {
    setSelectedTags([])
    setSelectedRatings(new Set())
    setSelectedRelTypes([])
    setSearch('')
    setCurrentPage(1)
  }, [])

  const handleTabChange = useCallback((t: Tab) => {
    setTab(t)
    setSearch('')
    setSelectedTags([])
    setSelectedRatings(new Set())
    setSelectedRelTypes([])
    setSelectedCountry(null)
    setFiltersOpen(false)
    setCurrentPage(1)
  }, [])

  const handleSelectCountry = useCallback((country: string) => {
    setSelectedCountry(country)
    setSearch('')
  }, [])

  const handleBackToCountries = useCallback(() => {
    setSelectedCountry(null)
    setSearch('')
  }, [])

  return (
    <GlobePanel
      open={open}
      side="left"
      width={PANEL_WIDTH.browser}
      glass="heavy"
      zIndex={Z.detail}
      onClose={onClose}
    >
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-foreground">Browse</h2>
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
              {contacts.length}
            </Badge>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-muted"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex px-4 gap-1 pb-2">
          <button
            onClick={() => handleTabChange('contacts')}
            className={`flex-1 text-xs py-1.5 rounded-md font-medium transition-colors ${
              tab === 'contacts'
                ? 'bg-accent text-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            }`}
          >
            Contacts
          </button>
          <button
            onClick={() => handleTabChange('places')}
            className={`flex-1 text-xs py-1.5 rounded-md font-medium transition-colors ${
              tab === 'places'
                ? 'bg-accent text-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            }`}
          >
            Places
          </button>
        </div>

        <div className="px-4 pb-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder={tab === 'contacts' ? 'Search contacts...' : selectedCountry ? 'Search cities...' : 'Search countries...'}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8 text-xs bg-muted/50 border-border"
            />
          </div>
        </div>

        {tab === 'contacts' && (
          <div className="px-4 pb-2 shrink-0 space-y-1.5">
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
                  <div className="flex gap-1 overflow-x-auto pb-0.5 scrollbar-none">
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

                {activeFilterCount > 0 && (
                  <button
                    onClick={clearAllFilters}
                    className="text-[10px] text-muted-foreground/60 hover:text-muted-foreground transition-colors"
                  >
                    Clear all
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {tab === 'contacts' && (
          <div className="px-4 pb-1 shrink-0 flex items-center justify-between">
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
        )}

        {tab === 'places' && selectedCountry && (
          <div className="px-4 pb-2 shrink-0">
            <button
              onClick={handleBackToCountries}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-3 w-3" />
              <span>Countries</span>
              <ChevronRight className="h-3 w-3" />
              <span className="text-foreground font-medium">{selectedCountry}</span>
            </button>
          </div>
        )}

        <ScrollArea className="flex-1 min-h-0">
          {tab === 'contacts' && (
            <div className="px-2 pb-2 space-y-0.5">
              {pagedContacts.map((contact) => (
                <ContactRow key={contact.id} contact={contact} onSelect={onSelectContact} />
              ))}
              {filteredContacts.length === 0 && (
                <p className="text-xs text-muted-foreground/60 text-center py-6">No contacts found</p>
              )}
            </div>
          )}

          {tab === 'places' && !selectedCountry && (
            <div className="px-2 pb-2 space-y-0.5">
              {filteredCountries.map(({ country, contacts: list }) => (
                <button
                  key={country}
                  onClick={() => handleSelectCountry(country)}
                  className="w-full text-left px-2 py-2 rounded-md hover:bg-muted/50 flex items-center gap-2 transition-colors"
                >
                  <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="text-xs font-medium text-foreground flex-1 truncate">{country}</span>
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 shrink-0">
                    {list.length}
                  </Badge>
                  <ChevronRight className="h-3 w-3 text-muted-foreground/50 shrink-0" />
                </button>
              ))}
              {filteredCountries.length === 0 && (
                <p className="text-xs text-muted-foreground/60 text-center py-6">No countries found</p>
              )}
            </div>
          )}

          {tab === 'places' && selectedCountry && (
            <div className="px-2 pb-2">
              {filteredCityGroups.map(([city, list], idx) => (
                <div key={city}>
                  {idx > 0 && <Separator className="my-1" />}
                  <div className="px-2 pt-2 pb-1 flex items-center justify-between">
                    <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{city}</span>
                    <span className="text-[10px] text-muted-foreground/50">{list.length}</span>
                  </div>
                  <div className="space-y-0.5">
                    {list.map((contact) => (
                      <ContactRow key={contact.id} contact={contact} onSelect={onSelectContact} />
                    ))}
                  </div>
                </div>
              ))}
              {filteredCityGroups.length === 0 && (
                <p className="text-xs text-muted-foreground/60 text-center py-6">No results found</p>
              )}
            </div>
          )}
        </ScrollArea>
      </div>
    </GlobePanel>
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
            {[contact.role, contact.company].filter(Boolean).join(' · ')}
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
