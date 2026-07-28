'use client'

import { Fragment, useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, ChevronRight, AlertTriangle, MapPin, CalendarRange, Plane } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Separator } from '@/components/ui/separator'
import { GLASS } from '@/lib/constants/ui'
import { countryFlag } from '@/lib/country-flags'
import { computeTravelDays, ROLLING_WINDOW_DAYS, type CountryDays } from '@/lib/travel/days'
import type { Trip } from '@/lib/db/schema'

type SortKey = 'totalDays' | 'daysThisYear' | 'daysLast12Months' | 'visits' | 'lastVisit' | 'country'

interface CountryDaysTableProps {
  trips: Trip[]
  loading?: boolean
  onCountryClick?: (country: string) => void
}

const COLUMNS: { key: SortKey; label: string; hint: string; align: 'left' | 'right' }[] = [
  { key: 'country', label: 'Country', hint: 'Country name', align: 'left' },
  { key: 'totalDays', label: 'Days', hint: 'Distinct days present, all time', align: 'right' },
  { key: 'daysThisYear', label: 'This yr', hint: 'Days present since 1 January', align: 'right' },
  { key: 'daysLast12Months', label: '12 mo', hint: 'Days present in the last 365 days', align: 'right' },
  { key: 'visits', label: 'Visits', hint: 'Separate arrivals (back-to-back trips count once)', align: 'right' },
  { key: 'lastVisit', label: 'Last', hint: 'Most recent day present', align: 'right' },
]

function formatDate(date: Date | string | null): string {
  if (!date) return '—'
  const d = date instanceof Date ? date : new Date(date)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', timeZone: 'UTC' })
}

function formatFullDate(date: Date | string | null): string {
  if (!date) return '—'
  const d = date instanceof Date ? date : new Date(date)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' })
}

function compare(a: CountryDays, b: CountryDays, key: SortKey): number {
  switch (key) {
    case 'country':
      return a.country.localeCompare(b.country)
    case 'lastVisit': {
      const av = a.lastVisit ? new Date(a.lastVisit).getTime() : 0
      const bv = b.lastVisit ? new Date(b.lastVisit).getTime() : 0
      return av - bv
    }
    default:
      return a[key] - b[key]
  }
}

function StatTile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg border border-border bg-muted/20 px-3 py-2.5">
      <p className="meta-label text-[10px] mb-1">{label}</p>
      <p className="text-lg font-semibold text-foreground leading-none tabular-nums">{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground mt-1 truncate">{sub}</p>}
    </div>
  )
}

