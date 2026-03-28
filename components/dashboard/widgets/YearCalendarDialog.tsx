'use client'

import { useState, useMemo, useCallback } from 'react'
import { ChevronLeft, ChevronRight, CalendarDays, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { GLASS } from '@/lib/constants/ui'
import { getMondayStart, getCountryColor, getCountryTextColor } from '@/lib/constants/calendar'
import { countryFlag } from '@/lib/country-flags'
import type { Trip } from '@/lib/db/schema'

const MONTH_NAMES_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]

const DAY_HEADERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
const CELL_H = 'h-6 sm:h-7'

function getCalendarDays(year: number, month: number): Date[] {
  const start = getMondayStart(year, month)
  const current = new Date(start)
  const days: Date[] = []
  for (let w = 0; w < 6; w++) {
    const firstOfWeek = current.getMonth()
    for (let d = 0; d < 7; d++) {
      days.push(new Date(current))
      current.setDate(current.getDate() + 1)
    }
    if (w === 5 && firstOfWeek !== month) {
      days.splice(-7)
      break
    }
  }
  return days
}

function formatShortDate(d: Date | string | null): string {
  if (!d) return ''
  const date = typeof d === 'string' ? new Date(d) : d
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

interface DayTripInfo {
  trips: Trip[]
  colors: string[]
}

interface YearCalendarDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  trips: Trip[]
  onTripClick?: (trip: Trip) => void
  onMonthSelect?: (year: number, month: number) => void
  initialYear?: number
}

