import { describe, expect, it } from 'vitest'
import {
  countriesCovered,
  citiesCovered,
  networkHealthScore,
  overdueFollowUps,
  ratingDistribution,
  relationshipBreakdown,
  staleContacts,
  topCountries,
  totalContacts,
} from '@/lib/metrics'
import { daysAgo, makeContact } from './factories'

describe('countriesCovered / citiesCovered', () => {
  it('counts distinct values and ignores blanks', () => {
    const contacts = [
      makeContact({ id: '1', name: 'A', country: 'Spain', city: 'Madrid' }),
      makeContact({ id: '2', name: 'B', country: 'Spain', city: 'Madrid' }),
      makeContact({ id: '3', name: 'C', country: 'Japan', city: 'Tokyo' }),
      makeContact({ id: '4', name: 'D' }),
    ]
    expect(countriesCovered(contacts)).toBe(2)
    expect(citiesCovered(contacts)).toBe(2)
    expect(totalContacts(contacts)).toBe(4)
  })

  it('returns zero for an empty list', () => {
    expect(countriesCovered([])).toBe(0)
    expect(citiesCovered([])).toBe(0)
  })
})

describe('topCountries', () => {
  it('ranks by count and respects the limit', () => {
    const contacts = [
      makeContact({ id: '1', name: 'A', country: 'Spain' }),
      makeContact({ id: '2', name: 'B', country: 'Spain' }),
      makeContact({ id: '3', name: 'C', country: 'Japan' }),
      makeContact({ id: '4', name: 'D', country: 'Peru' }),
    ]
    expect(topCountries(contacts, 2)).toEqual([
      { country: 'Spain', count: 2 },
      expect.objectContaining({ count: 1 }),
    ])
  })

  it('returns nothing when no contact has a country', () => {
    expect(topCountries([makeContact({ id: '1', name: 'A' })])).toEqual([])
  })
})

describe('staleContacts', () => {
  it('includes contacts never contacted and sorts oldest first', () => {
    const contacts = [
      makeContact({ id: 'recent', name: 'Recent', lastContactedAt: daysAgo(5) }),
      makeContact({ id: 'old', name: 'Old', lastContactedAt: daysAgo(200) }),
      makeContact({ id: 'never', name: 'Never' }),
    ]
    const stale = staleContacts(contacts, 90)
    expect(stale.map((c) => c.id)).toEqual(['never', 'old'])
  })

  it('returns nobody when everyone is fresh', () => {
    expect(staleContacts([makeContact({ id: '1', name: 'A', lastContactedAt: daysAgo(1) })], 90)).toEqual([])
  })
})

describe('overdueFollowUps', () => {
  it('returns only past-due follow-ups, soonest first', () => {
    const contacts = [
      makeContact({ id: 'future', name: 'Future', nextFollowUp: daysAgo(-10) }),
      makeContact({ id: 'late', name: 'Late', nextFollowUp: daysAgo(30) }),
      makeContact({ id: 'later', name: 'Later', nextFollowUp: daysAgo(5) }),
      makeContact({ id: 'none', name: 'None' }),
    ]
    expect(overdueFollowUps(contacts).map((c) => c.id)).toEqual(['late', 'later'])
  })
})

describe('ratingDistribution', () => {
  it('buckets valid ratings and ignores out-of-range values', () => {
    const contacts = [
      makeContact({ id: '1', name: 'A', rating: 5 }),
      makeContact({ id: '2', name: 'B', rating: 5 }),
      makeContact({ id: '3', name: 'C', rating: 3 }),
      makeContact({ id: '4', name: 'D', rating: 0 }),
      makeContact({ id: '5', name: 'E' }),
    ]
    expect(ratingDistribution(contacts)).toEqual({ 1: 0, 2: 0, 3: 1, 4: 0, 5: 2 })
  })
})

describe('relationshipBreakdown', () => {
  it('counts each type and sorts by frequency', () => {
    const contacts = [
      makeContact({ id: '1', name: 'A', relationshipType: 'friend' }),
      makeContact({ id: '2', name: 'B', relationshipType: 'friend' }),
      makeContact({ id: '3', name: 'C', relationshipType: 'investor' }),
      makeContact({ id: '4', name: 'D' }),
    ]
    expect(relationshipBreakdown(contacts)).toEqual([
      { type: 'friend', count: 2 },
      { type: 'investor', count: 1 },
    ])
  })
})

describe('networkHealthScore', () => {
  it('is zero for an empty network', () => {
    expect(networkHealthScore([], [])).toBe(0)
  })

  it('stays within 0-100', () => {
    const contacts = Array.from({ length: 20 }, (_, i) =>
      makeContact({
        id: String(i),
        name: `P${i}`,
        rating: 5,
        country: `Country ${i}`,
        lastContactedAt: daysAgo(1),
      }),
    )
    const score = networkHealthScore(contacts, [])
    expect(score).toBeGreaterThan(0)
    expect(score).toBeLessThanOrEqual(100)
  })

  it('scores a neglected network below an active one', () => {
    const active = [makeContact({ id: '1', name: 'A', rating: 5, lastContactedAt: daysAgo(1) })]
    const neglected = [makeContact({ id: '1', name: 'A', rating: 1, lastContactedAt: daysAgo(400), nextFollowUp: daysAgo(100) })]
    expect(networkHealthScore(active, [])).toBeGreaterThan(networkHealthScore(neglected, []))
  })
})
