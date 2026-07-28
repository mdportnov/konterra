import { describe, expect, it } from 'vitest'
import { buildDigest } from '@/lib/digest/build'
import type { Contact, Favor, Trip } from '@/lib/db/schema'

const NOW = new Date('2026-07-28T12:00:00Z')

function contact(partial: Partial<Contact> & { id: string; name: string }): Contact {
  return {
    photo: null, company: null, role: null, city: null, country: null, address: null,
    lat: null, lng: null, currentCity: null, currentCountry: null, currentLat: null,
    currentLng: null, currentLocationUpdatedAt: null, email: null, phone: null,
    linkedin: null, twitter: null, telegram: null, instagram: null, github: null,
    website: null, tags: null, notes: null, meta: null, secondaryLocations: null,
    rating: null, gender: null, relationshipType: null, metAt: null, metDate: null,
    lastContactedAt: null, nextFollowUp: null, communicationStyle: null,
    preferredChannel: null, responseSpeed: null, timezone: null, language: null,
    birthday: null, personalInterests: null, professionalGoals: null, painPoints: null,
    influenceLevel: null, networkReach: null, trustLevel: null, loyaltyIndicator: null,
    financialCapacity: null, motivations: null, importSource: null, createdAt: null,
    isSelf: false, updatedAt: null, userId: 'u1',
    ...partial,
  } as Contact
}

function favor(partial: Partial<Favor> & { id: string; contactId: string }): Favor {
  return {
    userId: 'u1',
    direction: 'given',
    type: 'advice',
    description: null,
    value: 'medium',
    status: 'active',
    date: null,
    resolvedAt: null,
    createdAt: null,
    updatedAt: null,
    ...partial,
  } as Favor
}

function trip(partial: { id: string; arrivalDate: string; departureDate?: string; country: string; city?: string }): Trip {
  return {
    id: partial.id,
    userId: 'u1',
    arrivalDate: new Date(partial.arrivalDate),
    departureDate: partial.departureDate ? new Date(partial.departureDate) : null,
    durationDays: null,
    city: partial.city ?? 'Somewhere',
    country: partial.country,
    lat: null,
    lng: null,
    notes: null,
    createdAt: null,
    updatedAt: null,
  }
}

const empty = { contacts: [], favors: [], trips: [], now: NOW }

