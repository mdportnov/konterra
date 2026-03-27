'use client'

import { useState, useMemo, useCallback } from 'react'
import { ChevronLeft, ChevronRight, CalendarDays, Maximize2 } from 'lucide-react'
import YearCalendarDialog from './YearCalendarDialog'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { GLASS } from '@/lib/constants/ui'
import { getMondayStart, getCountryColor } from '@/lib/constants/calendar'
import { countryFlag } from '@/lib/country-flags'
import type { Trip } from '@/lib/db/schema'

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

function getCountryHexColor(country: string, countryMap: Map<string, string>): string {
  return countryMap.get(country) ?? getCountryColor(country, countryMap.size)
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function dateToKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

interface CalendarWeek {
  days: Date[]
}

function getCalendarWeeks(year: number, month: number): CalendarWeek[] {
  const weeks: CalendarWeek[] = []
  const start = getMondayStart(year, month)
  const current = new Date(start)

  for (let w = 0; w < 6; w++) {
    const days: Date[] = []
    for (let d = 0; d < 7; d++) {
      days.push(new Date(current))
      current.setDate(current.getDate() + 1)
    }
    if (w === 5 && days[0].getMonth() !== month) break
    weeks.push({ days })
  }
  return weeks
}

interface TripBar {
  trip: Trip
  color: string
  startCol: number
  endCol: number
  isStart: boolean
  isEnd: boolean
  lane: number
}

function layoutTripsForWeek(
  weekDays: Date[],
  trips: Trip[],
  countryMap: Map<string, string>,
): TripBar[] {
  const weekStart = weekDays[0].getTime()
  const weekEnd = weekDays[6].getTime() + 86400000

  const relevant = trips.filter((t) => {
    const arrival = new Date(t.arrivalDate).getTime()
    const departure = t.departureDate
      ? new Date(t.departureDate).getTime() + 86400000
      : arrival + 86400000
    return arrival < weekEnd && departure > weekStart
  })

  relevant.sort((a, b) => {
    const aStart = new Date(a.arrivalDate).getTime()
    const bStart = new Date(b.arrivalDate).getTime()
    if (aStart !== bStart) return aStart - bStart
    const aEnd = a.departureDate ? new Date(a.departureDate).getTime() : aStart
    const bEnd = b.departureDate ? new Date(b.departureDate).getTime() : bStart
    return (bEnd - bStart) - (aEnd - aStart)
  })

  const lanes: number[][] = []
  const bars: TripBar[] = []

  for (const trip of relevant) {
    const arrival = new Date(trip.arrivalDate)
    const departure = trip.departureDate ? new Date(trip.departureDate) : arrival

    let startCol = 0
    for (let i = 0; i < 7; i++) {
      if (weekDays[i].getTime() <= arrival.getTime() && arrival.getTime() < weekDays[i].getTime() + 86400000) {
        startCol = i
        break
      } else if (arrival.getTime() < weekDays[0].getTime()) {
        startCol = 0
        break
      }
    }

    let endCol = 6
    for (let i = 6; i >= 0; i--) {
      if (weekDays[i].getTime() <= departure.getTime() && departure.getTime() < weekDays[i].getTime() + 86400000) {
        endCol = i
        break
      } else if (departure.getTime() >= weekDays[6].getTime() + 86400000) {
        endCol = 6
        break
      }
    }

    if (endCol < startCol) endCol = startCol

    const isStart = arrival.getTime() >= weekStart
    const isEnd = departure.getTime() < weekEnd

    let lane = 0
    for (let l = 0; l < lanes.length; l++) {
      const occupied = lanes[l]
      let fits = true
      for (let c = startCol; c <= endCol; c++) {
        if (occupied.includes(c)) { fits = false; break }
      }
      if (fits) { lane = l; break }
      if (l === lanes.length - 1) { lane = lanes.length; break }
    }

    if (!lanes[lane]) lanes[lane] = []
    for (let c = startCol; c <= endCol; c++) {
      lanes[lane].push(c)
    }

    bars.push({
      trip,
      color: getCountryHexColor(trip.country, countryMap),
      startCol,
      endCol,
      isStart,
      isEnd,
      lane,
    })
  }

  return bars
}

interface TripCalendarProps {
  trips: Trip[]
  onTripClick?: (trip: Trip) => void
  onAddTrip?: (prefill?: { arrivalDate?: string; departureDate?: string }) => void
  onEditTrip?: (trip: Trip) => void
  onDeleteTrip?: (trip: Trip) => void
}

export default function TripCalendar({ trips, onTripClick, onAddTrip }: TripCalendarProps) {
  const today = useMemo(() => new Date(), [])
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [hoveredTripId, setHoveredTripId] = useState<string | null>(null)
  const [touchSelectedTrip, setTouchSelectedTrip] = useState<Trip | null>(null)
  const [yearDialogOpen, setYearDialogOpen] = useState(false)

  const countryColorMap = useMemo(() => {
    const map = new Map<string, string>()
    const sorted = [...trips].sort((a, b) =>
      new Date(a.arrivalDate).getTime() - new Date(b.arrivalDate).getTime()
    )
    for (const t of sorted) {
      if (!map.has(t.country)) {
        map.set(t.country, getCountryColor(t.country, map.size))
      }
    }
    return map
  }, [trips])

  const weeks = useMemo(() => getCalendarWeeks(year, month), [year, month])

  const weekBars = useMemo(() => {
    return weeks.map((week) => layoutTripsForWeek(week.days, trips, countryColorMap))
  }, [weeks, trips, countryColorMap])

  const maxLanes = useMemo(() => {
    return weekBars.map((bars) => {
      if (bars.length === 0) return 0
      return Math.max(...bars.map((b) => b.lane)) + 1
    })
  }, [weekBars])

  const legendCountries = useMemo(() => {
    const countries = new Set<string>()
    for (const bars of weekBars) {
      for (const bar of bars) countries.add(bar.trip.country)
    }
    return Array.from(countries).sort()
  }, [weekBars])

  const goToMonth = useCallback((dir: -1 | 1) => {
    setTouchSelectedTrip(null)
    if (dir === -1) {
      if (month === 0) { setMonth(11); setYear((y) => y - 1) }
      else setMonth((m) => m - 1)
    } else {
      if (month === 11) { setMonth(0); setYear((y) => y + 1) }
      else setMonth((m) => m + 1)
    }
  }, [month])

  const goToToday = useCallback(() => {
    setTouchSelectedTrip(null)
    setYear(today.getFullYear())
    setMonth(today.getMonth())
  }, [today])

  const isCurrentMonth = year === today.getFullYear() && month === today.getMonth()

  const handleDayClick = useCallback((day: Date) => {
    if (!onAddTrip) return
    if (day.getMonth() !== month) return
    const dateStr = dateToKey(day)
    onAddTrip({ arrivalDate: dateStr })
  }, [onAddTrip, month])

  const handleBarClick = useCallback((trip: Trip, e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation()
    if ('touches' in e) {
      setTouchSelectedTrip((prev) => prev?.id === trip.id ? null : trip)
    } else {
      onTripClick?.(trip)
    }
  }, [onTripClick])

  const handleTouchTripNavigate = useCallback(() => {
    if (touchSelectedTrip) {
      onTripClick?.(touchSelectedTrip)
      setTouchSelectedTrip(null)
    }
  }, [touchSelectedTrip, onTripClick])

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            onClick={() => goToMonth(-1)}
            className="h-6 w-6 text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>
          <span className="text-xs font-semibold text-foreground min-w-[120px] text-center">
            {MONTH_NAMES[month]} {year}
          </span>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => goToMonth(1)}
            className="h-6 w-6 text-muted-foreground hover:text-foreground"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
        <div className="flex items-center gap-1">
          {!isCurrentMonth && (
            <Button
              size="sm"
              variant="ghost"
              onClick={goToToday}
              className="h-6 text-[10px] text-muted-foreground hover:text-foreground px-2"
            >
              <CalendarDays className="h-3 w-3 mr-1" />
              Today
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setYearDialogOpen(true)}
            className="h-6 text-[10px] text-muted-foreground hover:text-foreground px-2"
          >
            <Maximize2 className="h-3 w-3 mr-1" />
            Year
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-px">
        {DAY_NAMES.map((d) => (
          <div key={d} className="text-[9px] font-medium text-muted-foreground/60 text-center py-1">
            {d}
          </div>
        ))}
      </div>

      <div className="space-y-0">
        {weeks.map((week, wIdx) => {
          const bars = weekBars[wIdx]
          const lanes = maxLanes[wIdx]
          const barHeight = 18
          const barGap = 2
          const barsAreaHeight = lanes > 0 ? lanes * (barHeight + barGap) + 2 : 0

          return (
            <div key={wIdx} className="relative">
              <div className="grid grid-cols-7 gap-px">
                {week.days.map((day, dIdx) => {
                  const isCurrentMonth = day.getMonth() === month
                  const isToday = isSameDay(day, today)

                  return (
                    <button
                      key={dIdx}
                      onClick={() => handleDayClick(day)}
                      disabled={!isCurrentMonth}
                      className={`
                        relative text-center pt-0.5 pb-0.5
                        ${isCurrentMonth ? 'cursor-pointer hover:bg-accent/50' : 'opacity-30 cursor-default'}
                        ${isToday ? 'font-bold' : ''}
                        transition-colors rounded-sm
                      `}
                    >
                      <span className={`
                        text-[10px] leading-none inline-flex items-center justify-center
                        ${isToday ? 'bg-orange-500 text-white rounded-full w-4.5 h-4.5' : 'text-foreground/70'}
                      `}>
                        {day.getDate()}
                      </span>
                    </button>
                  )
                })}
              </div>

              {barsAreaHeight > 0 && (
                <div
                  className="relative mx-0"
                  style={{ height: barsAreaHeight }}
                >
                  {bars.map((bar, bIdx) => {
                    const leftPercent = (bar.startCol / 7) * 100
                    const widthPercent = ((bar.endCol - bar.startCol + 1) / 7) * 100
                    const topPx = bar.lane * (barHeight + barGap) + 1
                    const isHovered = hoveredTripId === bar.trip.id
                    const isTouchSelected = touchSelectedTrip?.id === bar.trip.id

                    return (
                      <TooltipProvider key={bIdx}>
                        <Tooltip delayDuration={200}>
                          <TooltipTrigger asChild>
                            <button
                              onClick={(e) => handleBarClick(bar.trip, e)}
                              onTouchEnd={(e) => handleBarClick(bar.trip, e)}
                              onMouseEnter={() => setHoveredTripId(bar.trip.id)}
                              onMouseLeave={() => setHoveredTripId(null)}
                              className={`
                                absolute flex items-center gap-1 px-1.5 overflow-hidden
                                ${isHovered || isTouchSelected ? 'opacity-100 shadow-sm ring-1 ring-white/20' : 'opacity-75'}
                                ${bar.isStart ? 'rounded-l-full' : 'rounded-l-none'}
                                ${bar.isEnd ? 'rounded-r-full' : 'rounded-r-none'}
                                transition-all duration-150 cursor-pointer
                                hover:opacity-100 hover:shadow-sm
                              `}
                              style={{
                                left: `${leftPercent}%`,
                                width: `${widthPercent}%`,
                                top: topPx,
                                height: barHeight,
                                backgroundColor: bar.color,
                              }}
                            >
                              <span className="text-[9px] font-medium text-white truncate leading-none">
                                {bar.trip.city}
                              </span>
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="text-xs max-w-[200px]">
                            <div className="space-y-0.5">
                              <p className="font-medium">
                                {bar.trip.city}, {bar.trip.country} {countryFlag(bar.trip.country)}
                              </p>
                              <p className="text-muted-foreground">
                                {formatShortDate(bar.trip.arrivalDate)}
                                {bar.trip.departureDate && ` \u2013 ${formatShortDate(bar.trip.departureDate)}`}
                              </p>
                              {bar.trip.durationDays != null && (
                                <p className="text-muted-foreground">{bar.trip.durationDays} days</p>
                              )}
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )
                  })}
                </div>
              )}

              {barsAreaHeight === 0 && (
                <div className="h-0.5" />
              )}
            </div>
          )
        })}
      </div>

      {touchSelectedTrip && (
        <button
          onClick={handleTouchTripNavigate}
          className={`w-full ${GLASS.control} rounded-lg p-2.5 flex items-center gap-2.5 text-left transition-all`}
        >
          <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: countryColorMap.get(touchSelectedTrip.country) ?? '#3b82f6' }} />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-foreground truncate">
              {touchSelectedTrip.city}, {touchSelectedTrip.country} {countryFlag(touchSelectedTrip.country)}
            </p>
            <p className="text-[10px] text-muted-foreground">
              {formatShortDate(touchSelectedTrip.arrivalDate)}
              {touchSelectedTrip.departureDate && ` \u2013 ${formatShortDate(touchSelectedTrip.departureDate)}`}
              {touchSelectedTrip.durationDays != null && ` \u00b7 ${touchSelectedTrip.durationDays}d`}
            </p>
          </div>
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        </button>
      )}

      {legendCountries.length > 0 && (
        <div className="flex flex-wrap gap-x-3 gap-y-1 pt-1">
          {legendCountries.map((country) => {
            const color = countryColorMap.get(country) ?? '#3b82f6'
            return (
              <div key={country} className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                <span className="text-[9px] text-muted-foreground/70">
                  {countryFlag(country)} {country}
                </span>
              </div>
            )
          })}
        </div>
      )}

      {yearDialogOpen && (
        <YearCalendarDialog
          open={yearDialogOpen}
          onOpenChange={setYearDialogOpen}
          trips={trips}
          onTripClick={onTripClick}
          initialYear={year}
          onMonthSelect={(y, m) => {
            setYear(y)
            setMonth(m)
            setYearDialogOpen(false)
          }}
        />
      )}
    </div>
  )
}

function formatShortDate(d: Date | string | null): string {
  if (!d) return ''
  const date = typeof d === 'string' ? new Date(d) : d
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
