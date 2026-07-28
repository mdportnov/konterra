import { describe, expect, it } from 'vitest'
import { computeOverlaps, contactPlace, haversineKm, SAME_CITY_RADIUS_KM } from '@/lib/travel/overlaps'
import type { Contact, ContactLocationHistoryEntry, Trip } from '@/lib/db/schema'

const NOW = new Date('2026-07-28T12:00:00Z')

interface TripSpec {
  id?: string
  arrivalDate: string
  departureDate?: string
  country: string
  city?: string
  lat?: number
  lng?: number
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
    lat: spec.lat ?? null,
    lng: spec.lng ?? null,
    notes: null,
    createdAt: null,
    updatedAt: null,
  }
}

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
    isSelf: false, updatedAt: null,
    userId: 'u1',
    ...partial,
  } as Contact
}

interface HistorySpec {
  contactId: string
  observedAt: string
  city?: string
  country?: string
}

function historyEntry(partial: HistorySpec): ContactLocationHistoryEntry {
  return {
    id: `${partial.contactId}-${partial.observedAt}`,
    userId: 'u1',
    contactId: partial.contactId,
    city: partial.city ?? null,
    country: partial.country ?? null,
    lat: null,
    lng: null,
    source: 'manual',
    observedAt: new Date(partial.observedAt),
    createdAt: null,
  }
}

describe('haversineKm', () => {
  it('returns zero for the same point', () => {
    expect(haversineKm({ lat: 38.7, lng: -9.1 }, { lat: 38.7, lng: -9.1 })).toBe(0)
  })

  it('approximates a known distance', () => {
    // Lisbon to Porto is roughly 275 km.
    const km = haversineKm({ lat: 38.72, lng: -9.14 }, { lat: 41.15, lng: -8.61 })
    expect(km).toBeGreaterThan(250)
    expect(km).toBeLessThan(300)
  })
})

describe('contactPlace', () => {
  it('prefers a recently confirmed current location', () => {
    const place = contactPlace(
      contact({
        id: 'c1',
        name: 'Ana',
        country: 'Brazil',
        city: 'Rio',
        currentCountry: 'Portugal',
        currentCity: 'Lisbon',
        currentLocationUpdatedAt: new Date('2026-07-01T00:00:00Z'),
      }),
      120,
      NOW,
    )
    expect(place.country).toBe('Portugal')
    expect(place.isCurrent).toBe(true)
  })

  it('falls back to the home base when the current location is stale', () => {
    const place = contactPlace(
      contact({
        id: 'c1',
        name: 'Ana',
        country: 'Brazil',
        city: 'Rio',
        currentCountry: 'Portugal',
        currentLocationUpdatedAt: new Date('2024-01-01T00:00:00Z'),
      }),
      120,
      NOW,
    )
    expect(place.country).toBe('Brazil')
    expect(place.isCurrent).toBe(false)
  })

  it('falls back when there is no current location at all', () => {
    const place = contactPlace(contact({ id: 'c1', name: 'Ana', country: 'Brazil' }), 120, NOW)
    expect(place.country).toBe('Brazil')
    expect(place.isCurrent).toBe(false)
  })
})

