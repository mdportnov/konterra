'use client'

import { useRef, useState, useCallback, useMemo } from 'react'
import { Filter, X, Star } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Checkbox } from '@/components/ui/checkbox'
import { GLASS, Z } from '@/lib/constants/ui'
import { RATING_LABELS } from '@/lib/constants/rating'
import { useClickOutside } from '@/hooks/use-click-outside'
import { useHotkey } from '@/hooks/use-hotkey'

const RATING_LEVELS = [5, 4, 3, 2, 1] as const

interface GlobeFiltersProps {
  ratings: Set<number>
  onRatingsChange: (ratings: Set<number>) => void
  tags: string[]
  activeTags: Set<string>
  onTagsChange: (tags: Set<string>) => void
  relationshipTypes: string[]
  activeRelTypes: Set<string>
  onRelTypesChange: (types: Set<string>) => void
  countries: string[]
  activeCountries: Set<string>
  onCountriesChange: (countries: Set<string>) => void
}

export default function GlobeFilters({
  ratings,
  onRatingsChange,
  tags,
  activeTags,
  onTagsChange,
  relationshipTypes,
  activeRelTypes,
  onRelTypesChange,
  countries,
  activeCountries,
  onCountriesChange,
}: GlobeFiltersProps) {
  const [open, setOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  const close = useCallback(() => setOpen(false), [])

  useClickOutside(panelRef, close, open)
  useHotkey('Escape', close, { enabled: open })

  const toggleRating = useCallback(
    (level: number) => {
      const next = new Set(ratings)
      if (next.has(level)) next.delete(level)
      else next.add(level)
      onRatingsChange(next)
    },
    [ratings, onRatingsChange]
  )

  const allRatingsActive = ratings.size === 5

  const toggleAllRatings = useCallback(() => {
    onRatingsChange(allRatingsActive ? new Set() : new Set([1, 2, 3, 4, 5]))
  }, [allRatingsActive, onRatingsChange])

  const toggleTag = useCallback(
    (tag: string) => {
      const next = new Set(activeTags)
      if (next.has(tag)) next.delete(tag)
      else next.add(tag)
      onTagsChange(next)
    },
    [activeTags, onTagsChange]
  )

  const toggleRelType = useCallback(
    (t: string) => {
      const next = new Set(activeRelTypes)
      if (next.has(t)) next.delete(t)
      else next.add(t)
      onRelTypesChange(next)
    },
    [activeRelTypes, onRelTypesChange]
  )

  const toggleCountry = useCallback(
    (c: string) => {
      const next = new Set(activeCountries)
      if (next.has(c)) next.delete(c)
      else next.add(c)
      onCountriesChange(next)
    },
    [activeCountries, onCountriesChange]
  )

  const activeFilterCount = useMemo(() => {
    let count = 0
    if (ratings.size < 5) count += 5 - ratings.size
    count += activeTags.size
    count += activeRelTypes.size
    count += activeCountries.size
    return count
  }, [ratings, activeTags, activeRelTypes, activeCountries])

  const clearAll = useCallback(() => {
    onRatingsChange(new Set([1, 2, 3, 4, 5]))
    onTagsChange(new Set())
    onRelTypesChange(new Set())
    onCountriesChange(new Set())
  }, [onRatingsChange, onTagsChange, onRelTypesChange, onCountriesChange])

  const noneActive = ratings.size === 0

  return (
    <div
      ref={panelRef}
      className="absolute top-4 left-4"
      style={{ zIndex: Z.controls }}
    >
      {open ? (
        <div className={`${GLASS.panel} rounded-2xl p-4 w-[calc(100vw-2rem)] sm:w-[240px] max-w-[280px] max-h-[calc(100dvh-6rem)] sm:max-h-[calc(100dvh-2rem)] overflow-y-auto transition-[opacity,transform] duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] animate-in fade-in slide-in-from-top-2`}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Filters
            </span>
            <div className="flex items-center gap-2">
              {activeFilterCount > 0 && (
                <button
                  onClick={clearAll}
                  className="text-[10px] text-muted-foreground/60 hover:text-muted-foreground transition-colors"
                >
                  Reset
                </button>
              )}
              <button
                onClick={close}
                className="text-muted-foreground/60 hover:text-muted-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] text-muted-foreground">Rating</span>
                <button
                  onClick={toggleAllRatings}
                  className="text-[10px] text-muted-foreground/60 hover:text-muted-foreground transition-colors"
                >
                  {allRatingsActive ? 'Clear' : 'All'}
                </button>
              </div>
              <div className="flex flex-col gap-0.5">
                {RATING_LEVELS.map((level) => {
                  const active = ratings.has(level)
                  const label = RATING_LABELS[level]?.label ?? `Rating ${level}`
                  return (
                    <button
                      key={level}
                      onClick={() => toggleRating(level)}
                      className={`flex items-center gap-2 px-2 py-1 rounded-md text-xs transition-colors ${
                        active
                          ? 'bg-accent text-foreground'
                          : 'text-muted-foreground/40 hover:text-muted-foreground hover:bg-accent/50'
                      }`}
                    >
                      <div className="flex items-center gap-0.5 shrink-0">
                        {Array.from({ length: level }).map((_, i) => (
                          <Star
                            key={i}
                            className={`h-2.5 w-2.5 ${
                              active
                                ? 'fill-orange-400 text-orange-400'
                                : 'text-muted-foreground/30'
                            }`}
                          />
                        ))}
                      </div>
                      <span className="truncate text-[11px]">{label}</span>
                    </button>
                  )
                })}
              </div>
              {noneActive && (
                <p className="text-[10px] text-destructive mt-1">
                  No ratings selected — all contacts hidden
                </p>
              )}
            </div>

            {tags.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] text-muted-foreground">Tags</span>
                  {activeTags.size > 0 && (
                    <button
                      onClick={() => onTagsChange(new Set())}
                      className="text-[10px] text-muted-foreground/60 hover:text-muted-foreground transition-colors"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-1">
                  {tags.map((tag) => (
                    <Badge
                      key={tag}
                      variant={activeTags.has(tag) ? 'default' : 'outline'}
                      className={`cursor-pointer text-[10px] ${
                        activeTags.has(tag)
                          ? 'bg-orange-500/20 text-orange-600 dark:text-orange-300 border-orange-500/30 hover:bg-orange-500/30'
                          : 'border-border text-muted-foreground/50 hover:bg-muted hover:text-muted-foreground'
                      }`}
                      onClick={() => toggleTag(tag)}
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {relationshipTypes.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] text-muted-foreground">Relationship</span>
                  {activeRelTypes.size > 0 && (
                    <button
                      onClick={() => onRelTypesChange(new Set())}
                      className="text-[10px] text-muted-foreground/60 hover:text-muted-foreground transition-colors"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-1">
                  {relationshipTypes.map((t) => (
                    <Badge
                      key={t}
                      variant={activeRelTypes.has(t) ? 'default' : 'outline'}
                      className={`cursor-pointer text-[10px] capitalize ${
                        activeRelTypes.has(t)
                          ? 'bg-blue-500/20 text-blue-600 dark:text-blue-300 border-blue-500/30 hover:bg-blue-500/30'
                          : 'border-border text-muted-foreground/50 hover:bg-muted hover:text-muted-foreground'
                      }`}
                      onClick={() => toggleRelType(t)}
                    >
                      {t}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {countries.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] text-muted-foreground">Countries</span>
                  {activeCountries.size > 0 && (
                    <button
                      onClick={() => onCountriesChange(new Set())}
                      className="text-[10px] text-muted-foreground/60 hover:text-muted-foreground transition-colors"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <ScrollArea className="max-h-[120px]">
                  <div className="space-y-0.5 pr-2">
                    {countries.map((c) => (
                      <label key={c} className="flex items-center gap-2 px-1 py-0.5 rounded hover:bg-accent/50 cursor-pointer">
                        <Checkbox
                          checked={activeCountries.has(c)}
                          onCheckedChange={() => toggleCountry(c)}
                          className="h-3 w-3"
                        />
                        <span className="text-[11px] text-foreground truncate">{c}</span>
                      </label>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}
          </div>
        </div>
      ) : (
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setOpen(true)}
                className={`${GLASS.control} rounded-full h-9 w-9 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors relative`}
              >
                <Filter className="h-4 w-4" />
                {activeFilterCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 min-w-4 px-0.5 rounded-full bg-orange-500 text-white text-[10px] font-medium flex items-center justify-center">
                    {activeFilterCount}
                  </span>
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">Filters</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  )
}
