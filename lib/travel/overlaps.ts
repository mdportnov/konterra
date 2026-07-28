import type { Contact, ContactLocationHistoryEntry, Trip } from '@/lib/db/schema'
import { normalizeStays, toDayIndex, fromDayIndex, type NormalizedStay } from './days'

/**
 * Crossing paths: where the user's trip log intersects with where their contacts are.
 *
 * The whole point of putting a CRM on a globe is answering "who will I actually see", so
 * this module turns two independent datasets — trips and contact locations — into that
 * answer.
 */

const EARTH_RADIUS_KM = 6371
/** Within this distance two places count as the same city for ranking purposes. */
export const SAME_CITY_RADIUS_KM = 60

export function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2)
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)))
}

function normalizeName(value: string | null | undefined): string {
  return (value ?? '').trim().toLowerCase()
}

export interface ContactPlace {
  country: string | null
  city: string | null
  lat: number | null
  lng: number | null
  /** True when this came from the "currently in" fields rather than the home base. */
  isCurrent: boolean
  /** When the current location was last confirmed, if known. */
  updatedAt: Date | null
}

/**
 * A contact's best-known whereabouts. A recently updated "current location" beats the
 * home base; a stale one is ignored because an unconfirmed year-old check-in is worse
 * than no answer.
 */
export function contactPlace(contact: Contact, maxCurrentAgeDays = 120, now = new Date()): ContactPlace {
  const updatedAt = contact.currentLocationUpdatedAt ? new Date(contact.currentLocationUpdatedAt) : null
  const ageDays = updatedAt ? (now.getTime() - updatedAt.getTime()) / 86_400_000 : Infinity

  if (contact.currentCountry && ageDays <= maxCurrentAgeDays) {
    return {
      country: contact.currentCountry,
      city: contact.currentCity,
      lat: contact.currentLat,
      lng: contact.currentLng,
      isCurrent: true,
      updatedAt,
    }
  }

  return {
    country: contact.country,
    city: contact.city,
    lat: contact.lat,
    lng: contact.lng,
    isCurrent: false,
    updatedAt: null,
  }
}

export type MatchPrecision = 'city' | 'proximity' | 'country'

export interface ContactMatch {
  contactId: string
  contactName: string
  photo: string | null
  company: string | null
  role: string | null
  relationshipType: string | null
  rating: number | null
  lastContactedAt: Date | null
  place: ContactPlace
  precision: MatchPrecision
  distanceKm: number | null
  /** Higher is a better reason to reach out. */
  score: number
}

export interface TripOverlap {
  tripId: string
  city: string
  country: string
  arrivalDate: Date
  departureDate: Date | null
  ongoing: boolean
  planned: boolean
  daysUntil: number
  matches: ContactMatch[]
}

export interface PastCrossing {
  contactId: string
  contactName: string
  country: string
  city: string | null
  /** Inclusive day range where both were in the same place. */
  from: Date
  to: Date
  days: number
  /** True when no interaction was logged inside the window — a missed opportunity. */
  missed: boolean
}

export interface OverlapReport {
  /** Contacts in the same place as the user right now. */
  nearbyNow: ContactMatch[]
  currentPlace: { country: string; city: string } | null
  /** Upcoming and ongoing trips with the contacts reachable there. */
  upcoming: TripOverlap[]
  /** Historic same-place-same-time windows, most recent first. */
  pastCrossings: PastCrossing[]
  totalReachable: number
}

function matchPrecision(
  stayCity: string,
  stayCoords: { lat: number; lng: number } | null,
  place: ContactPlace,
): { precision: MatchPrecision; distanceKm: number | null } | null {
  if (!place.country) return null

  const cityMatches = normalizeName(place.city) !== '' && normalizeName(place.city) === normalizeName(stayCity)
  if (cityMatches) return { precision: 'city', distanceKm: 0 }

  if (stayCoords && place.lat != null && place.lng != null) {
    const distanceKm = haversineKm(stayCoords, { lat: place.lat, lng: place.lng })
    if (distanceKm <= SAME_CITY_RADIUS_KM) return { precision: 'proximity', distanceKm }
    return { precision: 'country', distanceKm }
  }

  return { precision: 'country', distanceKm: null }
}

function scoreMatch(contact: Contact, precision: MatchPrecision, place: ContactPlace, now: Date): number {
  let score = 0

  score += precision === 'city' ? 40 : precision === 'proximity' ? 30 : 10
  // A confirmed current location is far stronger evidence than a home-base guess.
  if (place.isCurrent) score += 20
  score += (contact.rating ?? 0) * 4

  const last = contact.lastContactedAt ? new Date(contact.lastContactedAt).getTime() : null
  if (last === null) {
    score += 12
  } else {
    const monthsSince = (now.getTime() - last) / (30 * 86_400_000)
    // Overdue contacts are the ones worth catching in person; very recent ones less so.
    score += Math.min(20, Math.max(0, monthsSince * 2))
  }

  return Math.round(score)
}

function toMatch(
  contact: Contact,
  place: ContactPlace,
  precision: MatchPrecision,
  distanceKm: number | null,
  now: Date,
): ContactMatch {
  return {
    contactId: contact.id,
    contactName: contact.name,
    photo: contact.photo,
    company: contact.company,
    role: contact.role,
    relationshipType: contact.relationshipType,
    rating: contact.rating,
    lastContactedAt: contact.lastContactedAt ? new Date(contact.lastContactedAt) : null,
    place,
    precision,
    distanceKm,
    score: scoreMatch(contact, precision, place, now),
  }
}

