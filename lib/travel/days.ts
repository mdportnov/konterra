import type { Trip } from '@/lib/db/schema'

/**
 * Time-in-country statistics derived from the trip log.
 *
 * Deliberately citizenship-agnostic: Konterra does not know the user's passport, so it
 * reports neutral facts (days present, rolling windows, per-year breakdown) and never
 * interprets them as visa or tax entitlements.
 *
 * Counting convention: a stay counts every calendar day the user was present, arrival and
 * departure day included — the convention tax residency and most border rules use. Nights
 * are reported separately for people who think in hotel nights.
 */

const MS_PER_DAY = 86_400_000

/** Days since the Unix epoch in UTC. Integer day indexes sidestep DST entirely. */
export function toDayIndex(date: Date): number {
  return Math.floor(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) / MS_PER_DAY)
}

export function fromDayIndex(index: number): Date {
  return new Date(index * MS_PER_DAY)
}

export function yearOfDayIndex(index: number): number {
  return fromDayIndex(index).getUTCFullYear()
}

function asDate(value: Date | string | null | undefined): Date | null {
  if (!value) return null
  const d = value instanceof Date ? value : new Date(value)
  return isNaN(d.getTime()) ? null : d
}

export interface NormalizedStay {
  tripId: string
  country: string
  city: string
  /** First day present, inclusive. */
  start: number
  /** Last day present, inclusive. */
  end: number
  /** True when the trip has no departure date and is still running. */
  ongoing: boolean
  /** True when the stay begins after today. */
  planned: boolean
}

/**
 * Turns raw trips into day-index ranges. Trips without a departure date are treated as
 * ongoing and clipped to today; a trip that starts in the future is marked planned so it
 * never inflates "days so far".
 */
export function normalizeStays(trips: Trip[], today = new Date()): NormalizedStay[] {
  const todayIndex = toDayIndex(today)
  const stays: NormalizedStay[] = []

  for (const trip of trips) {
    const arrival = asDate(trip.arrivalDate)
    if (!arrival || !trip.country) continue

    const start = toDayIndex(arrival)
    const departure = asDate(trip.departureDate)
    const ongoing = !departure
    const rawEnd = departure ? toDayIndex(departure) : todayIndex
    // Guard against reversed dates in imported data rather than producing negative spans.
    const end = Math.max(start, rawEnd)

    stays.push({
      tripId: trip.id,
      country: trip.country,
      city: trip.city ?? '',
      start,
      end,
      ongoing: ongoing && start <= todayIndex,
      planned: start > todayIndex,
    })
  }

  return stays.sort((a, b) => a.start - b.start || a.end - b.end)
}

/**
 * Merges overlapping/adjacent ranges. Used per country so a country's day total can never
 * double-count a day covered by two overlapping trips.
 */
export function mergeRanges(ranges: { start: number; end: number }[]): { start: number; end: number }[] {
  if (ranges.length === 0) return []
  const sorted = [...ranges].sort((a, b) => a.start - b.start || a.end - b.end)
  const merged: { start: number; end: number }[] = [{ ...sorted[0] }]

  for (let i = 1; i < sorted.length; i++) {
    const current = sorted[i]
    const last = merged[merged.length - 1]
    // `start <= last.end + 1` also joins back-to-back stays into one continuous presence.
    if (current.start <= last.end + 1) {
      last.end = Math.max(last.end, current.end)
    } else {
      merged.push({ ...current })
    }
  }

  return merged
}

function countDays(ranges: { start: number; end: number }[], from: number, to: number): number {
  let total = 0
  for (const r of ranges) {
    const start = Math.max(r.start, from)
    const end = Math.min(r.end, to)
    if (end >= start) total += end - start + 1
  }
  return total
}

export interface CityBreakdown {
  city: string
  days: number
  visits: number
}

export interface CountryDays {
  country: string
  /** Distinct days present, all time, up to and including today. */
  totalDays: number
  /** Nights = days minus one per continuous block; matches hotel-night intuition. */
  totalNights: number
  daysThisYear: number
  daysLast12Months: number
  /** Longest single continuous presence, in days. */
  longestStayDays: number
  /** Number of separate arrivals (continuous blocks, not raw trip rows). */
  visits: number
  firstVisit: Date | null
  lastVisit: Date | null
  /** Currently in this country. */
  isCurrent: boolean
  /** Days already on the calendar for the future. */
  plannedDays: number
  nextArrival: Date | null
  cities: CityBreakdown[]
  /** Share of all tracked days spent here, 0..1. */
  share: number
}

