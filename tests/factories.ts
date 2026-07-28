import type { Contact, ContactConnection, Interaction, Favor } from '@/lib/db/schema'

/** Shared fixtures so a schema change breaks one file instead of every test. */

export function makeContact(partial: Partial<Contact> & { id: string; name: string }): Contact {
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

export function makeConnection(
  partial: Partial<ContactConnection> & { id: string; sourceContactId: string; targetContactId: string },
): ContactConnection {
  return {
    userId: 'u1',
    connectionType: 'knows',
    strength: 3,
    bidirectional: true,
    notes: null,
    createdAt: null,
    updatedAt: null,
    ...partial,
  } as ContactConnection
}

export function makeInteraction(
  partial: Partial<Interaction> & { id: string; contactId: string; date: Date },
): Interaction {
  return {
    type: 'meeting',
    location: null,
    notes: null,
    createdAt: null,
    updatedAt: null,
    ...partial,
  } as Interaction
}

export function makeFavor(partial: Partial<Favor> & { id: string; contactId: string }): Favor {
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

export function daysAgo(days: number, from = new Date()): Date {
  return new Date(from.getTime() - days * 86_400_000)
}
