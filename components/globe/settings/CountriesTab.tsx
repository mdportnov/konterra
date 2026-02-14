'use client'

import { useState, useMemo } from 'react'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Search, ChevronDown } from 'lucide-react'
import { countryNames } from '@/components/globe/data/country-centroids'
import { COUNTRY_REGIONS } from '@/lib/constants/country-regions'
import { countryFlag } from '@/lib/country-flags'
import type { CountriesTabProps } from './types'

const allCountryNames = Array.from(new Set(Object.values(countryNames))).sort()

const CONTINENT_ORDER = ['Europe', 'Asia', 'North America', 'South America', 'Africa', 'Oceania', 'Other']

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

export function CountriesTab({ visitedCountries, onToggleVisitedCountry, contactCountsByCountry }: CountriesTabProps) {
  const [countrySearch, setCountrySearch] = useState('')
  const [collapsedContinents, setCollapsedContinents] = useState<Set<string>>(new Set())

  const filteredCountries = useMemo(
    () => countrySearch
      ? new Set(allCountryNames.filter((c) => c.toLowerCase().includes(countrySearch.toLowerCase())))
      : null,
    [countrySearch]
  )

  const continentStats = useMemo(() => {
    const stats = new Map<string, { total: number; visited: number }>()
    for (const [continent, countries] of countriesByContinent) {
      const visited = countries.filter((c) => visitedCountries?.has(c)).length
      stats.set(continent, { total: countries.length, visited })
    }
    return stats
  }, [visitedCountries])

  const toggleContinent = (continent: string) => {
    setCollapsedContinents((prev) => {
      const next = new Set(prev)
      if (next.has(continent)) next.delete(continent)
      else next.add(continent)
      return next
    })
  }

  if (!onToggleVisitedCountry) return null

  const orderedContinents = CONTINENT_ORDER.filter((c) => countriesByContinent.has(c))

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 pt-6 pb-3 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground/60 uppercase tracking-wider">Countries I&apos;ve visited</span>
          <span className="text-xs text-muted-foreground/60">{visitedCountries?.size || 0} of {allCountryNames.length}</span>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {orderedContinents.map((continent) => {
            const stats = continentStats.get(continent)
            if (!stats || stats.visited === 0) return null
            return (
              <Badge
                key={continent}
                variant="outline"
                className="text-[10px] border-border text-muted-foreground"
              >
                {continent}: {stats.visited}
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
            const visible = filteredCountries
              ? countries.filter((c) => filteredCountries.has(c))
              : countries
            if (visible.length === 0) return null
            const isCollapsed = collapsedContinents.has(continent)
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
                    {stats?.visited || 0}/{stats?.total || 0}
                  </span>
                </button>
                {!isCollapsed && (
                  <div className="space-y-0.5 ml-1">
                    {visible.map((name) => {
                      const count = contactCountsByCountry.get(name) || 0
                      return (
                        <label key={name} className="flex items-center gap-2 px-1 py-1 rounded hover:bg-accent cursor-pointer">
                          <Checkbox
                            checked={visitedCountries?.has(name) || false}
                            onCheckedChange={() => onToggleVisitedCountry(name)}
                          />
                          <span className="text-sm text-foreground flex-1">{countryFlag(name)} {name}</span>
                          {count > 0 && (
                            <span className="text-[10px] text-muted-foreground/60 bg-muted rounded-full px-1.5 py-0.5 min-w-[20px] text-center">
                              {count}
                            </span>
                          )}
                        </label>
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
