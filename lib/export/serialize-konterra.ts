import type { Contact, ContactConnection, Interaction, Favor, Introduction, ContactCountryConnection, Tag } from '@/lib/db/schema'
import type { KonterraExport, KonterraContactRef } from './types'

function toISO(d: Date | string | null | undefined): string | null {
  if (!d) return null
  const date = d instanceof Date ? d : new Date(d)
  return isNaN(date.getTime()) ? null : date.toISOString()
}

export function serializeKonterra(
  allContacts: Contact[],
  connections: ContactConnection[],
  allInteractions: { id: string; contactId: string; type: string; date: Date; location: string | null; notes: string | null }[],
  allFavors: Favor[],
  allIntroductions: Introduction[],
  countryConnections: ContactCountryConnection[],
  userTags: Tag[],
  visitedCountries: string[],
): KonterraExport {
  const refMap = new Map<string, string>()
  allContacts.forEach((c, i) => refMap.set(c.id, `c${i}`))

  const contacts: KonterraContactRef[] = allContacts.map((c) => ({
    _ref: refMap.get(c.id)!,
    name: c.name,
    email: c.email,
    phone: c.phone,
    company: c.company,
    role: c.role,
    city: c.city,
    country: c.country,
    address: c.address,
    photo: c.photo,
    lat: c.lat,
    lng: c.lng,
    linkedin: c.linkedin,
    twitter: c.twitter,
    telegram: c.telegram,
    instagram: c.instagram,
    github: c.github,
    website: c.website,
    tags: c.tags,
    notes: c.notes,
    meta: c.meta,
    secondaryLocations: c.secondaryLocations,
    rating: c.rating,
    gender: c.gender,
    relationshipType: c.relationshipType,
    metAt: c.metAt,
    metDate: toISO(c.metDate),
    lastContactedAt: toISO(c.lastContactedAt),
    nextFollowUp: toISO(c.nextFollowUp),
    communicationStyle: c.communicationStyle,
    preferredChannel: c.preferredChannel,
    responseSpeed: c.responseSpeed,
    timezone: c.timezone,
    language: c.language,
    birthday: c.birthday ? toISO(c.birthday) : null,
    personalInterests: c.personalInterests,
    professionalGoals: c.professionalGoals,
    painPoints: c.painPoints,
    influenceLevel: c.influenceLevel,
    networkReach: c.networkReach,
    trustLevel: c.trustLevel,
    loyaltyIndicator: c.loyaltyIndicator,
    financialCapacity: c.financialCapacity,
    motivations: c.motivations,
    isSelf: c.isSelf ?? undefined,
  }))

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    contacts,
    connections: connections
      .filter((c) => refMap.has(c.sourceContactId) && refMap.has(c.targetContactId))
      .map((c) => ({
        source: refMap.get(c.sourceContactId)!,
        target: refMap.get(c.targetContactId)!,
        connectionType: c.connectionType,
        strength: c.strength,
        bidirectional: c.bidirectional,
        notes: c.notes,
      })),
    interactions: allInteractions
      .filter((i) => refMap.has(i.contactId))
      .map((i) => ({
        contact: refMap.get(i.contactId)!,
        type: i.type,
        date: i.date.toISOString(),
        location: i.location,
        notes: i.notes,
      })),
    favors: allFavors
      .filter((f) => refMap.has(f.contactId))
      .map((f) => ({
        contact: refMap.get(f.contactId)!,
        direction: f.direction,
        type: f.type,
        description: f.description,
        value: f.value,
        status: f.status,
        date: toISO(f.date),
        resolvedAt: toISO(f.resolvedAt),
      })),
    introductions: allIntroductions
      .filter((i) => refMap.has(i.contactAId) && refMap.has(i.contactBId))
      .map((i) => ({
        contactA: refMap.get(i.contactAId)!,
        contactB: refMap.get(i.contactBId)!,
        initiatedBy: i.initiatedBy,
        status: i.status,
        date: toISO(i.date),
        outcome: i.outcome,
        notes: i.notes,
      })),
    countryConnections: countryConnections
      .filter((cc) => refMap.has(cc.contactId))
      .map((cc) => ({
        contact: refMap.get(cc.contactId)!,
        country: cc.country,
        notes: cc.notes,
        tags: cc.tags,
      })),
    tags: userTags.map((t) => ({ name: t.name, color: t.color })),
    visitedCountries,
  }
}