function matchesForStay(
  stay: NormalizedStay,
  stayCoords: { lat: number; lng: number } | null,
  candidates: { contact: Contact; place: ContactPlace }[],
  now: Date,
): ContactMatch[] {
  const stayCountry = normalizeName(stay.country)
  const matches: ContactMatch[] = []

  for (const { contact, place } of candidates) {
    if (normalizeName(place.country) !== stayCountry) continue
    const precision = matchPrecision(stay.city, stayCoords, place)
    if (!precision) continue
    matches.push(toMatch(contact, place, precision.precision, precision.distanceKm, now))
  }

  return matches.sort((a, b) => b.score - a.score)
}

export interface ComputeOverlapsInput {
  trips: Trip[]
  contacts: Contact[]
  /** Optional richer history; enables past crossings against where a contact used to be. */
  locationHistory?: ContactLocationHistoryEntry[]
  /** Interaction dates per contact, used to tell a missed crossing from a met one. */
  interactionDatesByContact?: Map<string, Date[]>
  now?: Date
  /** How far ahead to look for upcoming trips. */
  horizonDays?: number
}

export function computeOverlaps({
  trips,
  contacts,
  locationHistory = [],
  interactionDatesByContact,
  now = new Date(),
  horizonDays = 365,
}: ComputeOverlapsInput): OverlapReport {
  const todayIndex = toDayIndex(now)
  const horizonIndex = todayIndex + horizonDays

  const candidates = contacts
    .filter((c) => !c.isSelf)
    .map((contact) => ({ contact, place: contactPlace(contact, 120, now) }))
    .filter((c) => Boolean(c.place.country))

  const stays = normalizeStays(trips, now)
  const tripById = new Map(trips.map((t) => [t.id, t]))

  const upcoming: TripOverlap[] = []
  let nearbyNow: ContactMatch[] = []
  let currentPlace: OverlapReport['currentPlace'] = null

  for (const stay of stays) {
    const isOngoing = stay.start <= todayIndex && stay.end >= todayIndex
    const isFuture = stay.start > todayIndex && stay.start <= horizonIndex
    if (!isOngoing && !isFuture) continue

    const trip = tripById.get(stay.tripId)
    const stayCoords = trip && trip.lat != null && trip.lng != null ? { lat: trip.lat, lng: trip.lng } : null
    const matches = matchesForStay(stay, stayCoords, candidates, now)

    if (isOngoing && !currentPlace) {
      currentPlace = { country: stay.country, city: stay.city }
      nearbyNow = matches
    }

    upcoming.push({
      tripId: stay.tripId,
      city: stay.city,
      country: stay.country,
      arrivalDate: fromDayIndex(stay.start),
      departureDate: trip?.departureDate ? new Date(trip.departureDate) : null,
      ongoing: isOngoing,
      planned: stay.planned,
      daysUntil: Math.max(0, stay.start - todayIndex),
      matches,
    })
  }

  upcoming.sort((a, b) => a.daysUntil - b.daysUntil || a.arrivalDate.getTime() - b.arrivalDate.getTime())

  const reachable = new Set<string>()
  for (const t of upcoming) {
    for (const m of t.matches) reachable.add(m.contactId)
  }

  return {
    nearbyNow,
    currentPlace,
    upcoming,
    pastCrossings: computePastCrossings(stays, locationHistory, contacts, interactionDatesByContact, todayIndex),
    totalReachable: reachable.size,
  }
}

/**
 * Reconstructs where each contact was over time from the location history and intersects
 * it with the trip log. A history entry is treated as valid until the next entry for that
 * contact, which is the only assumption available without continuous tracking.
 */
function computePastCrossings(
  stays: NormalizedStay[],
  history: ContactLocationHistoryEntry[],
  contacts: Contact[],
  interactionDatesByContact: Map<string, Date[]> | undefined,
  todayIndex: number,
): PastCrossing[] {
  if (history.length === 0) return []

  const nameById = new Map(contacts.map((c) => [c.id, c.name]))
  const byContact = new Map<string, ContactLocationHistoryEntry[]>()
  for (const entry of history) {
    const list = byContact.get(entry.contactId)
    if (list) list.push(entry)
    else byContact.set(entry.contactId, [entry])
  }

  const pastStays = stays.filter((s) => !s.planned)
  const crossings: PastCrossing[] = []

  for (const [contactId, entries] of byContact) {
    const sorted = [...entries].sort(
      (a, b) => new Date(a.observedAt).getTime() - new Date(b.observedAt).getTime(),
    )

    for (let i = 0; i < sorted.length; i++) {
      const entry = sorted[i]
      if (!entry.country) continue
      const from = toDayIndex(new Date(entry.observedAt))
      const next = sorted[i + 1]
      const to = next ? toDayIndex(new Date(next.observedAt)) - 1 : todayIndex
      if (to < from) continue

      for (const stay of pastStays) {
        if (normalizeName(stay.country) !== normalizeName(entry.country)) continue
        const start = Math.max(from, stay.start)
        const end = Math.min(to, Math.min(stay.end, todayIndex))
        if (end < start) continue

        const fromDate = fromDayIndex(start)
        const toDate = fromDayIndex(end)
        const interactions = interactionDatesByContact?.get(contactId) ?? []
        const met = interactions.some((d) => {
          const idx = toDayIndex(new Date(d))
          return idx >= start && idx <= end
        })

        crossings.push({
          contactId,
          contactName: nameById.get(contactId) ?? 'Unknown',
          country: stay.country,
          city: entry.city,
          from: fromDate,
          to: toDate,
          days: end - start + 1,
          missed: !met,
        })
      }
    }
  }

  return crossings.sort((a, b) => b.to.getTime() - a.to.getTime())
}