export default function YearCalendarDialog({ open, onOpenChange, trips, onTripClick, onMonthSelect, initialYear }: YearCalendarDialogProps) {
  const today = useMemo(() => new Date(), [])
  const [year, setYear] = useState(initialYear ?? today.getFullYear())
  const [touchSelectedTrips, setTouchSelectedTrips] = useState<Trip[] | null>(null)
  const [range, setRange] = useState<{ start: Date | null; end: Date | null }>({ start: null, end: null })
  const rangeStart = range.start
  const rangeEnd = range.end

  const clearRange = useCallback(() => {
    setRange({ start: null, end: null })
  }, [])

  const countryColorMap = useMemo(() => {
    const map = new Map<string, string>()
    const sorted = [...trips].sort((a, b) =>
      new Date(a.arrivalDate).getTime() - new Date(b.arrivalDate).getTime()
    )
    let idx = 0
    for (const t of sorted) {
      if (!map.has(t.country)) {
        map.set(t.country, getCountryColor(t.country, idx))
        idx++
      }
    }
    return map
  }, [trips])

  const yearTrips = useMemo(() => {
    const yearStart = new Date(year, 0, 1).getTime()
    const yearEnd = new Date(year + 1, 0, 1).getTime()
    return trips.filter((t) => {
      const arrival = new Date(t.arrivalDate).getTime()
      const departure = t.departureDate
        ? new Date(t.departureDate).getTime() + 86400000
        : arrival + 86400000
      return arrival < yearEnd && departure > yearStart
    })
  }, [trips, year])

  const tripDayMap = useMemo(() => {
    const map = new Map<string, DayTripInfo>()
    for (const trip of yearTrips) {
      const arrival = new Date(trip.arrivalDate)
      const departure = trip.departureDate ? new Date(trip.departureDate) : arrival
      const color = countryColorMap.get(trip.country) ?? '#3b82f6'
      const current = new Date(arrival)
      while (current <= departure) {
        const key = `${current.getFullYear()}-${current.getMonth()}-${current.getDate()}`
        const existing = map.get(key)
        if (existing) {
          existing.trips.push(trip)
          if (!existing.colors.includes(color)) {
            existing.colors.push(color)
          }
        } else {
          map.set(key, { trips: [trip], colors: [color] })
        }
        current.setDate(current.getDate() + 1)
      }
    }
    return map
  }, [yearTrips, countryColorMap])

  const monthTripCounts = useMemo(() => {
    const counts: number[] = Array(12).fill(0)
    for (let m = 0; m < 12; m++) {
      const tripIds = new Set<string>()
      const daysInMonth = new Date(year, m + 1, 0).getDate()
      for (let d = 1; d <= daysInMonth; d++) {
        const key = `${year}-${m}-${d}`
        const info = tripDayMap.get(key)
        if (info) {
          for (const t of info.trips) tripIds.add(t.id)
        }
      }
      counts[m] = tripIds.size
    }
    return counts
  }, [tripDayMap, year])

  const legendCountries = useMemo(() => {
    const countries = new Set<string>()
    for (const t of yearTrips) countries.add(t.country)
    return Array.from(countries).sort()
  }, [yearTrips])

  const handleDayContextMenu = useCallback((date: Date) => {
    setTouchSelectedTrips(null)
    setRange((prev) => {
      if (!prev.start || prev.end) {
        return { start: date, end: null }
      }
      if (date < prev.start) {
        return { start: date, end: prev.start }
      }
      return { start: prev.start, end: date }
    })
  }, [])

  const handlePrevYear = useCallback(() => {
    setTouchSelectedTrips(null)
    clearRange()
    setYear((y) => y - 1)
  }, [clearRange])

  const handleNextYear = useCallback(() => {
    setTouchSelectedTrips(null)
    clearRange()
    setYear((y) => y + 1)
  }, [clearRange])

  const isCurrentYear = year === today.getFullYear()

  const handleGoToCurrentYear = useCallback(() => {
    setTouchSelectedTrips(null)
    clearRange()
    setYear(today.getFullYear())
  }, [today, clearRange])

  const handleOpenChange = useCallback((val: boolean) => {
    if (!val) clearRange()
    onOpenChange(val)
  }, [clearRange, onOpenChange])

  const handleDayCellClick = useCallback((dayTrips: Trip[]) => {
    if (dayTrips.length === 1) {
      onTripClick?.(dayTrips[0])
      onOpenChange(false)
    } else {
      setTouchSelectedTrips(dayTrips)
    }
  }, [onTripClick, onOpenChange])

  const handleDayCellTouch = useCallback((dayTrips: Trip[]) => {
    setTouchSelectedTrips((prev) => {
      if (prev && prev.length === dayTrips.length && prev.every((t, i) => t.id === dayTrips[i].id)) {
        return null
      }
      return dayTrips
    })
  }, [])

  const handleTouchTripNavigate = useCallback((trip: Trip) => {
    onTripClick?.(trip)
    onOpenChange(false)
    setTouchSelectedTrips(null)
  }, [onTripClick, onOpenChange])

  const handleMonthClick = useCallback((monthIdx: number) => {
    onMonthSelect?.(year, monthIdx)
  }, [year, onMonthSelect])

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="max-w-[1200px] sm:max-w-[1200px] w-[calc(100vw-2rem)] p-0 gap-0 overflow-hidden top-[5vh] translate-y-0 data-[state=open]:zoom-in-100 data-[state=closed]:zoom-out-100"
        showCloseButton
      >
        <DialogDescription className="sr-only">Full year travel calendar overview</DialogDescription>
        <div onClick={() => { setTouchSelectedTrips(null); clearRange() }} className="flex flex-col max-h-[90vh] select-none">
        <div className="flex flex-col gap-2 px-6 pt-5 pb-3 pr-10 shrink-0">
          <div className="flex items-center gap-2">
            <Button
              size="icon"
              variant="ghost"
              onClick={handlePrevYear}
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <DialogTitle className="text-base font-semibold min-w-[50px] text-center">
              {year}
            </DialogTitle>
            <Button
              size="icon"
              variant="ghost"
              onClick={handleNextYear}
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            {!isCurrentYear && (
              <Button
                size="sm"
                variant="ghost"
                onClick={handleGoToCurrentYear}
                className="h-7 text-[10px] text-muted-foreground hover:text-foreground px-2"
              >
                <CalendarDays className="h-3 w-3 mr-1" />
                Today
              </Button>
            )}
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden thin-scrollbar px-6 pb-4">
        {yearTrips.length === 0 ? (
          <div className="flex items-center justify-center py-16">
            <p className="text-sm text-muted-foreground">No trips in {year}</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-8 gap-y-5">
            {Array.from({ length: 12 }, (_, monthIdx) => (
              <MonthGrid
                key={monthIdx}
                year={year}
                month={monthIdx}
                today={today}
                tripDayMap={tripDayMap}
                countryColorMap={countryColorMap}
                tripCount={monthTripCounts[monthIdx]}
                onDayClick={handleDayCellClick}
                onDayTouch={handleDayCellTouch}
                onMonthClick={onMonthSelect ? handleMonthClick : undefined}
                rangeStart={rangeStart}
                rangeEnd={rangeEnd}
                onDayContextMenu={handleDayContextMenu}
              />
            ))}
          </div>
        )}
        </div>

        {rangeStart && rangeEnd && (
          <RangeInfo
            rangeStart={rangeStart}
            rangeEnd={rangeEnd}
            tripDayMap={tripDayMap}
            countryColorMap={countryColorMap}
            yearTrips={yearTrips}
            onDismiss={clearRange}
          />
        )}

        {touchSelectedTrips && touchSelectedTrips.length > 0 && (
          <div className={`${GLASS.control} rounded-lg p-2.5 mx-6 mt-3 space-y-1 shrink-0`} onClick={(e) => e.stopPropagation()}>
            {touchSelectedTrips.map((trip) => (
              <button
                key={trip.id}
                onClick={() => handleTouchTripNavigate(trip)}
                className="w-full flex items-center gap-2.5 text-left p-1.5 rounded-md hover:bg-accent/50 transition-colors"
              >
                <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: countryColorMap.get(trip.country) ?? '#3b82f6' }} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground truncate">
                    {trip.city}, {trip.country} {countryFlag(trip.country)}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {formatShortDate(trip.arrivalDate)}
                    {trip.departureDate && ` \u2013 ${formatShortDate(trip.departureDate)}`}
                    {trip.durationDays != null && ` \u00b7 ${trip.durationDays}d`}
                  </p>
                </div>
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              </button>
            ))}
          </div>
        )}

        {(legendCountries.length > 0 || yearTrips.length > 0) && (
          <div className="shrink-0 px-6 pb-5">
          {legendCountries.length > 0 && (
            <div className="flex flex-wrap gap-x-3 gap-y-1.5 pt-3 mt-2 border-t border-border">
              {legendCountries.map((country) => {
                const color = countryColorMap.get(country) ?? '#3b82f6'
                return (
                  <div key={country} className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                    <span className="text-[11px] text-muted-foreground">
                      {countryFlag(country)} {country}
                    </span>
                  </div>
                )
              })}
            </div>
          )}

          {yearTrips.length > 0 && (
            <YearStats trips={yearTrips} tripDayMap={tripDayMap} year={year} isCurrentYear={isCurrentYear} />
          )}
          </div>
        )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

interface YearStatsProps {
  trips: Trip[]
  tripDayMap: Map<string, DayTripInfo>
  year: number
  isCurrentYear: boolean
}

function YearStats({ trips, tripDayMap, year, isCurrentYear }: YearStatsProps) {
  const stats = useMemo(() => {
    const now = new Date()
    const pastTrips = isCurrentYear
      ? trips.filter((t) => new Date(t.arrivalDate) <= now)
      : trips

    const visitedCountries = new Set<string>()
    const visitedCities = new Set<string>()
    for (const t of pastTrips) {
      visitedCountries.add(t.country)
      visitedCities.add(`${t.city}-${t.country}`)
    }

    const plannedCountries = new Set<string>()
    const plannedCities = new Set<string>()
    for (const t of trips) {
      plannedCountries.add(t.country)
      plannedCities.add(`${t.city}-${t.country}`)
    }

    let totalDays = 0
    const daysInYear = ((year % 4 === 0 && year % 100 !== 0) || year % 400 === 0) ? 366 : 365
    for (let m = 0; m < 12; m++) {
      const dim = new Date(year, m + 1, 0).getDate()
      for (let d = 1; d <= dim; d++) {
        const key = `${year}-${m}-${d}`
        if (tripDayMap.has(key)) totalDays++
      }
    }

    return {
      visitedTrips: pastTrips.length,
      visitedCountries: visitedCountries.size,
      visitedCities: visitedCities.size,
      plannedTrips: trips.length,
      plannedCountries: plannedCountries.size,
      plannedCities: plannedCities.size,
      totalDays, daysInYear,
    }
  }, [trips, tripDayMap, year, isCurrentYear])

  return (
    <div className="flex items-center gap-4 pt-2 mt-1 border-t border-border text-[11px] text-muted-foreground">
      <span>
        <strong className="text-foreground">{stats.visitedTrips}</strong>
        {isCurrentYear && <span>/{stats.plannedTrips}</span>}
        {' '}trips
      </span>
      <span>
        <strong className="text-foreground">{stats.visitedCountries}</strong>
        {isCurrentYear && <span>/{stats.plannedCountries}</span>}
        {' '}countries
      </span>
      <span>
        <strong className="text-foreground">{stats.visitedCities}</strong>
        {isCurrentYear && <span>/{stats.plannedCities}</span>}
        {' '}cities
      </span>
      <span><strong className="text-foreground">{stats.totalDays}</strong>/{stats.daysInYear} days abroad</span>
    </div>
  )
}

interface RangeInfoProps {
  rangeStart: Date
  rangeEnd: Date
  tripDayMap: Map<string, DayTripInfo>
  countryColorMap: Map<string, string>
  yearTrips: Trip[]
  onDismiss: () => void
}

function RangeInfo({ rangeStart, rangeEnd, tripDayMap, countryColorMap, yearTrips, onDismiss }: RangeInfoProps) {
  const stats = useMemo(() => {
    const totalDays = Math.floor((rangeEnd.getTime() - rangeStart.getTime()) / 86400000) + 1
    const weeks = Math.floor(totalDays / 7)
    const remainderDays = totalDays % 7

    const countryDays = new Map<string, number>()
    const tripsInRange = new Set<string>()
    let daysWithTrips = 0

    const cursor = new Date(rangeStart)
    while (cursor <= rangeEnd) {
      const key = `${cursor.getFullYear()}-${cursor.getMonth()}-${cursor.getDate()}`
      const info = tripDayMap.get(key)
      if (info) {
        daysWithTrips++
        const countries = new Set<string>()
        for (const trip of info.trips) {
          tripsInRange.add(trip.id)
          countries.add(trip.country)
        }
        for (const c of countries) {
          countryDays.set(c, (countryDays.get(c) ?? 0) + 1)
        }
      }
      cursor.setDate(cursor.getDate() + 1)
    }

    const matchedTrips = yearTrips.filter(t => tripsInRange.has(t.id))

    const sortedCountries = Array.from(countryDays.entries()).sort((a, b) => b[1] - a[1])

    return { totalDays, weeks, remainderDays, daysWithTrips, daysWithout: totalDays - daysWithTrips, sortedCountries, matchedTrips }
  }, [rangeStart, rangeEnd, tripDayMap, yearTrips])

  const label = `${rangeStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${rangeEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`

  const durationLabel = stats.weeks > 0
    ? `${stats.weeks}w${stats.remainderDays > 0 ? ` ${stats.remainderDays}d` : ''}`
    : `${stats.totalDays}d`

  return (
    <div className={`${GLASS.control} rounded-lg p-3 mx-6 mt-3 shrink-0`} onClick={(e) => e.stopPropagation()}>
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-2 flex-1 min-w-0">
          <div className="flex items-center gap-3 text-xs">
            <span className="font-semibold text-foreground">{label}</span>
            <span className="text-muted-foreground">{stats.totalDays} days ({durationLabel})</span>
          </div>

          {stats.sortedCountries.length > 0 && (
            <div className="flex flex-wrap gap-x-3 gap-y-1">
              {stats.sortedCountries.map(([country, days]) => (
                <span key={country} className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: countryColorMap.get(country) ?? '#3b82f6' }} />
                  {countryFlag(country)} {country} <strong className="text-foreground">{days}d</strong>
                </span>
              ))}
            </div>
          )}

          <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
            <span><strong className="text-foreground">{stats.matchedTrips.length}</strong> trips</span>
            <span><strong className="text-foreground">{stats.daysWithTrips}</strong> days abroad</span>
            <span><strong className="text-foreground">{stats.daysWithout}</strong> days home</span>
          </div>
        </div>
        <button aria-label="Dismiss range selection" onClick={(e) => { e.stopPropagation(); onDismiss() }} className="text-muted-foreground hover:text-foreground p-0.5 rounded-sm hover:bg-accent/50">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}

