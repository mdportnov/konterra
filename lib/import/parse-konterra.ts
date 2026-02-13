import type { KonterraExport, KonterraContactRef } from '@/lib/export/types'
import type { ParsedContact } from './types'

function contactRefToParsed(c: KonterraContactRef): ParsedContact {
  return {
    _konterraRef: c._ref,
    name: c.name,
    email: c.email ?? undefined,
    phone: c.phone ?? undefined,
    company: c.company ?? undefined,
    role: c.role ?? undefined,
    city: c.city ?? undefined,
    country: c.country ?? undefined,
    address: c.address ?? undefined,
    birthday: c.birthday ?? undefined,
    website: c.website ?? undefined,
    notes: c.notes ?? undefined,
    tags: c.tags ?? undefined,
    timezone: c.timezone ?? undefined,
    gender: c.gender ?? undefined,
    telegram: c.telegram ?? undefined,
    linkedin: c.linkedin ?? undefined,
    twitter: c.twitter ?? undefined,
    instagram: c.instagram ?? undefined,
    github: c.github ?? undefined,
    photo: c.photo ?? undefined,
    lat: c.lat ?? undefined,
    lng: c.lng ?? undefined,
    meta: c.meta ?? undefined,
    secondaryLocations: c.secondaryLocations ?? undefined,
    rating: c.rating ?? undefined,
    relationshipType: c.relationshipType ?? undefined,
    metAt: c.metAt ?? undefined,
    metDate: c.metDate ?? undefined,
    lastContactedAt: c.lastContactedAt ?? undefined,
    nextFollowUp: c.nextFollowUp ?? undefined,
    communicationStyle: c.communicationStyle ?? undefined,
    preferredChannel: c.preferredChannel ?? undefined,
    responseSpeed: c.responseSpeed ?? undefined,
    language: c.language ?? undefined,
    personalInterests: c.personalInterests ?? undefined,
    professionalGoals: c.professionalGoals ?? undefined,
    painPoints: c.painPoints ?? undefined,
    influenceLevel: c.influenceLevel ?? undefined,
    networkReach: c.networkReach ?? undefined,
    trustLevel: c.trustLevel ?? undefined,
    loyaltyIndicator: c.loyaltyIndicator ?? undefined,
    financialCapacity: c.financialCapacity ?? undefined,
    motivations: c.motivations ?? undefined,
    isSelf: c.isSelf ?? undefined,
  }
}

export interface KonterraParseResult {
  contacts: ParsedContact[]
  fullExport: KonterraExport
}

export function parseKonterraJSON(jsonText: string): KonterraParseResult {
  let data: unknown
  try {
    data = JSON.parse(jsonText)
  } catch {
    throw new Error('Invalid JSON file')
  }

  if (!data || typeof data !== 'object') {
    throw new Error('Invalid Konterra export: not an object')
  }

  const obj = data as Record<string, unknown>

  if (obj.version !== 1) {
    throw new Error('Unsupported Konterra export version')
  }

  if (!Array.isArray(obj.contacts)) {
    throw new Error('Invalid Konterra export: missing contacts array')
  }

  const fullExport = obj as unknown as KonterraExport

  const contacts = fullExport.contacts
    .filter((c) => !c.isSelf)
    .map(contactRefToParsed)

  return { contacts, fullExport }
}
