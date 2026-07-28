import { describe, expect, it } from 'vitest'
import {
  computeTravelDays,
  mergeRanges,
  normalizeStays,
  toDayIndex,
} from '@/lib/travel/days'
import type { Trip } from '@/lib/db/schema'

const TODAY = new Date('2026-07-28T12:00:00Z')

interface TripSpec {
  id?: string
  arrivalDate: string
  departureDate?: string
  country: string
  city?: string
}

function trip(spec: TripSpec): Trip {
  return {
    id: spec.id ?? `${spec.country}-${spec.arrivalDate}`,
    userId: 'u1',
    arrivalDate: new Date(spec.arrivalDate),
    departureDate: spec.departureDate ? new Date(spec.departureDate) : null,
    durationDays: null,
    city: spec.city ?? 'Somewhere',
    country: spec.country,
    lat: null,
    lng: null,
    notes: null,
    createdAt: null,
    updatedAt: null,
  }
}

describe('toDayIndex', () => {
  it('is stable across times of day', () => {
    expect(toDayIndex(new Date('2026-03-29T00:00:00Z'))).toBe(toDayIndex(new Date('2026-03-29T23:59:59Z')))
  })

  it('advances by exactly one per calendar day across a DST boundary', () => {
    const before = toDayIndex(new Date('2026-03-29T00:00:00Z'))
    const after = toDayIndex(new Date('2026-03-30T00:00:00Z'))
    expect(after - before).toBe(1)
  })
})

describe('mergeRanges', () => {
  it('merges overlapping ranges', () => {
    expect(mergeRanges([{ start: 1, end: 5 }, { start: 3, end: 8 }])).toEqual([{ start: 1, end: 8 }])
  })

  it('joins back-to-back ranges into one continuous presence', () => {
    expect(mergeRanges([{ start: 1, end: 5 }, { start: 6, end: 9 }])).toEqual([{ start: 1, end: 9 }])
  })

  it('keeps a real gap separate', () => {
    expect(mergeRanges([{ start: 1, end: 5 }, { start: 8, end: 9 }])).toEqual([
      { start: 1, end: 5 },
      { start: 8, end: 9 },
    ])
  })

  it('returns an empty list for no input', () => {
    expect(mergeRanges([])).toEqual([])
  })
})

describe('normalizeStays', () => {
  it('clips an open-ended trip to today and marks it ongoing', () => {
    const [stay] = normalizeStays([trip({ arrivalDate: '2026-07-01', country: 'Portugal' })], TODAY)
    expect(stay.ongoing).toBe(true)
    expect(stay.end).toBe(toDayIndex(TODAY))
  })

  it('marks a future trip as planned, not ongoing', () => {
    const [stay] = normalizeStays(
      [trip({ arrivalDate: '2026-09-01', departureDate: '2026-09-10', country: 'Japan' })],
      TODAY,
    )
    expect(stay.planned).toBe(true)
    expect(stay.ongoing).toBe(false)
  })

  it('clamps reversed dates instead of producing a negative span', () => {
    const [stay] = normalizeStays(
      [trip({ arrivalDate: '2026-05-10', departureDate: '2026-05-01', country: 'Chile' })],
      TODAY,
    )
    expect(stay.end).toBe(stay.start)
  })

  it('skips trips with no country', () => {
    expect(normalizeStays([trip({ arrivalDate: '2026-01-01', country: '' })], TODAY)).toHaveLength(0)
  })
})