export interface YearRow {
  year: number
  byCountry: Record<string, number>
  total: number
}

export interface TravelDaysSummary {
  countries: CountryDays[]
  years: YearRow[]
  totalTrackedDays: number
  countriesVisited: number
  citiesVisited: number
  currentCountry: string | null
  /** Consecutive days in the current country, counting back from today. */
  currentStreakDays: number
  /** Highest number of days spent in any single country within a rolling 180-day window. */
  maxDaysInRolling180: { country: string; days: number; windowStart: Date; windowEnd: Date } | null
  /** Trips whose ranges overlap another trip in a different country — a data-quality flag. */
  overlappingTripIds: string[]
  firstTrackedDay: Date | null
}

/** Rolling window used for the neutral "densest period" statistic. */
export const ROLLING_WINDOW_DAYS = 180

function maxDaysInRollingWindow(
  ranges: { start: number; end: number }[],
  windowDays: number,
): { days: number; windowStart: number; windowEnd: number } | null {
  if (ranges.length === 0) return null

  // The maximum for a fixed-width window is always attained by a window that ends on a
  // present day, so only those candidates need testing.
  let best = { days: 0, windowStart: 0, windowEnd: 0 }
  for (const r of ranges) {
    for (const candidateEnd of [r.end, r.start + windowDays - 1]) {
      const windowStart = candidateEnd - windowDays + 1
      const days = countDays(ranges, windowStart, candidateEnd)
      if (days > best.days) best = { days, windowStart, windowEnd: candidateEnd }
    }
  }

  return best.days > 0 ? best : null
}

function detectOverlaps(stays: NormalizedStay[]): string[] {
  const flagged = new Set<string>()
  const sorted = [...stays].filter((s) => !s.planned).sort((a, b) => a.start - b.start)

  for (let i = 0; i < sorted.length; i++) {
    for (let j = i + 1; j < sorted.length; j++) {
      if (sorted[j].start > sorted[i].end) break
      // Being in two cities of the same country in one day is normal; being in two
      // countries at once is the contradiction worth surfacing.
      if (sorted[i].country !== sorted[j].country) {
        flagged.add(sorted[i].tripId)
        flagged.add(sorted[j].tripId)
      }
    }
  }

  return [...flagged]
}