describe('buildDigest', () => {
  it('produces nothing for an empty account', () => {
    const digest = buildDigest(empty)
    expect(digest.hasContent).toBe(false)
    expect(digest.sections).toEqual([])
  })

  it('finds a birthday inside the horizon', () => {
    const digest = buildDigest({
      ...empty,
      contacts: [contact({ id: 'c1', name: 'Ana', birthday: new Date('1990-08-05') })],
    })
    expect(digest.counts.birthdays).toBe(1)
    expect(digest.sections[0].items[0]).toContain('in 8 days')
  })

  it('ignores a birthday beyond the horizon', () => {
    const digest = buildDigest({
      ...empty,
      contacts: [contact({ id: 'c1', name: 'Ana', birthday: new Date('1990-10-05') })],
    })
    expect(digest.counts.birthdays).toBe(0)
  })

  it('handles a birthday that has already passed this year by rolling to next year', () => {
    const digest = buildDigest({
      ...empty,
      contacts: [contact({ id: 'c1', name: 'Ana', birthday: new Date('1990-01-05') })],
    })
    expect(digest.counts.birthdays).toBe(0)
  })

  it('reports a birthday today', () => {
    const digest = buildDigest({
      ...empty,
      contacts: [contact({ id: 'c1', name: 'Ana', birthday: new Date('1990-07-28') })],
    })
    expect(digest.sections[0].items[0]).toContain('today')
  })

  it('reports overdue follow-ups with how late they are', () => {
    const digest = buildDigest({
      ...empty,
      contacts: [contact({ id: 'c1', name: 'Ben', nextFollowUp: new Date('2026-07-18T12:00:00Z') })],
    })
    expect(digest.counts.overdueFollowUps).toBe(1)
    expect(digest.sections[0].items[0]).toContain('10 days late')
  })

  it('ignores follow-ups still in the future', () => {
    const digest = buildDigest({
      ...empty,
      contacts: [contact({ id: 'c1', name: 'Ben', nextFollowUp: new Date('2026-08-18') })],
    })
    expect(digest.counts.overdueFollowUps).toBe(0)
  })

  it('only nags about rated contacts going cold', () => {
    const digest = buildDigest({
      ...empty,
      contacts: [
        contact({ id: 'rated', name: 'Rated', rating: 4, lastContactedAt: new Date('2026-01-01') }),
        contact({ id: 'unrated', name: 'Unrated', lastContactedAt: new Date('2026-01-01') }),
      ],
    })
    expect(digest.counts.goingCold).toBe(1)
    const section = digest.sections.find((s) => s.title === 'Going cold')
    expect(section?.items[0]).toContain('Rated')
  })

  it('does not report a recently contacted person as cold', () => {
    const digest = buildDigest({
      ...empty,
      contacts: [contact({ id: 'c1', name: 'Fresh', rating: 5, lastContactedAt: new Date('2026-07-20') })],
    })
    expect(digest.counts.goingCold).toBe(0)
  })

  it('treats a rated contact with no logged interaction as cold', () => {
    const digest = buildDigest({
      ...empty,
      contacts: [contact({ id: 'c1', name: 'Never', rating: 3 })],
    })
    expect(digest.counts.goingCold).toBe(1)
    expect(digest.sections[0].items[0]).toContain('never logged')
  })

  it('surfaces stale active favors and ignores resolved ones', () => {
    const digest = buildDigest({
      ...empty,
      contacts: [contact({ id: 'c1', name: 'Dana' })],
      favors: [
        favor({ id: 'f1', contactId: 'c1', date: new Date('2026-01-01'), description: 'intro to investor' }),
        favor({ id: 'f2', contactId: 'c1', date: new Date('2026-01-01'), status: 'resolved' }),
      ],
    })
    expect(digest.counts.openFavors).toBe(1)
    const section = digest.sections.find((s) => s.title === 'Unsettled favors')
    expect(section?.items[0]).toContain('intro to investor')
  })

  it('ignores a favor that is still recent', () => {
    const digest = buildDigest({
      ...empty,
      contacts: [contact({ id: 'c1', name: 'Dana' })],
      favors: [favor({ id: 'f1', contactId: 'c1', date: new Date('2026-07-20') })],
    })
    expect(digest.counts.openFavors).toBe(0)
  })

  it('lists people reachable on an upcoming trip', () => {
    const digest = buildDigest({
      ...empty,
      contacts: [contact({ id: 'c1', name: 'Kei', country: 'Japan', city: 'Tokyo' })],
      trips: [trip({ id: 't1', arrivalDate: '2026-08-10', departureDate: '2026-08-20', country: 'Japan', city: 'Tokyo' })],
    })
    expect(digest.counts.upcomingTripsWithPeople).toBe(1)
    const section = digest.sections.find((s) => s.title === 'People you can catch')
    expect(section?.items[0]).toContain('Kei')
    expect(section?.items[0]).toContain('in 13 days')
  })

  it('skips a trip where nobody is reachable', () => {
    const digest = buildDigest({
      ...empty,
      contacts: [contact({ id: 'c1', name: 'Kei', country: 'Brazil' })],
      trips: [trip({ id: 't1', arrivalDate: '2026-08-10', departureDate: '2026-08-20', country: 'Japan' })],
    })
    expect(digest.counts.upcomingTripsWithPeople).toBe(0)
    expect(digest.hasContent).toBe(false)
  })

  it('excludes the self contact from every section', () => {
    const digest = buildDigest({
      ...empty,
      contacts: [contact({ id: 'me', name: 'Me', isSelf: true, rating: 5, birthday: new Date('1990-07-30') })],
    })
    expect(digest.hasContent).toBe(false)
  })

  it('caps each section at five items', () => {
    const digest = buildDigest({
      ...empty,
      contacts: Array.from({ length: 9 }, (_, i) =>
        contact({ id: `c${i}`, name: `Person ${i}`, rating: 4, lastContactedAt: new Date('2026-01-01') }),
      ),
    })
    expect(digest.counts.goingCold).toBe(9)
    expect(digest.sections[0].items).toHaveLength(5)
  })

  it('escapes user-supplied text so a name cannot inject markup', () => {
    const digest = buildDigest({
      ...empty,
      contacts: [contact({ id: 'c1', name: '<img src=x onerror=alert(1)>', rating: 4 })],
    })
    expect(digest.sections[0].items[0]).not.toContain('<img')
    expect(digest.sections[0].items[0]).toContain('&lt;img')
  })
})
