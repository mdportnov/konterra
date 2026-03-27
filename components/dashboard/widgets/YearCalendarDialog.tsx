'use client'

import { useState, useMemo, useCallback } from 'react'
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react'
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

  const tripYears = useMemo(() => {
    const years = new Set<number>()
    years.add(today.getFullYear())
    for (const t of trips) {
      years.add(new Date(t.arrivalDate).getFullYear())
      if (t.departureDate) years.add(new Date(t.departureDate).getFullYear())
    }
    return Array.from(years).sort()
  }, [trips, today])

  const handlePrevYear = useCallback(() => {
    setTouchSelectedTrips(null)
    setYear((y) => y - 1)
  }, [])

  const handleNextYear = useCallback(() => {
    setTouchSelectedTrips(null)
    setYear((y) => y + 1)
  }, [])

  const isCurrentYear = year === today.getFullYear()

  const handleGoToCurrentYear = useCallback(() => {
    setTouchSelectedTrips(null)
    setYear(today.getFullYear())
  }, [today])

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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-7xl w-[calc(100vw-2rem)] max-h-[90vh] overflow-y-auto p-4 sm:p-6"
        showCloseButton
      >
        <DialogDescription className="sr-only">Full year travel calendar overview</DialogDescription>
        <div onClick={() => setTouchSelectedTrips(null)}>
        <div className="flex flex-col gap-2 mb-4 pr-8">
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

          {tripYears.length > 0 && (
            <div className="flex items-center gap-1 flex-wrap">
              {tripYears.map((y) => (
                <button
                  key={y}
                  onClick={() => { setTouchSelectedTrips(null); setYear(y) }}
                  className={`text-[10px] px-1.5 py-0.5 rounded transition-colors ${
                    y === year
                      ? 'bg-foreground text-background font-semibold'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                  }`}
                >
                  {y}
                </button>
              ))}
            </div>
          )}
        </div>

        {yearTrips.length === 0 ? (
          <div className="flex items-center justify-center py-16">
            <p className="text-sm text-muted-foreground">No trips in {year}</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-x-4 gap-y-5 sm:gap-5">
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
              />
            ))}
          </div>
        )}

        {touchSelectedTrips && touchSelectedTrips.length > 0 && (
          <div className={`${GLASS.control} rounded-lg p-2.5 mt-3 space-y-1`} onClick={(e) => e.stopPropagation()}>
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

        {legendCountries.length > 0 && (
          <div className="flex flex-wrap gap-x-3 gap-y-1.5 pt-3 mt-2 border-t border-border">
            {legendCountries.map((country) => {
              const color = countryColorMap.get(country) ?? '#3b82f6'
              return (
                <div key={country} className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                  <span className="text-[10px] text-muted-foreground">
                    {countryFlag(country)} {country}
                  </span>
                </div>
              )
            })}
          </div>
        )}

        {yearTrips.length > 0 && (
          <YearStats trips={yearTrips} tripDayMap={tripDayMap} year={year} />
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
}

function YearStats({ trips, tripDayMap, year }: YearStatsProps) {
  const stats = useMemo(() => {
    const countries = new Set<string>()
    const cities = new Set<string>()
    let totalDays = 0
    for (const t of trips) {
      countries.add(t.country)
      cities.add(`${t.city}-${t.country}`)
    }
    const daysInYear = ((year % 4 === 0 && year % 100 !== 0) || year % 400 === 0) ? 366 : 365
    for (let m = 0; m < 12; m++) {
      const dim = new Date(year, m + 1, 0).getDate()
      for (let d = 1; d <= dim; d++) {
        const key = `${year}-${m}-${d}`
        if (tripDayMap.has(key)) totalDays++
      }
    }
    return { countries: countries.size, cities: cities.size, trips: trips.length, totalDays, daysInYear }
  }, [trips, tripDayMap, year])

  return (
    <div className="flex items-center gap-4 pt-2 mt-1 border-t border-border text-[10px] text-muted-foreground">
      <span><strong className="text-foreground">{stats.trips}</strong> trips</span>
      <span><strong className="text-foreground">{stats.countries}</strong> countries</span>
      <span><strong className="text-foreground">{stats.cities}</strong> cities</span>
      <span><strong className="text-foreground">{stats.totalDays}</strong>/{stats.daysInYear} days abroad</span>
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
}

function MonthGrid({ year, month, today, tripDayMap, countryColorMap, tripCount, onDayClick, onDayTouch, onMonthClick }: MonthGridProps) {
  const days = useMemo(() => getCalendarDays(year, month), [year, month])
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month

  return (
    <TooltipProvider>
      <div>
        {onMonthClick ? (
          <button
            onClick={() => onMonthClick(month)}
            className={`text-xs font-semibold mb-1.5 cursor-pointer hover:text-foreground text-left ${isCurrentMonth ? 'text-orange-500' : 'text-foreground/80'}`}
          >
            {MONTH_NAMES_SHORT[month]}
            {tripCount > 0 && (
              <span className="text-muted-foreground font-normal"> &middot; {tripCount}</span>
            )}
          </button>
        ) : (
          <h3 className={`text-xs font-semibold mb-1.5 ${isCurrentMonth ? 'text-orange-500' : 'text-foreground/80'}`}>
            {MONTH_NAMES_SHORT[month]}
            {tripCount > 0 && (
              <span className="text-muted-foreground font-normal"> &middot; {tripCount}</span>
            )}
          </h3>
        )}
        <div className="grid grid-cols-7 gap-0.5 mb-0.5">
          {DAY_HEADERS.map((d, i) => (
            <div key={i} className="text-[8px] sm:text-[9px] text-muted-foreground/50 text-center">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-0.5">
          {days.map((day, idx) => {
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
              return <div key={cellKey} className="aspect-square min-h-[22px] sm:min-h-[24px]" />
            }

            const cell = (
              <div
                className={`
                  relative w-full aspect-square min-h-[22px] sm:min-h-[24px] flex items-center justify-center
                  text-[10px] sm:text-[11px] leading-none rounded-[3px]
                  ${isToday ? 'font-bold' : ''}
                  ${hasTrips && !isToday ? 'font-medium' : ''}
                  ${hasTrips ? 'cursor-pointer hover:ring-1 hover:ring-foreground/20' : ''}
                `}
                onClick={hasTrips ? (e) => { e.stopPropagation(); onDayClick(info.trips) } : undefined}
                onTouchEnd={hasTrips ? (e) => { e.preventDefault(); onDayTouch(info.trips) } : undefined}
              >
                {hasTrips && (
                  <div className="absolute inset-0.5 rounded-[2px] opacity-25" style={{ backgroundColor: info.colors[0] }} />
                )}
                <span
                  className={`
                    relative z-10
                    ${isToday ? 'bg-orange-500 text-white rounded-full w-[18px] h-[18px] flex items-center justify-center text-[9px]' : ''}
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
              return <div key={cellKey}>{cell}</div>
            }

            return (
              <Tooltip key={cellKey} delayDuration={150}>
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
            )
          })}
        </div>
      </div>
    </TooltipProvider>
  )
}
