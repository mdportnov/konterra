'use client'

import { useState, useMemo } from 'react'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Search, ChevronDown, ChevronsUpDown, Heart, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { countryNames } from '@/components/globe/data/country-centroids'
import { COUNTRY_REGIONS } from '@/lib/constants/country-regions'
import { countryFlag } from '@/lib/country-flags'
import { PRIORITY_LABELS, STATUS_LABELS } from '@/lib/constants/wishlist'
import type { CountriesTabProps } from './types'

const allCountryNames = Array.from(new Set(Object.values(countryNames))).sort()

const CONTINENT_ORDER = ['Europe', 'Asia', 'North America', 'South America', 'Africa', 'Oceania', 'Other']

type ViewMode = 'visited' | 'wishlist' | 'all'

function getContinent(country: string): string {
  return COUNTRY_REGIONS[country] || 'Other'
}

const countriesByContinent = (() => {
  const groups = new Map<string, string[]>()
  for (const name of allCountryNames) {
    const continent = getContinent(name)
    const list = groups.get(continent) || []
    list.push(name)
    groups.set(continent, list)
  }
  return groups
})()

export function CountriesTab({ visitedCountries, onToggleVisitedCountry, wishlistCountries, onToggleWishlistCountry, onOpenWishlistDetail, contactCountsByCountry }: CountriesTabProps) {
  const [countrySearch, setCountrySearch] = useState('')
  const [collapsedContinents, setCollapsedContinents] = useState<Set<string>>(() => new Set(CONTINENT_ORDER))
  const [viewMode, setViewMode] = useState<ViewMode>('visited')

  const filteredCountries = useMemo(
    () => countrySearch
      ? new Set(allCountryNames.filter((c) => c.toLowerCase().includes(countrySearch.toLowerCase())))
      : null,
    [countrySearch]
  )

  const continentStats = useMemo(() => {
    const stats = new Map<string, { total: number; visited: number; wishlisted: number }>()
    for (const [continent, countries] of countriesByContinent) {
      const visited = countries.filter((c) => visitedCountries?.has(c)).length
      const wishlisted = countries.filter((c) => wishlistCountries?.has(c)).length
      stats.set(continent, { total: countries.length, visited, wishlisted })
    }
    return stats
  }, [visitedCountries, wishlistCountries])

  const toggleContinent = (continent: string) => {
    setCollapsedContinents((prev) => {
      const next = new Set(prev)
      if (next.has(continent)) next.delete(continent)
      else next.add(continent)
      return next
    })
  }

  const allCollapsed = useMemo(
    () => CONTINENT_ORDER.every((c) => collapsedContinents.has(c)),
    [collapsedContinents]
  )

  const toggleAll = () => {
    setCollapsedContinents(allCollapsed ? new Set() : new Set(CONTINENT_ORDER))
  }

  if (!onToggleVisitedCountry) return null

  const orderedContinents = CONTINENT_ORDER.filter((c) => countriesByContinent.has(c))

  const wishlistSize = wishlistCountries?.size ?? 0

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 pt-6 pb-3 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground/60 uppercase tracking-wider">
            {viewMode === 'visited' && "Countries I've visited"}
            {viewMode === 'wishlist' && 'My wishlist'}
            {viewMode === 'all' && 'All countries'}
          </span>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground/60">
              {viewMode === 'visited' && `${visitedCountries?.size || 0} of ${allCountryNames.length}`}
              {viewMode === 'wishlist' && `${wishlistSize} countries`}
              {viewMode === 'all' && `${visitedCountries?.size || 0} visited, ${wishlistSize} wishlist`}
            </span>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={toggleAll}>
                  <ChevronsUpDown className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">{allCollapsed ? 'Expand all' : 'Collapse all'}</TooltipContent>
            </Tooltip>
          </div>
        </div>

        {onToggleWishlistCountry && (
          <ToggleGroup
            type="single"
            value={viewMode}
            onValueChange={(v) => { if (v) setViewMode(v as ViewMode) }}
            className="w-full"
          >
            <ToggleGroupItem value="visited" className="flex-1 text-xs data-[state=on]:bg-accent data-[state=on]:text-foreground text-muted-foreground/60">
              Visited
            </ToggleGroupItem>
            <ToggleGroupItem value="wishlist" className="flex-1 text-xs data-[state=on]:bg-accent data-[state=on]:text-foreground text-muted-foreground/60">
              Wishlist
            </ToggleGroupItem>
            <ToggleGroupItem value="all" className="flex-1 text-xs data-[state=on]:bg-accent data-[state=on]:text-foreground text-muted-foreground/60">
              All
            </ToggleGroupItem>
          </ToggleGroup>
        )}

        <div className="flex flex-wrap gap-1.5">
          {orderedContinents.map((continent) => {
            const stats = continentStats.get(continent)
            if (!stats) return null
            const count = viewMode === 'wishlist' ? stats.wishlisted : stats.visited
            if (count === 0) return null
            return (
              <Badge
                key={continent}
                variant="outline"
                className="text-[10px] border-border text-muted-foreground"
              >
                {continent}: {count}
              </Badge>
            )
          })}
        </div>

        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/60" />
          <Input
            placeholder="Search countries..."
            value={countrySearch}
            onChange={(e) => setCountrySearch(e.target.value)}
            className="h-8 pl-8 text-xs"
          />
        </div>
      </div>
      <ScrollArea className="flex-1 px-6 pb-6">
        <div className="space-y-1 pr-3">
          {orderedContinents.map((continent) => {
            const countries = countriesByContinent.get(continent)!
            let visible = filteredCountries
              ? countries.filter((c) => filteredCountries.has(c))
              : countries

            if (viewMode === 'wishlist' && !countrySearch) {
              visible = visible.filter((c) => wishlistCountries?.has(c))
            }

            if (visible.length === 0) return null
            const isCollapsed = !countrySearch && collapsedContinents.has(continent)
            const stats = continentStats.get(continent)

            return (
              <div key={continent}>
                <button
                  onClick={() => toggleContinent(continent)}
                  className="flex items-center gap-1.5 w-full py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ChevronDown className={`h-3 w-3 transition-transform duration-200 ${isCollapsed ? '-rotate-90' : ''}`} />
                  <span>{continent}</span>
                  <span className="text-[10px] text-muted-foreground/50 ml-auto">
                    {viewMode === 'wishlist'
                      ? `${stats?.wishlisted || 0}`
                      : `${stats?.visited || 0}/${stats?.total || 0}`}
                  </span>
                </button>
                {!isCollapsed && (
                  <div className="space-y-0.5 ml-1">
                    {visible.map((name) => {
                      const count = contactCountsByCountry.get(name) || 0
                      const isWishlisted = wishlistCountries?.has(name)
                      const entry = wishlistCountries?.get(name)

                      if (viewMode === 'visited') {
                        return (
                          <label key={name} className="flex items-center gap-2 px-1 py-1 rounded hover:bg-accent cursor-pointer">
                            <Checkbox
                              checked={visitedCountries?.has(name) || false}
                              onCheckedChange={() => onToggleVisitedCountry(name)}
                            />
                            <span className="text-sm text-foreground flex-1">{countryFlag(name)} {name}</span>
                            {isWishlisted && (
                              <Heart className="h-3 w-3 fill-rose-500 text-rose-500 shrink-0" />
                            )}
                            {count > 0 && (
                              <span className="text-[10px] text-muted-foreground/60 bg-muted rounded-full px-1.5 py-0.5 min-w-[20px] text-center">
                                {count}
                              </span>
                            )}
                          </label>
                        )
                      }

                      if (viewMode === 'wishlist') {
                        return (
                          <div key={name} className="flex items-center gap-2 px-1 py-1 rounded hover:bg-accent group">
                            <button
                              onClick={() => onToggleWishlistCountry?.(name)}
                              aria-label={isWishlisted ? `Remove ${name} from wishlist` : `Add ${name} to wishlist`}
                              className="cursor-pointer"
                            >
                              <Heart className={`h-3.5 w-3.5 ${isWishlisted ? 'fill-rose-500 text-rose-500' : 'text-muted-foreground/40'}`} />
                            </button>
                            <span className="text-sm text-foreground flex-1">{countryFlag(name)} {name}</span>
                            {entry?.priority && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-500 font-medium">
                                {PRIORITY_LABELS[entry.priority] ?? entry.priority}
                              </span>
                            )}
                            {entry?.status && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent text-muted-foreground font-medium">
                                {STATUS_LABELS[entry.status] ?? entry.status}
                              </span>
                            )}
                            {onOpenWishlistDetail && (
                              <button
                                onClick={() => onOpenWishlistDetail(name)}
                                aria-label={`Open ${name} details`}
                                className="opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity cursor-pointer"
                              >
                                <ArrowRight className="h-3 w-3 text-muted-foreground/40" />
                              </button>
                            )}
                          </div>
                        )
                      }

                      return (
                        <div key={name} className="flex items-center gap-2 px-1 py-1 rounded hover:bg-accent">
                          <Checkbox
                            checked={visitedCountries?.has(name) || false}
                            onCheckedChange={() => onToggleVisitedCountry(name)}
                          />
                          <span className="text-sm text-foreground flex-1">{countryFlag(name)} {name}</span>
                          <button
                            onClick={() => onToggleWishlistCountry?.(name)}
                            aria-label={isWishlisted ? `Remove ${name} from wishlist` : `Add ${name} to wishlist`}
                            className="cursor-pointer"
                          >
                            <Heart className={`h-3 w-3 transition-colors ${isWishlisted ? 'fill-rose-500 text-rose-500' : 'text-muted-foreground/30 hover:text-rose-400'}`} />
                          </button>
                          {count > 0 && (
                            <span className="text-[10px] text-muted-foreground/60 bg-muted rounded-full px-1.5 py-0.5 min-w-[20px] text-center">
                              {count}
                            </span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </ScrollArea>
    </div>
  )
}
