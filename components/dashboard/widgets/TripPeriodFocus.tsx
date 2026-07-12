'use client'

import { useMemo } from 'react'
import { Route, CalendarRange, X } from 'lucide-react'
import type { DateRange } from 'react-day-picker'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { toDateOnlyStr, toDateStr, formatDateOnly } from '@/lib/utils'
import type { Trip } from '@/lib/db/schema'
import type { TripFocusRange } from '@/hooks/use-trip-focus'

interface TripPeriodFocusProps {
  trips: Trip[]
  range: TripFocusRange | null
  focusedCount: number
  onChange: (range: TripFocusRange | null) => void
}

function parseLocal(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

const chipBase =
  'h-6 px-2.5 rounded-full text-[11px] font-medium transition-colors border'
const chipInactive =
  'border-border/60 text-muted-foreground hover:text-foreground hover:bg-accent'
const chipActive =
  'border-blue-400/50 bg-blue-500/15 text-blue-500 dark:text-blue-300'

export default function TripPeriodFocus({ trips, range, focusedCount, onChange }: TripPeriodFocusProps) {
  const years = useMemo(() => {
    const set = new Set<number>()
    for (const t of trips) {
      const arrival = toDateOnlyStr(t.arrivalDate)
      if (arrival) set.add(parseInt(arrival.slice(0, 4), 10))
    }
    return Array.from(set).sort((a, b) => b - a)
  }, [trips])

  const activeYear = useMemo(() => {
    if (!range) return null
    for (const y of years) {
      if (range.start === `${y}-01-01` && range.end === `${y}-12-31`) return y
    }
    return null
  }, [range, years])

  const isCustom = range !== null && activeYear === null

  const selectYear = (year: number) => {
    if (activeYear === year) {
      onChange(null)
      return
    }
    onChange({ start: `${year}-01-01`, end: `${year}-12-31` })
  }

  const calendarSelected: DateRange | undefined = range
    ? { from: parseLocal(range.start), to: parseLocal(range.end) }
    : undefined

  const onCalendarSelect = (r: DateRange | undefined) => {
    if (!r?.from) {
      onChange(null)
      return
    }
    onChange({ start: toDateStr(r.from), end: toDateStr(r.to ?? r.from) })
  }

  if (years.length === 0) return null

  return (
    <div className="mb-3 rounded-xl border border-border/50 bg-muted/20 p-2.5 space-y-2">
      <div className="flex items-center justify-between">
        <span className="meta-label flex items-center gap-1.5">
          <Route className="h-3 w-3" />
          Focus route
        </span>
        {range && (
          <button
            onClick={() => onChange(null)}
            className="flex items-center gap-0.5 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-2.5 w-2.5" />
            Clear
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {years.map((y) => (
          <button
            key={y}
            onClick={() => selectYear(y)}
            className={`${chipBase} ${activeYear === y ? chipActive : chipInactive}`}
          >
            {y}
          </button>
        ))}
        <Popover>
          <PopoverTrigger asChild>
            <button className={`${chipBase} flex items-center gap-1 ${isCustom ? chipActive : chipInactive}`}>
              <CalendarRange className="h-3 w-3" />
              {isCustom ? `${formatDateOnly(range!.start)} – ${formatDateOnly(range!.end)}` : 'Custom'}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="range"
              numberOfMonths={1}
              selected={calendarSelected}
              onSelect={onCalendarSelect}
              defaultMonth={range ? parseLocal(range.start) : undefined}
            />
          </PopoverContent>
        </Popover>
      </div>

      {range && (
        <p className="text-[10px] text-muted-foreground">
          Showing {focusedCount} trip{focusedCount === 1 ? '' : 's'} on the map
        </p>
      )}
    </div>
  )
}
