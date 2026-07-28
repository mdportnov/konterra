import type { Contact, Favor, Trip } from '@/lib/db/schema'
import { computeOverlaps } from '@/lib/travel/overlaps'
import { escapeHtml, type DigestSection } from '@/lib/email/templates'

/**
 * Turns a user's data into the handful of things worth interrupting them for.
 *
 * The bar is deliberately high: a digest that fires every week with filler trains people
 * to ignore it, so `hasContent` gates sending and each section caps its items.
 */

const BIRTHDAY_HORIZON_DAYS = 14
const RECONNECT_THRESHOLD_DAYS = 90
const STALE_FAVOR_DAYS = 60
const TRIP_HORIZON_DAYS = 30
const MAX_ITEMS_PER_SECTION = 5

export interface DigestInput {
  contacts: Contact[]
  favors: Favor[]
  trips: Trip[]
  now?: Date
}

export interface DigestResult {
  sections: DigestSection[]
  hasContent: boolean
  /** Machine-readable counts, useful for logging and tests. */
  counts: Record<string, number>
}

function daysUntilBirthday(birthday: Date, now: Date): number | null {
  const b = new Date(birthday)
  if (isNaN(b.getTime())) return null

  const thisYear = Date.UTC(now.getUTCFullYear(), b.getUTCMonth(), b.getUTCDate())
  const nextYear = Date.UTC(now.getUTCFullYear() + 1, b.getUTCMonth(), b.getUTCDate())
  const todayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())

  const target = thisYear >= todayUtc ? thisYear : nextYear
  return Math.round((target - todayUtc) / 86_400_000)
}

function daysSince(date: Date | null, now: Date): number | null {
  if (!date) return null
  const d = new Date(date)
  if (isNaN(d.getTime())) return null
  return Math.floor((now.getTime() - d.getTime()) / 86_400_000)
}

function strong(text: string): string {
  return `<strong style="color:#f2ede3;">${escapeHtml(text)}</strong>`
}

export function buildDigest({ contacts, favors, trips, now = new Date() }: DigestInput): DigestResult {
  const sections: DigestSection[] = []
  const counts: Record<string, number> = {}
  const real = contacts.filter((c) => !c.isSelf)

  const birthdays = real
    .map((c) => ({ contact: c, days: c.birthday ? daysUntilBirthday(new Date(c.birthday), now) : null }))
    .filter((b): b is { contact: Contact; days: number } => b.days !== null && b.days <= BIRTHDAY_HORIZON_DAYS)
    .sort((a, b) => a.days - b.days)
  counts.birthdays = birthdays.length

  if (birthdays.length > 0) {
    sections.push({
      title: 'Birthdays coming up',
      items: birthdays.slice(0, MAX_ITEMS_PER_SECTION).map(({ contact, days }) =>
        `${strong(contact.name)} — ${days === 0 ? 'today' : days === 1 ? 'tomorrow' : `in ${days} days`}`,
      ),
    })
  }

  const overdue = real
    .filter((c) => c.nextFollowUp && new Date(c.nextFollowUp).getTime() < now.getTime())
    .sort((a, b) => new Date(a.nextFollowUp!).getTime() - new Date(b.nextFollowUp!).getTime())
  counts.overdueFollowUps = overdue.length

  if (overdue.length > 0) {
    sections.push({
      title: 'Follow-ups past due',
      items: overdue.slice(0, MAX_ITEMS_PER_SECTION).map((c) => {
        const late = daysSince(new Date(c.nextFollowUp!), now)
        return `${strong(c.name)} — ${late === 0 ? 'due today' : `${late} days late`}`
      }),
    })
  }

  // Only contacts you rated matter here: an unrated import dump would otherwise flood the
  // digest with people the user never intended to keep warm.
  const goingCold = real
    .filter((c) => (c.rating ?? 0) >= 3)
    .map((c) => ({ contact: c, days: daysSince(c.lastContactedAt, now) }))
    .filter((c) => c.days === null || c.days >= RECONNECT_THRESHOLD_DAYS)
    .sort((a, b) => (b.days ?? Infinity) - (a.days ?? Infinity))
  counts.goingCold = goingCold.length

  if (goingCold.length > 0) {
    sections.push({
      title: 'Going cold',
      items: goingCold.slice(0, MAX_ITEMS_PER_SECTION).map(({ contact, days }) =>
        `${strong(contact.name)} — ${days === null ? 'never logged' : `${days} days quiet`}`,
      ),
    })
  }

  const contactsById = new Map(real.map((c) => [c.id, c]))
  const openFavors = favors
    .filter((f) => f.status === 'active')
    .map((f) => ({ favor: f, days: daysSince(f.date ?? f.createdAt, now) }))
    .filter((f) => f.days !== null && f.days >= STALE_FAVOR_DAYS)
    .sort((a, b) => (b.days ?? 0) - (a.days ?? 0))
  counts.openFavors = openFavors.length

  if (openFavors.length > 0) {
    sections.push({
      title: 'Unsettled favors',
      items: openFavors.slice(0, MAX_ITEMS_PER_SECTION).map(({ favor, days }) => {
        const name = contactsById.get(favor.contactId)?.name ?? 'Someone'
        const direction = favor.direction === 'given' ? 'you helped' : 'they helped you'
        return `${strong(name)} — ${direction}, ${days} days ago${favor.description ? `: ${escapeHtml(favor.description)}` : ''}`
      }),
    })
  }

  const overlaps = computeOverlaps({ trips, contacts, now, horizonDays: TRIP_HORIZON_DAYS })
  const tripsWithPeople = overlaps.upcoming.filter((t) => t.matches.length > 0)
  counts.upcomingTripsWithPeople = tripsWithPeople.length

  if (tripsWithPeople.length > 0) {
    sections.push({
      title: 'People you can catch',
      items: tripsWithPeople.slice(0, MAX_ITEMS_PER_SECTION).map((t) => {
        const when = t.ongoing ? 'right now' : t.daysUntil === 0 ? 'today' : `in ${t.daysUntil} days`
        const names = t.matches.slice(0, 4).map((m) => escapeHtml(m.contactName)).join(', ')
        const extra = t.matches.length > 4 ? ` +${t.matches.length - 4} more` : ''
        return `${strong(`${t.city}, ${t.country}`)} ${when} — ${names}${extra}`
      }),
    })
  }

  return {
    sections,
    hasContent: sections.length > 0,
    counts,
  }
}