describe('computeTravelDays', () => {
  it('counts arrival and departure day inclusively', () => {
    const summary = computeTravelDays(
      [trip({ arrivalDate: '2026-01-01', departureDate: '2026-01-10', country: 'Spain' })],
      TODAY,
    )
    expect(summary.countries[0].totalDays).toBe(10)
    expect(summary.countries[0].totalNights).toBe(9)
  })

  it('counts a same-day trip as one day and zero nights', () => {
    const summary = computeTravelDays(
      [trip({ arrivalDate: '2026-02-05', departureDate: '2026-02-05', country: 'Andorra' })],
      TODAY,
    )
    expect(summary.countries[0].totalDays).toBe(1)
    expect(summary.countries[0].totalNights).toBe(0)
  })

  it('never double counts a day covered by two overlapping trips in the same country', () => {
    const summary = computeTravelDays(
      [
        trip({ id: 'a', arrivalDate: '2026-03-01', departureDate: '2026-03-10', country: 'Italy', city: 'Rome' }),
        trip({ id: 'b', arrivalDate: '2026-03-05', departureDate: '2026-03-15', country: 'Italy', city: 'Milan' }),
      ],
      TODAY,
    )
    expect(summary.countries[0].totalDays).toBe(15)
    expect(summary.countries[0].visits).toBe(1)
  })

  it('flags contradictory overlaps across different countries', () => {
    const summary = computeTravelDays(
      [
        trip({ id: 'a', arrivalDate: '2026-03-01', departureDate: '2026-03-10', country: 'Italy' }),
        trip({ id: 'b', arrivalDate: '2026-03-05', departureDate: '2026-03-15', country: 'France' }),
      ],
      TODAY,
    )
    expect(summary.overlappingTripIds.sort()).toEqual(['a', 'b'])
  })

  it('does not flag consecutive trips in different countries', () => {
    const summary = computeTravelDays(
      [
        trip({ id: 'a', arrivalDate: '2026-03-01', departureDate: '2026-03-10', country: 'Italy' }),
        trip({ id: 'b', arrivalDate: '2026-03-11', departureDate: '2026-03-15', country: 'France' }),
      ],
      TODAY,
    )
    expect(summary.overlappingTripIds).toEqual([])
  })

  it('splits a new-year-straddling stay across both years', () => {
    const summary = computeTravelDays(
      [trip({ arrivalDate: '2025-12-28', departureDate: '2026-01-04', country: 'Thailand' })],
      TODAY,
    )
    const y2025 = summary.years.find((y) => y.year === 2025)
    const y2026 = summary.years.find((y) => y.year === 2026)
    expect(y2025?.byCountry.Thailand).toBe(4)
    expect(y2026?.byCountry.Thailand).toBe(4)
    expect(summary.countries[0].totalDays).toBe(8)
  })

  it('excludes planned future days from totals but reports them separately', () => {
    const summary = computeTravelDays(
      [
        trip({ arrivalDate: '2026-01-01', departureDate: '2026-01-10', country: 'Spain' }),
        trip({ arrivalDate: '2026-09-01', departureDate: '2026-09-10', country: 'Spain' }),
      ],
      TODAY,
    )
    expect(summary.countries[0].totalDays).toBe(10)
    expect(summary.countries[0].plannedDays).toBe(10)
    expect(summary.countries[0].nextArrival?.toISOString().slice(0, 10)).toBe('2026-09-01')
  })

  it('reports the current country and streak for an open trip', () => {
    const summary = computeTravelDays(
      [trip({ arrivalDate: '2026-07-20', country: 'Georgia' })],
      TODAY,
    )
    expect(summary.currentCountry).toBe('Georgia')
    expect(summary.currentStreakDays).toBe(9)
    expect(summary.countries[0].isCurrent).toBe(true)
  })

  it('computes days this year and rolling 12 months independently', () => {
    const summary = computeTravelDays(
      [
        trip({ arrivalDate: '2025-10-01', departureDate: '2025-10-10', country: 'Peru' }),
        trip({ arrivalDate: '2026-02-01', departureDate: '2026-02-10', country: 'Peru' }),
      ],
      TODAY,
    )
    const peru = summary.countries[0]
    expect(peru.totalDays).toBe(20)
    expect(peru.daysThisYear).toBe(10)
    expect(peru.daysLast12Months).toBe(20)
  })

  it('drops out of the rolling window once a stay ages past 365 days', () => {
    const summary = computeTravelDays(
      [trip({ arrivalDate: '2025-01-01', departureDate: '2025-01-10', country: 'Kenya' })],
      TODAY,
    )
    expect(summary.countries[0].totalDays).toBe(10)
    expect(summary.countries[0].daysLast12Months).toBe(0)
  })

  it('finds the densest 180-day window', () => {
    const summary = computeTravelDays(
      [
        trip({ arrivalDate: '2026-01-01', departureDate: '2026-03-31', country: 'Mexico' }),
        trip({ arrivalDate: '2026-05-01', departureDate: '2026-05-31', country: 'Mexico' }),
      ],
      TODAY,
    )
    expect(summary.maxDaysInRolling180?.country).toBe('Mexico')
    expect(summary.maxDaysInRolling180?.days).toBe(121)
  })

  it('breaks cities down within a country', () => {
    const summary = computeTravelDays(
      [
        trip({ arrivalDate: '2026-04-01', departureDate: '2026-04-10', country: 'Vietnam', city: 'Hanoi' }),
        trip({ arrivalDate: '2026-04-11', departureDate: '2026-04-15', country: 'Vietnam', city: 'Da Nang' }),
      ],
      TODAY,
    )
    const vietnam = summary.countries[0]
    expect(vietnam.cities).toEqual([
      { city: 'Hanoi', days: 10, visits: 1 },
      { city: 'Da Nang', days: 5, visits: 1 },
    ])
    expect(vietnam.visits).toBe(1)
  })

  it('counts separate visits when there is a real gap', () => {
    const summary = computeTravelDays(
      [
        trip({ arrivalDate: '2026-01-01', departureDate: '2026-01-05', country: 'Serbia' }),
        trip({ arrivalDate: '2026-03-01', departureDate: '2026-03-05', country: 'Serbia' }),
      ],
      TODAY,
    )
    expect(summary.countries[0].visits).toBe(2)
    expect(summary.countries[0].longestStayDays).toBe(5)
  })

  it('returns an empty summary for no trips', () => {
    const summary = computeTravelDays([], TODAY)
    expect(summary.countries).toEqual([])
    expect(summary.totalTrackedDays).toBe(0)
    expect(summary.currentCountry).toBeNull()
  })

  it('shares sum to one across countries', () => {
    const summary = computeTravelDays(
      [
        trip({ arrivalDate: '2026-01-01', departureDate: '2026-01-10', country: 'Spain' }),
        trip({ arrivalDate: '2026-02-01', departureDate: '2026-02-10', country: 'Japan' }),
      ],
      TODAY,
    )
    const total = summary.countries.reduce((sum, c) => sum + c.share, 0)
    expect(total).toBeCloseTo(1, 10)
  })
})
