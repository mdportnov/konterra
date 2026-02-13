'use client'

import { useState, useMemo } from 'react'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Search } from 'lucide-react'
import { countryNames } from '@/components/globe/data/country-centroids'
import type { CountriesTabProps } from './types'

const allCountryNames = Array.from(new Set(Object.values(countryNames))).sort()

export function CountriesTab({ visitedCountries, onToggleVisitedCountry }: CountriesTabProps) {
  const [countrySearch, setCountrySearch] = useState('')

  const filteredCountries = useMemo(
    () => countrySearch
      ? allCountryNames.filter((c) => c.toLowerCase().includes(countrySearch.toLowerCase()))
      : allCountryNames,
    [countrySearch]
  )

  if (!onToggleVisitedCountry) return null

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 pt-6 pb-3 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground/60 uppercase tracking-wider">Countries I&apos;ve visited</span>
          <span className="text-xs text-muted-foreground/60">{visitedCountries?.size || 0} of {allCountryNames.length}</span>
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
        <div className="space-y-0.5 pr-3">
          {filteredCountries.map((name) => (
            <label key={name} className="flex items-center gap-2 px-1 py-1 rounded hover:bg-accent cursor-pointer">
              <Checkbox
                checked={visitedCountries?.has(name) || false}
                onCheckedChange={() => onToggleVisitedCountry(name)}
              />
              <span className="text-sm text-foreground">{name}</span>
            </label>
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}