export function computeTravelDays(trips: Trip[], today = new Date()): TravelDaysSummary {
  const stays = normalizeStays(trips, today)
  const todayIndex = toDayIndex(today)

  if (stays.length === 0) {
    return {
      countries: [],
      years: [],
      totalTrackedDays: 0,
      countriesVisited: 0,
      citiesVisited: 0,
      currentCountry: null,
      currentStreakDays: 0,
      maxDaysInRolling180: null,
      overlappingTripIds: [],
      firstTrackedDay: null,
    }
  }

  const yearStart = toDayIndex(new Date(Date.UTC(today.getUTCFullYear(), 0, 1)))
  const rolling12Start = todayIndex - 364

  const byCountry = new Map<string, NormalizedStay[]>()
  for (const stay of stays) {
    const list = byCountry.get(stay.country)
    if (list) list.push(stay)
    else byCountry.set(stay.country, [stay])
  }

  const countries: CountryDays[] = []
  const allCities = new Set<string>()
  let currentCountry: string | null = null
  let currentStreakDays = 0
  let bestRolling: TravelDaysSummary['maxDaysInRolling180'] = null

  for (const [country, countryStays] of byCountry) {
    const pastStays = countryStays.filter((s) => !s.planned)
    const futureStays = countryStays.filter((s) => s.planned)

    const pastRanges = mergeRanges(
      pastStays.map((s) => ({ start: s.start, end: Math.min(s.end, todayIndex) })),
    )

    const totalDays = countDays(pastRanges, -Infinity, todayIndex)
    const totalNights = Math.max(0, totalDays - pastRanges.length)
    const longestStayDays = pastRanges.reduce((max, r) => Math.max(max, r.end - r.start + 1), 0)
    const isCurrent = pastRanges.some((r) => r.start <= todayIndex && todayIndex <= r.end)

    if (isCurrent) {
      const block = pastRanges.find((r) => r.start <= todayIndex && todayIndex <= r.end)!
      const streak = todayIndex - block.start + 1
      // With overlapping data more than one country can look "current"; the longest
      // running block is the most plausible answer.
      if (streak > currentStreakDays) {
        currentStreakDays = streak
        currentCountry = country
      }
    }

    const cityMap = new Map<string, { days: number; visits: number }>()
    for (const stay of pastStays) {
      if (!stay.city) continue
      allCities.add(`${country}:${stay.city}`)
      const end = Math.min(stay.end, todayIndex)
      if (end < stay.start) continue
      const entry = cityMap.get(stay.city) ?? { days: 0, visits: 0 }
      entry.days += end - stay.start + 1
      entry.visits += 1
      cityMap.set(stay.city, entry)
    }

    const rolling = maxDaysInRollingWindow(pastRanges, ROLLING_WINDOW_DAYS)
    if (rolling && (!bestRolling || rolling.days > bestRolling.days)) {
      bestRolling = {
        country,
        days: rolling.days,
        windowStart: fromDayIndex(rolling.windowStart),
        windowEnd: fromDayIndex(rolling.windowEnd),
      }
    }

    const futureRanges = mergeRanges(futureStays.map((s) => ({ start: s.start, end: s.end })))
    const nextArrivalIndex = futureRanges.length > 0 ? futureRanges[0].start : null

    countries.push({
      country,
      totalDays,
      totalNights,
      daysThisYear: countDays(pastRanges, yearStart, todayIndex),
      daysLast12Months: countDays(pastRanges, rolling12Start, todayIndex),
      longestStayDays,
      visits: pastRanges.length,
      firstVisit: pastRanges.length > 0 ? fromDayIndex(pastRanges[0].start) : null,
      lastVisit: pastRanges.length > 0 ? fromDayIndex(pastRanges[pastRanges.length - 1].end) : null,
      isCurrent,
      plannedDays: futureRanges.reduce((sum, r) => sum + (r.end - r.start + 1), 0),
      nextArrival: nextArrivalIndex !== null ? fromDayIndex(nextArrivalIndex) : null,
      cities: [...cityMap.entries()]
        .map(([city, v]) => ({ city, days: v.days, visits: v.visits }))
        .sort((a, b) => b.days - a.days),
      share: 0,
    })
  }

  const totalTrackedDays = countries.reduce((sum, c) => sum + c.totalDays, 0)
  for (const c of countries) {
    c.share = totalTrackedDays > 0 ? c.totalDays / totalTrackedDays : 0
  }

  countries.sort((a, b) => b.totalDays - a.totalDays || a.country.localeCompare(b.country))

  return {
    countries,
    years: computeYearRows(byCountry, todayIndex),
    totalTrackedDays,
    countriesVisited: countries.filter((c) => c.totalDays > 0).length,
    citiesVisited: allCities.size,
    currentCountry,
    currentStreakDays,
    maxDaysInRolling180: bestRolling,
    overlappingTripIds: detectOverlaps(stays),
    firstTrackedDay: stays.length > 0 ? fromDayIndex(stays[0].start) : null,
  }
}

function computeYearRows(byCountry: Map<string, NormalizedStay[]>, todayIndex: number): YearRow[] {
  const years = new Map<number, Record<string, number>>()

  for (const [country, countryStays] of byCountry) {
    const ranges = mergeRanges(
      countryStays
        .filter((s) => !s.planned)
        .map((s) => ({ start: s.start, end: Math.min(s.end, todayIndex) })),
    )

    for (const range of ranges) {
      // A stay can straddle New Year, so split it at year boundaries instead of
      // attributing the whole block to the arrival year.
      let cursor = range.start
      while (cursor <= range.end) {
        const year = yearOfDayIndex(cursor)
        const yearEnd = toDayIndex(new Date(Date.UTC(year, 11, 31)))
        const segmentEnd = Math.min(range.end, yearEnd)
        const days = segmentEnd - cursor + 1

        const row = years.get(year) ?? {}
        row[country] = (row[country] ?? 0) + days
        years.set(year, row)

        cursor = segmentEnd + 1
      }
    }
  }

  return [...years.entries()]
    .map(([year, byCountryDays]) => ({
      year,
      byCountry: byCountryDays,
      total: Object.values(byCountryDays).reduce((a, b) => a + b, 0),
    }))
    .sort((a, b) => b.year - a.year)
}