describe('computeOverlaps', () => {
  const lisbonTrip = trip({
    id: 't1',
    arrivalDate: '2026-07-20',
    departureDate: '2026-08-05',
    country: 'Portugal',
    city: 'Lisbon',
    lat: 38.72,
    lng: -9.14,
  })

  it('finds contacts in the country of an ongoing trip', () => {
    const report = computeOverlaps({
      trips: [lisbonTrip],
      contacts: [contact({ id: 'c1', name: 'Ana', country: 'Portugal', city: 'Lisbon' })],
      now: NOW,
    })
    expect(report.currentPlace).toEqual({ country: 'Portugal', city: 'Lisbon' })
    expect(report.nearbyNow.map((m) => m.contactId)).toEqual(['c1'])
    expect(report.nearbyNow[0].precision).toBe('city')
  })

  it('ignores contacts in other countries', () => {
    const report = computeOverlaps({
      trips: [lisbonTrip],
      contacts: [contact({ id: 'c1', name: 'Ana', country: 'Spain', city: 'Madrid' })],
      now: NOW,
    })
    expect(report.nearbyNow).toEqual([])
    expect(report.totalReachable).toBe(0)
  })

  it('never matches the self contact', () => {
    const report = computeOverlaps({
      trips: [lisbonTrip],
      contacts: [contact({ id: 'me', name: 'Me', country: 'Portugal', city: 'Lisbon', isSelf: true })],
      now: NOW,
    })
    expect(report.nearbyNow).toEqual([])
  })

  it('classifies a nearby contact by proximity rather than city name', () => {
    const report = computeOverlaps({
      trips: [lisbonTrip],
      contacts: [
        contact({ id: 'c1', name: 'Bruno', country: 'Portugal', city: 'Cascais', lat: 38.7, lng: -9.42 }),
      ],
      now: NOW,
    })
    expect(report.nearbyNow[0].precision).toBe('proximity')
    expect(report.nearbyNow[0].distanceKm).toBeLessThan(SAME_CITY_RADIUS_KM)
  })

  it('ranks a same-city contact above a same-country one', () => {
    const report = computeOverlaps({
      trips: [lisbonTrip],
      contacts: [
        contact({ id: 'far', name: 'Far', country: 'Portugal', city: 'Faro', lat: 37.02, lng: -7.93 }),
        contact({ id: 'near', name: 'Near', country: 'Portugal', city: 'Lisbon' }),
      ],
      now: NOW,
    })
    expect(report.nearbyNow[0].contactId).toBe('near')
  })

  it('ranks a confirmed current location above a home-base guess at equal precision', () => {
    const report = computeOverlaps({
      trips: [lisbonTrip],
      contacts: [
        contact({ id: 'home', name: 'Home', country: 'Portugal', city: 'Lisbon' }),
        contact({
          id: 'confirmed',
          name: 'Confirmed',
          country: 'Germany',
          currentCountry: 'Portugal',
          currentCity: 'Lisbon',
          currentLocationUpdatedAt: new Date('2026-07-25T00:00:00Z'),
        }),
      ],
      now: NOW,
    })
    expect(report.nearbyNow[0].contactId).toBe('confirmed')
  })

  it('includes future trips inside the horizon and reports days until', () => {
    const report = computeOverlaps({
      trips: [trip({ id: 't2', arrivalDate: '2026-08-27', departureDate: '2026-09-05', country: 'Japan', city: 'Tokyo' })],
      contacts: [contact({ id: 'c1', name: 'Kei', country: 'Japan', city: 'Tokyo' })],
      now: NOW,
    })
    expect(report.upcoming).toHaveLength(1)
    expect(report.upcoming[0].daysUntil).toBe(30)
    expect(report.upcoming[0].planned).toBe(true)
    expect(report.totalReachable).toBe(1)
  })

  it('excludes trips beyond the horizon', () => {
    const report = computeOverlaps({
      trips: [trip({ arrivalDate: '2028-01-01', departureDate: '2028-01-10', country: 'Japan' })],
      contacts: [contact({ id: 'c1', name: 'Kei', country: 'Japan' })],
      now: NOW,
      horizonDays: 365,
    })
    expect(report.upcoming).toEqual([])
  })

  it('excludes past trips', () => {
    const report = computeOverlaps({
      trips: [trip({ arrivalDate: '2026-01-01', departureDate: '2026-01-10', country: 'Japan' })],
      contacts: [contact({ id: 'c1', name: 'Kei', country: 'Japan' })],
      now: NOW,
    })
    expect(report.upcoming).toEqual([])
  })

  it('counts each reachable contact once across several trips', () => {
    const report = computeOverlaps({
      trips: [
        trip({ id: 'a', arrivalDate: '2026-08-01', departureDate: '2026-08-10', country: 'Japan', city: 'Tokyo' }),
        trip({ id: 'b', arrivalDate: '2026-09-01', departureDate: '2026-09-10', country: 'Japan', city: 'Tokyo' }),
      ],
      contacts: [contact({ id: 'c1', name: 'Kei', country: 'Japan', city: 'Tokyo' })],
      now: NOW,
    })
    expect(report.upcoming).toHaveLength(2)
    expect(report.totalReachable).toBe(1)
  })

  it('finds a past crossing and marks it missed when no interaction was logged', () => {
    const report = computeOverlaps({
      trips: [trip({ id: 't', arrivalDate: '2026-03-01', departureDate: '2026-03-20', country: 'Colombia', city: 'Medellin' })],
      contacts: [contact({ id: 'c1', name: 'Sofia' })],
      locationHistory: [
        historyEntry({ contactId: 'c1', observedAt: '2026-02-01', country: 'Colombia', city: 'Medellin' }),
        historyEntry({ contactId: 'c1', observedAt: '2026-04-01', country: 'Mexico', city: 'CDMX' }),
      ],
      now: NOW,
    })
    expect(report.pastCrossings).toHaveLength(1)
    expect(report.pastCrossings[0].days).toBe(20)
    expect(report.pastCrossings[0].missed).toBe(true)
  })

  it('does not mark a crossing missed when an interaction falls inside it', () => {
    const report = computeOverlaps({
      trips: [trip({ id: 't', arrivalDate: '2026-03-01', departureDate: '2026-03-20', country: 'Colombia' })],
      contacts: [contact({ id: 'c1', name: 'Sofia' })],
      locationHistory: [historyEntry({ contactId: 'c1', observedAt: '2026-02-01', country: 'Colombia' })],
      interactionDatesByContact: new Map([['c1', [new Date('2026-03-10T00:00:00Z')]]]),
      now: NOW,
    })
    expect(report.pastCrossings[0].missed).toBe(false)
  })

  it('returns nothing when there is no history to cross-reference', () => {
    const report = computeOverlaps({
      trips: [trip({ arrivalDate: '2026-03-01', departureDate: '2026-03-20', country: 'Colombia' })],
      contacts: [contact({ id: 'c1', name: 'Sofia' })],
      now: NOW,
    })
    expect(report.pastCrossings).toEqual([])
  })

  it('handles an empty dataset', () => {
    const report = computeOverlaps({ trips: [], contacts: [], now: NOW })
    expect(report).toEqual({
      nearbyNow: [],
      currentPlace: null,
      upcoming: [],
      pastCrossings: [],
      totalReachable: 0,
    })
  })
})