interface MonthGridProps {
  year: number
  month: number
  today: Date
  tripDayMap: Map<string, DayTripInfo>
  countryColorMap: Map<string, string>
  tripCount: number
  onDayClick: (trips: Trip[]) => void
  onDayTouch: (trips: Trip[]) => void
  onMonthClick?: (month: number) => void
  rangeStart: Date | null
  rangeEnd: Date | null
  onDayContextMenu: (date: Date) => void
}

function isInRange(day: Date, start: Date | null, end: Date | null): boolean {
  if (!start || !end) return false
  const t = day.getTime()
  return t >= start.getTime() && t <= end.getTime()
}

function isSameDay(a: Date, b: Date | null): boolean {
  if (!b) return false
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function MonthGrid({ year, month, today, tripDayMap, countryColorMap, tripCount, onDayClick, onDayTouch, onMonthClick, rangeStart, rangeEnd, onDayContextMenu }: MonthGridProps) {
  const days = useMemo(() => getCalendarDays(year, month), [year, month])
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month

  return (
    <TooltipProvider>
      <div>
        {onMonthClick ? (
          <button
            onClick={() => onMonthClick(month)}
            className={`text-sm font-semibold mb-2 cursor-pointer hover:text-foreground text-left ${isCurrentMonth ? 'text-orange-500' : 'text-foreground/80'}`}
          >
            {MONTH_NAMES_SHORT[month]}
            {tripCount > 0 && (
              <span className="text-muted-foreground font-normal"> &middot; {tripCount}</span>
            )}
          </button>
        ) : (
          <h3 className={`text-sm font-semibold mb-2 ${isCurrentMonth ? 'text-orange-500' : 'text-foreground/80'}`}>
            {MONTH_NAMES_SHORT[month]}
            {tripCount > 0 && (
              <span className="text-muted-foreground font-normal"> &middot; {tripCount}</span>
            )}
          </h3>
        )}
        <table className="w-full border-separate" style={{ borderSpacing: '2px 1px', margin: '-2px' }}>
          <thead>
            <tr>
              {DAY_HEADERS.map((d, i) => (
                <th key={i} className="text-[10px] text-muted-foreground/50 font-normal pb-0.5 text-center">
                  {d}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: Math.ceil(days.length / 7) }, (_, weekIdx) => (
              <tr key={weekIdx}>
                {days.slice(weekIdx * 7, weekIdx * 7 + 7).map((day, dayIdx) => {
                  const idx = weekIdx * 7 + dayIdx
                  const inMonth = day.getMonth() === month
                  const isToday = inMonth &&
                    day.getDate() === today.getDate() &&
                    day.getMonth() === today.getMonth() &&
                    day.getFullYear() === today.getFullYear()
                  const key = `${day.getFullYear()}-${day.getMonth()}-${day.getDate()}`
                  const info = inMonth ? tripDayMap.get(key) : undefined
                  const hasTrips = !!info && info.trips.length > 0
                  const cellKey = `${month}-${idx}`

                  if (!inMonth) {
                    return <td key={cellKey} className={CELL_H} />
                  }

                  const inRange = isInRange(day, rangeStart, rangeEnd)
                  const isRangeEndpoint = isSameDay(day, rangeStart) || isSameDay(day, rangeEnd)
                  const isOnlyRangeStart = !rangeEnd && isSameDay(day, rangeStart)

                  const cell = (
                    <div
                      className={`
                        relative ${CELL_H} flex items-center justify-center
                        text-[11px] sm:text-xs leading-none rounded-[3px]
                        ${isToday ? 'font-bold' : ''}
                        ${hasTrips && !isToday ? 'font-medium' : ''}
                        ${hasTrips ? 'cursor-pointer hover:ring-1 hover:ring-foreground/20' : ''}
                        ${inRange ? 'ring-2 ring-sky-500/50' : ''}
                        ${isRangeEndpoint || isOnlyRangeStart ? 'bg-sky-500/20' : ''}
                      `}
                      onClick={hasTrips ? (e) => { e.stopPropagation(); onDayClick(info.trips) } : undefined}
                      onTouchEnd={hasTrips ? (e) => { e.preventDefault(); onDayTouch(info.trips) } : undefined}
                      onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); onDayContextMenu(day) }}
                    >
                      {hasTrips && (
                        <div className="absolute inset-0 rounded-[3px] opacity-25" style={{ backgroundColor: info.colors[0] }} />
                      )}
                      <span
                        className={`
                          relative z-10
                          ${isToday ? 'bg-orange-500 text-white rounded-full w-5 h-5 sm:w-[22px] sm:h-[22px] flex items-center justify-center text-[10px]' : ''}
                          ${!hasTrips && !isToday ? 'text-foreground/60' : ''}
                        `}
                        style={hasTrips && !isToday ? { color: getCountryTextColor(info.colors[0]) } : undefined}
                      >
                        {day.getDate()}
                      </span>
                      {hasTrips && info.colors.length > 1 && (
                        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 flex gap-px">
                          {info.colors.slice(0, 3).map((c, i) => (
                            <div key={i} className="w-1 h-1 rounded-full" style={{ backgroundColor: c }} />
                          ))}
                        </div>
                      )}
                    </div>
                  )

                  if (!hasTrips) {
                    return <td key={cellKey}>{cell}</td>
                  }

                  return (
                    <td key={cellKey}>
                      <Tooltip delayDuration={150}>
                        <TooltipTrigger asChild>
                          {cell}
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-xs max-w-[200px]">
                          <div className="space-y-0.5">
                            {info.trips.map((t) => (
                              <p key={t.id} className="flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: countryColorMap.get(t.country) ?? '#3b82f6' }} />
                                <span className="font-medium">{t.city}</span>
                                <span className="text-muted-foreground">{countryFlag(t.country)}</span>
                              </p>
                            ))}
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </TooltipProvider>
  )
}