export default function CountryDaysTable({ trips, loading, onCountryClick }: CountryDaysTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('totalDays')
  const [sortDesc, setSortDesc] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [showYears, setShowYears] = useState(false)

  const summary = useMemo(() => computeTravelDays(trips), [trips])

  const rows = useMemo(() => {
    const sorted = [...summary.countries].sort((a, b) => compare(a, b, sortKey))
    return sortDesc ? sorted.reverse() : sorted
  }, [summary.countries, sortKey, sortDesc])

  const maxDays = rows.length > 0 ? Math.max(...rows.map((r) => r.totalDays)) : 0

  const toggleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDesc((v) => !v)
    } else {
      setSortKey(key)
      setSortDesc(key !== 'country')
    }
  }

  if (loading) {
    return (
      <div className="space-y-2">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)}
        </div>
        {Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-9 rounded-md" />)}
      </div>
    )
  }

  if (summary.countries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="h-11 w-11 rounded-full bg-muted/40 flex items-center justify-center mb-3">
          <CalendarRange className="h-5 w-5 text-muted-foreground/60" />
        </div>
        <p className="text-sm text-foreground mb-1">No days counted yet</p>
        <p className="text-xs text-muted-foreground max-w-[260px]">
          Log a trip with arrival and departure dates and this table fills itself in.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <StatTile
          label="Countries"
          value={String(summary.countriesVisited)}
          sub={`${summary.citiesVisited} ${summary.citiesVisited === 1 ? 'city' : 'cities'}`}
        />
        <StatTile
          label="Days tracked"
          value={String(summary.totalTrackedDays)}
          sub={summary.firstTrackedDay ? `since ${formatDate(summary.firstTrackedDay)}` : undefined}
        />
        <StatTile
          label="Right now"
          value={summary.currentCountry ? countryFlag(summary.currentCountry) || '—' : '—'}
          sub={summary.currentCountry ? `${summary.currentCountry} · day ${summary.currentStreakDays}` : 'no open trip'}
        />
        <StatTile
          label={`Densest ${ROLLING_WINDOW_DAYS}d`}
          value={summary.maxDaysInRolling180 ? `${summary.maxDaysInRolling180.days}d` : '—'}
          sub={
            summary.maxDaysInRolling180
              ? `${summary.maxDaysInRolling180.country} · ends ${formatDate(summary.maxDaysInRolling180.windowEnd)}`
              : undefined
          }
        />
      </div>

      {summary.overlappingTripIds.length > 0 && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-500/25 bg-amber-500/5 px-3 py-2.5">
          <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            {summary.overlappingTripIds.length} {summary.overlappingTripIds.length === 1 ? 'trip overlaps' : 'trips overlap'} another
            trip in a different country. Days are still counted once per country, but the totals will not add up
            until the dates are corrected.
          </p>
        </div>
      )}

      <div className="rounded-lg border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="w-6" />
                {COLUMNS.map((col) => (
                  <th
                    key={col.key}
                    className={`px-2 py-2 font-normal ${col.align === 'right' ? 'text-right' : 'text-left'}`}
                  >
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            onClick={() => toggleSort(col.key)}
                            className={`meta-label text-[10px] inline-flex items-center gap-1 transition-colors hover:text-foreground ${
                              sortKey === col.key ? 'text-foreground' : ''
                            }`}
                          >
                            {col.label}
                            {sortKey === col.key && (
                              sortDesc ? <ArrowDown className="h-2.5 w-2.5" /> : <ArrowUp className="h-2.5 w-2.5" />
                            )}
                          </button>
                        </TooltipTrigger>
                        <TooltipContent className="text-xs">{col.hint}</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const isExpanded = expanded === row.country
                return (
                  <Fragment key={row.country}>
                    <tr
                      onClick={() => setExpanded(isExpanded ? null : row.country)}
                      className="border-b border-border/50 last:border-0 cursor-pointer hover:bg-accent/40 transition-colors"
                    >
                      <td className="pl-2">
                        <ChevronRight
                          className={`h-3 w-3 text-muted-foreground/50 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                        />
                      </td>
                      <td className="px-2 py-2">
                        <span className="relative flex items-center gap-1.5 min-w-0">
                          <span className="shrink-0">{countryFlag(row.country)}</span>
                          <span className="truncate text-foreground">{row.country}</span>
                          {row.isCurrent && (
                            <span className="shrink-0 h-1.5 w-1.5 rounded-full bg-emerald-500" title="Here now" />
                          )}
                          {row.plannedDays > 0 && (
                            <Plane className="h-2.5 w-2.5 text-primary shrink-0" aria-label="Upcoming trip planned" />
                          )}
                        </span>
                      </td>
                      <td className="px-2 py-2 text-right">
                        <span className="relative inline-flex items-center justify-end gap-2">
                          <span
                            className="h-1 rounded-full bg-primary/30"
                            style={{ width: `${maxDays > 0 ? Math.max(2, (row.totalDays / maxDays) * 40) : 0}px` }}
                          />
                          <span className="tabular-nums text-foreground font-medium">{row.totalDays}</span>
                        </span>
                      </td>
                      <td className="px-2 py-2 text-right tabular-nums text-muted-foreground">
                        {row.daysThisYear || '—'}
                      </td>
                      <td className="px-2 py-2 text-right tabular-nums text-muted-foreground">
                        {row.daysLast12Months || '—'}
                      </td>
                      <td className="px-2 py-2 text-right tabular-nums text-muted-foreground">{row.visits}</td>
                      <td className="px-2 py-2 text-right text-muted-foreground whitespace-nowrap">
                        {formatDate(row.lastVisit)}
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr className="border-b border-border/50 bg-muted/20">
                        <td />
                        <td colSpan={6} className="px-2 py-3">
                          <div className="space-y-2.5">
                            <div className="flex flex-wrap gap-x-5 gap-y-1 text-[11px] text-muted-foreground">
                              <span>First visit <span className="text-foreground">{formatFullDate(row.firstVisit)}</span></span>
                              <span>Longest stay <span className="text-foreground tabular-nums">{row.longestStayDays}d</span></span>
                              <span>Nights <span className="text-foreground tabular-nums">{row.totalNights}</span></span>
                              <span>Share <span className="text-foreground tabular-nums">{Math.round(row.share * 100)}%</span></span>
                              {row.plannedDays > 0 && (
                                <span>
                                  Planned <span className="text-foreground tabular-nums">{row.plannedDays}d</span>
                                  {row.nextArrival && <> from <span className="text-foreground">{formatFullDate(row.nextArrival)}</span></>}
                                </span>
                              )}
                            </div>

                            {row.cities.length > 0 && (
                              <>
                                <Separator />
                                <div className="flex flex-wrap gap-1.5">
                                  {row.cities.map((c) => (
                                    <span
                                      key={c.city}
                                      className="inline-flex items-center gap-1 rounded-full border border-border bg-background/60 px-2 py-0.5 text-[10px]"
                                    >
                                      <MapPin className="h-2.5 w-2.5 text-muted-foreground/60" />
                                      <span className="text-foreground">{c.city}</span>
                                      <span className="text-muted-foreground tabular-nums">{c.days}d</span>
                                    </span>
                                  ))}
                                </div>
                              </>
                            )}

                            {onCountryClick && (
                              <button
                                onClick={(e) => { e.stopPropagation(); onCountryClick(row.country) }}
                                className="text-[11px] text-primary hover:underline"
                              >
                                Show on globe
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {summary.years.length > 0 && (
        <div className={`${GLASS.control} rounded-lg p-3`}>
          <button
            onClick={() => setShowYears((v) => !v)}
            className="flex w-full items-center justify-between"
          >
            <span className="meta-label text-[10px]">By year</span>
            <ChevronRight className={`h-3 w-3 text-muted-foreground/50 transition-transform ${showYears ? 'rotate-90' : ''}`} />
          </button>

          {showYears && (
            <div className="mt-3 space-y-3">
              {summary.years.map((year) => {
                const entries = Object.entries(year.byCountry).sort((a, b) => b[1] - a[1])
                return (
                  <div key={year.year}>
                    <div className="flex items-baseline justify-between mb-1.5">
                      <span className="text-xs text-foreground font-medium tabular-nums">{year.year}</span>
                      <span className="text-[10px] text-muted-foreground tabular-nums">{year.total} days</span>
                    </div>
                    <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      {entries.map(([country, days], i) => (
                        <div
                          key={country}
                          title={`${country}: ${days}d`}
                          className="h-full"
                          style={{
                            width: `${(days / year.total) * 100}%`,
                            background: `oklch(${0.72 - (i % 5) * 0.07} 0.11 ${(i * 47) % 360})`,
                          }}
                        />
                      ))}
                    </div>
                    <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5">
                      {entries.slice(0, 6).map(([country, days]) => (
                        <span key={country} className="text-[10px] text-muted-foreground">
                          {countryFlag(country)} {country} <span className="tabular-nums text-foreground">{days}</span>
                        </span>
                      ))}
                      {entries.length > 6 && (
                        <span className="text-[10px] text-muted-foreground/60">+{entries.length - 6} more</span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      <p className="text-[10px] text-muted-foreground/60 leading-relaxed">
        Days count every calendar day present, arrival and departure included. Konterra does not know your
        citizenship, so these are plain counts — not visa or tax advice.
      </p>
    </div>
  )
}
