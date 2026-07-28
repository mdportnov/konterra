import { db } from './index'
import { users, contacts, interactions, contactConnections, contactCountryConnections, introductions, favors, visitedCountries, waitlist, tags, trips, countryWishlist, appSettings, socialPreviews, invites, auditLog, apiTokens, passwordResetTokens, emailVerificationTokens, rateLimitBuckets, onboardingProgress, contactLocationHistory, geocodeCache } from './schema'
import { and, arrayContains, asc, desc, eq, gte, inArray, isNull, lt, lte, ne, or, sql } from 'drizzle-orm'
import type { Trip, NewContact, NewContactConnection, NewContactCountryConnection, NewIntroduction, NewFavor, NewTrip, NewCountryWishlistEntry, NewSocialPreview, NewAuditLogEntry, NewContactLocationHistoryEntry } from './schema'
import { DEFAULT_MAX_INVITES, SETTING_KEY_MAX_INVITES } from '@/lib/constants/invites'

export async function deleteAllContactsByUserId(userId: string) {
  return db.delete(contacts).where(eq(contacts.userId, userId))
}

export async function deleteUserAccount(userId: string) {
  return db.delete(users).where(eq(users.id, userId))
}

export async function getUserByEmail(email: string) {
  return db.query.users.findFirst({
    where: eq(users.email, email),
    columns: { id: true, email: true, name: true, password: true, role: true },
  })
}

export async function createWaitlistEntry(data: { email: string; name: string; message: string | null }) {
  const result = await db
    .insert(waitlist)
    .values(data)
    .onConflictDoNothing({ target: waitlist.email })
    .returning({ id: waitlist.id })
  return result.length > 0
}

export async function getUserById(id: string) {
  return db.query.users.findFirst({
    where: eq(users.id, id),
    columns: { id: true, email: true, name: true, image: true, role: true, username: true, profileVisibility: true, profilePrivacyLevel: true, createdAt: true },
  })
}

export async function getUserPasswordHash(id: string) {
  const row = await db.query.users.findFirst({
    where: eq(users.id, id),
    columns: { password: true },
  })
  return row?.password ?? null
}

export async function getUserProfile(id: string) {
  return db.query.users.findFirst({
    where: eq(users.id, id),
    columns: { id: true, email: true, name: true, image: true, role: true, username: true, bio: true, profileVisibility: true, profilePrivacyLevel: true, publicProfileIndexable: true, publicProfileConsentAt: true, globeAutoRotate: true, onboardedAt: true, emailVerified: true, createdAt: true },
  })
}

export async function markUserOnboarded(id: string) {
  const [updated] = await db
    .update(users)
    .set({ onboardedAt: new Date() })
    .where(eq(users.id, id))
    .returning({ id: users.id, onboardedAt: users.onboardedAt })
  return updated ?? null
}

export async function getUserByUsername(username: string) {
  return db.query.users.findFirst({
    where: sql`lower(${users.username}) = ${username.toLowerCase()}`,
    columns: { id: true, name: true, image: true, username: true, bio: true, profileVisibility: true, profilePrivacyLevel: true, publicProfileIndexable: true, createdAt: true },
  })
}

export async function getUserGlobeSettings(userId: string) {
  try {
    const row = await db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: { globeAutoRotate: true },
    })
    return { globeAutoRotate: row?.globeAutoRotate ?? true }
  } catch {
    return { globeAutoRotate: true }
  }
}

export async function getPublicProfileData(userId: string, privacyLevel: 'countries_only' | 'full_travel') {
  const countries = await getVisitedCountries(userId)
  const tripsData = privacyLevel === 'full_travel' ? await getTripsByUserId(userId) : []
  // Public surface: the globe needs city/country/dates/coords, but private free-text
  // notes, the internal user id, and activity timestamps must never leak over the
  // unauthenticated profile API. Build the shape explicitly (not `{ ...t }`) so any new
  // `trips` column raises a type error here and forces a conscious expose/hide decision.
  const publicTrips: Trip[] = tripsData.map((t) => ({
    id: t.id,
    userId: '',
    arrivalDate: t.arrivalDate,
    departureDate: t.departureDate,
    durationDays: t.durationDays,
    city: t.city,
    country: t.country,
    lat: t.lat,
    lng: t.lng,
    notes: null,
    createdAt: null,
    updatedAt: null,
  }))
  return { countries, trips: publicTrips }
}

export async function updateUserProfile(id: string, data: {
  name?: string
  image?: string | null
  username?: string | null
  bio?: string | null
  profileVisibility?: 'private' | 'public'
  profilePrivacyLevel?: 'countries_only' | 'full_travel'
  globeAutoRotate?: boolean
  publicProfileIndexable?: boolean
  publicProfileConsentAt?: Date | null
}) {
  const [updated] = await db.update(users).set(data).where(eq(users.id, id)).returning()
  return updated
}

export async function getContactsByUserId(userId: string, page = 1, limit = 50) {
  const offset = (page - 1) * limit
  const [data, [{ count }]] = await Promise.all([
    db.query.contacts.findMany({
      where: eq(contacts.userId, userId),
      orderBy: (contacts, { desc, asc }) => [desc(contacts.updatedAt), asc(contacts.id)],
      limit,
      offset,
    }),
    db.select({ count: sql<number>`cast(count(*) as int)` })
      .from(contacts)
      .where(eq(contacts.userId, userId)),
  ])
  return { data, total: count, page, limit }
}

export async function getContactById(id: string, userId: string) {
  return db.query.contacts.findFirst({
    where: and(eq(contacts.id, id), eq(contacts.userId, userId)),
  })
}

export async function createContact(data: NewContact) {
  const [contact] = await db.insert(contacts).values(data).returning()
  return contact
}

export async function updateContact(id: string, userId: string, data: Partial<NewContact>) {
  const [contact] = await db
    .update(contacts)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(contacts.id, id), eq(contacts.userId, userId)))
    .returning()
  return contact
}

export async function deleteContact(id: string, userId: string) {
  await db.delete(contacts).where(and(eq(contacts.id, id), eq(contacts.userId, userId)))
}

export async function deleteContactsBulk(ids: string[], userId: string) {
  if (ids.length === 0) return 0
  const result = await db.delete(contacts).where(and(inArray(contacts.id, ids), eq(contacts.userId, userId)))
  return result.rowCount ?? ids.length
}

export async function addTagToContactsBulk(ids: string[], userId: string, tag: string) {
  if (ids.length === 0) return 0
  const result = await db
    .update(contacts)
    .set({
      tags: sql`array_append(coalesce(${contacts.tags}, '{}'), ${tag})`,
      updatedAt: new Date(),
    })
    .where(
      and(
        inArray(contacts.id, ids),
        eq(contacts.userId, userId),
        sql`NOT (${tag} = ANY(coalesce(${contacts.tags}, '{}')))`
      )
    )
  return result.rowCount ?? 0
}

export async function removeTagFromContactsBulk(ids: string[], userId: string, tag: string) {
  if (ids.length === 0) return 0
  const result = await db
    .update(contacts)
    .set({
      tags: sql`nullif(array_remove(${contacts.tags}, ${tag}), '{}')`,
      updatedAt: new Date(),
    })
    .where(
      and(
        inArray(contacts.id, ids),
        eq(contacts.userId, userId),
        sql`${tag} = ANY(coalesce(${contacts.tags}, '{}'))`
      )
    )
  return result.rowCount ?? 0
}

export async function getInteractionsByContactId(contactId: string, userId: string) {
  return db
    .select({
      id: interactions.id,
      contactId: interactions.contactId,
      type: interactions.type,
      date: interactions.date,
      location: interactions.location,
      notes: interactions.notes,
      createdAt: interactions.createdAt,
      updatedAt: interactions.updatedAt,
    })
    .from(interactions)
    .innerJoin(contacts, eq(interactions.contactId, contacts.id))
    .where(and(eq(interactions.contactId, contactId), eq(contacts.userId, userId)))
    .orderBy(sql`${interactions.date} desc`)
}

export async function createInteraction(data: {
  contactId: string
  type: string
  date: Date
  location: string | null
  notes: string | null
}) {
  return db.transaction(async (tx) => {
    const [interaction] = await tx.insert(interactions).values(data as typeof interactions.$inferInsert).returning()
    const contact = await tx.query.contacts.findFirst({
      where: eq(contacts.id, data.contactId),
    })
    if (contact) {
      const current = contact.lastContactedAt?.getTime() || 0
      const set: Record<string, unknown> = { updatedAt: new Date() }
      if (data.date.getTime() > current) {
        set.lastContactedAt = data.date
      }
      // Backfilling an old meeting must not wipe a follow-up that is still ahead of it.
      // Only a contact event at or after the due date actually discharges the reminder.
      const due = contact.nextFollowUp?.getTime()
      if (due !== undefined && data.date.getTime() >= due) {
        set.nextFollowUp = null
      }
      await tx
        .update(contacts)
        .set(set)
        .where(eq(contacts.id, data.contactId))
    }
    return interaction
  })
}

export async function updateInteraction(id: string, contactId: string, data: Partial<typeof interactions.$inferInsert>) {
  return db.transaction(async (tx) => {
    const [interaction] = await tx
      .update(interactions)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(interactions.id, id), eq(interactions.contactId, contactId)))
      .returning()
    if (interaction && data.date) {
      const allForContact = await tx.query.interactions.findMany({
        where: eq(interactions.contactId, contactId),
        orderBy: (interactions, { desc }) => [desc(interactions.date)],
        columns: { date: true },
      })
      if (allForContact.length > 0) {
        await tx
          .update(contacts)
          .set({ lastContactedAt: allForContact[0].date, updatedAt: new Date() })
          .where(eq(contacts.id, contactId))
      }
    }
    return interaction
  })
}

export async function deleteInteraction(id: string, contactId: string) {
  return db.transaction(async (tx) => {
    await tx.delete(interactions).where(and(eq(interactions.id, id), eq(interactions.contactId, contactId)))
    const remaining = await tx.query.interactions.findMany({
      where: eq(interactions.contactId, contactId),
      orderBy: (interactions, { desc }) => [desc(interactions.date)],
      columns: { date: true },
    })
    const lastDate = remaining.length > 0 ? remaining[0].date : null
    await tx
      .update(contacts)
      .set({ lastContactedAt: lastDate, updatedAt: new Date() })
      .where(eq(contacts.id, contactId))
  })
}

export async function getRecentInteractions(userId: string, limit = 15, offset = 0) {
  const rows = await db
    .select({
      id: interactions.id,
      contactId: interactions.contactId,
      type: interactions.type,
      date: interactions.date,
      location: interactions.location,
      notes: interactions.notes,
      createdAt: interactions.createdAt,
      updatedAt: interactions.updatedAt,
      contactName: contacts.name,
    })
    .from(interactions)
    .innerJoin(contacts, eq(interactions.contactId, contacts.id))
    .where(eq(contacts.userId, userId))
    .orderBy(desc(interactions.date))
    .limit(limit)
    .offset(offset)

  const [{ count }] = await db
    .select({ count: sql<number>`cast(count(*) as int)` })
    .from(interactions)
    .innerJoin(contacts, eq(interactions.contactId, contacts.id))
    .where(eq(contacts.userId, userId))

  return { data: rows, total: count, limit, offset }
}

export async function getVisitedCountries(userId: string): Promise<string[]> {
  const now = new Date()
  return db.transaction(async (tx) => {
    const pastTripCountries = await tx
      .selectDistinct({ country: trips.country })
      .from(trips)
      .where(and(eq(trips.userId, userId), lte(trips.arrivalDate, now)))
    if (pastTripCountries.length > 0) {
      await tx
        .insert(visitedCountries)
        .values(pastTripCountries.map((r) => ({ userId, country: r.country, source: 'derived' as const })))
        .onConflictDoNothing({ target: [visitedCountries.userId, visitedCountries.country] })
    }
    const rows = await tx.query.visitedCountries.findMany({
      where: eq(visitedCountries.userId, userId),
    })
    return rows.map((r) => r.country)
  })
}

export async function addVisitedCountry(userId: string, country: string): Promise<string[]> {
  await db
    .insert(visitedCountries)
    .values({ userId, country, source: 'manual' })
    .onConflictDoUpdate({
      target: [visitedCountries.userId, visitedCountries.country],
      set: { source: 'manual' },
    })
  return getVisitedCountries(userId)
}

export async function removeVisitedCountry(userId: string, country: string): Promise<string[]> {
  const existing = await db.query.visitedCountries.findFirst({
    where: and(eq(visitedCountries.userId, userId), eq(visitedCountries.country, country)),
  })
  if (!existing) return getVisitedCountries(userId)
  if (existing.source === 'derived') {
    return getVisitedCountries(userId)
  }
  await db.delete(visitedCountries).where(
    and(eq(visitedCountries.userId, userId), eq(visitedCountries.country, country))
  )
  return getVisitedCountries(userId)
}

export async function setVisitedCountries(userId: string, countries: string[]): Promise<string[]> {
  return db.transaction(async (tx) => {
    await tx
      .delete(visitedCountries)
      .where(and(eq(visitedCountries.userId, userId), eq(visitedCountries.source, 'manual')))
    if (countries.length > 0) {
      await tx
        .insert(visitedCountries)
        .values(countries.map((country) => ({ userId, country, source: 'manual' as const })))
        .onConflictDoUpdate({
          target: [visitedCountries.userId, visitedCountries.country],
          set: { source: 'manual' },
        })
    }
    const rows = await tx.query.visitedCountries.findMany({
      where: eq(visitedCountries.userId, userId),
    })
    return rows.map((r) => r.country)
  })
}

export async function getConnectionsByContactId(contactId: string, userId: string) {
  return db.query.contactConnections.findMany({
    where: and(
      eq(contactConnections.userId, userId),
      or(
        eq(contactConnections.sourceContactId, contactId),
        eq(contactConnections.targetContactId, contactId)
      )
    ),
  })
}

export async function getAllConnections(userId: string, page = 1, limit = 50) {
  const offset = (page - 1) * limit
  const [data, [{ count }]] = await Promise.all([
    db.query.contactConnections.findMany({
      where: eq(contactConnections.userId, userId),
      limit,
      offset,
    }),
    db.select({ count: sql<number>`cast(count(*) as int)` })
      .from(contactConnections)
      .where(eq(contactConnections.userId, userId)),
  ])
  return { data, total: count, page, limit }
}

/**
 * A relationship between two contacts is one edge regardless of which side it was entered
 * from. The unique index only covers (source, target), so without this check the reverse
 * pair inserts a second row and every degree/density figure counts the pair twice.
 */
export async function createConnection(data: NewContactConnection) {
  const existing = await db.query.contactConnections.findFirst({
    where: and(
      eq(contactConnections.userId, data.userId),
      or(
        and(
          eq(contactConnections.sourceContactId, data.sourceContactId),
          eq(contactConnections.targetContactId, data.targetContactId),
        ),
        and(
          eq(contactConnections.sourceContactId, data.targetContactId),
          eq(contactConnections.targetContactId, data.sourceContactId),
        ),
      ),
    ),
  })
  if (existing) return existing

  const [conn] = await db
    .insert(contactConnections)
    .values(data)
    .onConflictDoNothing({ target: [contactConnections.sourceContactId, contactConnections.targetContactId] })
    .returning()
  if (conn) return conn

  // Lost a race with a concurrent insert of the same pair — return the winner.
  const raced = await db.query.contactConnections.findFirst({
    where: and(
      eq(contactConnections.sourceContactId, data.sourceContactId),
      eq(contactConnections.targetContactId, data.targetContactId),
    ),
  })
  return raced!
}

export async function deleteConnectionForContact(id: string, contactId: string, userId: string) {
  const result = await db.delete(contactConnections).where(
    and(
      eq(contactConnections.id, id),
      eq(contactConnections.userId, userId),
      or(
        eq(contactConnections.sourceContactId, contactId),
        eq(contactConnections.targetContactId, contactId)
      )
    )
  )
  return (result.rowCount ?? 0) > 0
}

export async function getIntroductionsByUserId(userId: string, page = 1, limit = 50) {
  const offset = (page - 1) * limit
  const [data, [{ count }]] = await Promise.all([
    db.query.introductions.findMany({
      where: eq(introductions.userId, userId),
      orderBy: (introductions, { desc }) => [desc(introductions.createdAt)],
      limit,
      offset,
    }),
    db.select({ count: sql<number>`cast(count(*) as int)` })
      .from(introductions)
      .where(eq(introductions.userId, userId)),
  ])
  return { data, total: count, page, limit }
}

export async function createIntroduction(data: NewIntroduction) {
  const rows = await db.insert(introductions).values(data).onConflictDoNothing().returning()
  return rows[0] ?? null
}

export async function updateIntroduction(id: string, userId: string, data: Partial<NewIntroduction>) {
  const [intro] = await db
    .update(introductions)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(introductions.id, id), eq(introductions.userId, userId)))
    .returning()
  return intro
}

export async function deleteIntroduction(id: string, userId: string) {
  await db.delete(introductions).where(
    and(eq(introductions.id, id), eq(introductions.userId, userId))
  )
}

export async function getFavorsByContactId(contactId: string, userId: string) {
  return db.query.favors.findMany({
    where: and(eq(favors.contactId, contactId), eq(favors.userId, userId)),
    orderBy: (favors, { desc }) => [desc(favors.date)],
  })
}

export async function getAllFavors(userId: string, page = 1, limit = 50) {
  const offset = (page - 1) * limit
  const [data, [{ count }]] = await Promise.all([
    db.query.favors.findMany({
      where: eq(favors.userId, userId),
      orderBy: (favors, { desc }) => [desc(favors.date)],
      limit,
      offset,
    }),
    db.select({ count: sql<number>`cast(count(*) as int)` })
      .from(favors)
      .where(eq(favors.userId, userId)),
  ])
  return { data, total: count, page, limit }
}

export async function createFavor(data: NewFavor) {
  const [favor] = await db.insert(favors).values(data).returning()
  return favor
}

export async function updateFavor(id: string, userId: string, data: Partial<NewFavor>) {
  const [favor] = await db
    .update(favors)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(favors.id, id), eq(favors.userId, userId)))
    .returning()
  return favor
}

export async function deleteFavor(id: string, userId: string) {
  await db.delete(favors).where(
    and(eq(favors.id, id), eq(favors.userId, userId))
  )
}

export async function getOrCreateSelfContact(userId: string, userName: string) {
  const existing = await db.query.contacts.findFirst({
    where: and(eq(contacts.userId, userId), eq(contacts.isSelf, true)),
  })
  if (existing) return existing
  const [self] = await db
    .insert(contacts)
    .values({ userId, name: userName || 'Me', isSelf: true })
    .returning()
  return self
}

export async function createConnectionsBulk(data: NewContactConnection[]) {
  if (data.length === 0) return []

  // Collapse reverse duplicates within the payload itself; the unique index alone only
  // catches the same-direction pair.
  const seenPairs = new Set<string>()
  const deduped = data.filter((c) => {
    if (c.sourceContactId === c.targetContactId) return false
    const key = [c.sourceContactId, c.targetContactId].sort().join(':')
    if (seenPairs.has(key)) return false
    seenPairs.add(key)
    return true
  })
  if (deduped.length === 0) return []

  const BATCH_SIZE = 50
  return db.transaction(async (tx) => {
    const results: (typeof contactConnections.$inferSelect)[] = []
    for (let i = 0; i < deduped.length; i += BATCH_SIZE) {
      const batch = deduped.slice(i, i + BATCH_SIZE)
      const rows = await tx
        .insert(contactConnections)
        .values(batch)
        .onConflictDoNothing({ target: [contactConnections.sourceContactId, contactConnections.targetContactId] })
        .returning()
      results.push(...rows)
    }
    return results
  })
}

export async function createContactsBulk(data: NewContact[]) {
  if (data.length === 0) return []
  const BATCH_SIZE = 50
  return db.transaction(async (tx) => {
    const results: (typeof contacts.$inferSelect)[] = []
    for (let i = 0; i < data.length; i += BATCH_SIZE) {
      const batch = data.slice(i, i + BATCH_SIZE)
      const rows = await tx.insert(contacts).values(batch).returning()
      results.push(...rows)
    }
    return results
  })
}

export async function getCountryConnectionsByContactId(contactId: string, userId: string) {
  return db.query.contactCountryConnections.findMany({
    where: and(
      eq(contactCountryConnections.contactId, contactId),
      eq(contactCountryConnections.userId, userId)
    ),
  })
}

export async function getAllCountryConnections(userId: string) {
  return db.query.contactCountryConnections.findMany({
    where: eq(contactCountryConnections.userId, userId),
    limit: 2000,
  })
}

export async function createCountryConnection(data: NewContactCountryConnection) {
  const [conn] = await db.insert(contactCountryConnections).values(data).returning()
  return conn
}

export async function updateCountryConnection(id: string, contactId: string, userId: string, data: { notes?: string | null; tags?: string[] | null }) {
  const [conn] = await db
    .update(contactCountryConnections)
    .set(data)
    .where(
      and(
        eq(contactCountryConnections.id, id),
        eq(contactCountryConnections.contactId, contactId),
        eq(contactCountryConnections.userId, userId)
      )
    )
    .returning()
  return conn
}

export async function deleteCountryConnection(id: string, contactId: string, userId: string) {
  await db.delete(contactCountryConnections).where(
    and(
      eq(contactCountryConnections.id, id),
      eq(contactCountryConnections.contactId, contactId),
      eq(contactCountryConnections.userId, userId)
    )
  )
}

export async function verifyContactOwnership(contactId: string, userId: string): Promise<boolean> {
  const contact = await db.query.contacts.findFirst({
    where: and(eq(contacts.id, contactId), eq(contacts.userId, userId)),
    columns: { id: true },
  })
  return !!contact
}

export async function getTagsByUserId(userId: string) {
  return db.query.tags.findMany({
    where: eq(tags.userId, userId),
    orderBy: (tags, { asc }) => [asc(tags.name)],
  })
}

export async function createTag(userId: string, name: string, color?: string) {
  const [tag] = await db
    .insert(tags)
    .values({ userId, name, color: color || null })
    .onConflictDoNothing({ target: [tags.userId, tags.name] })
    .returning()
  if (!tag) {
    return db.query.tags.findFirst({
      where: and(eq(tags.userId, userId), eq(tags.name, name)),
    })
  }
  return tag
}

export async function deleteTag(id: string, userId: string) {
  const tag = await db.query.tags.findFirst({
    where: and(eq(tags.id, id), eq(tags.userId, userId)),
  })
  if (!tag) return

  await db.transaction(async (tx) => {
    await tx
      .update(contacts)
      .set({ tags: sql`array_remove(${contacts.tags}, ${tag.name})` })
      .where(and(eq(contacts.userId, userId), arrayContains(contacts.tags, [tag.name])))

    await tx
      .update(contacts)
      .set({ tags: null })
      .where(and(eq(contacts.userId, userId), sql`${contacts.tags} = '{}'`))

    await tx.delete(tags).where(and(eq(tags.id, id), eq(tags.userId, userId)))
  })

  return tag
}

export async function mergeContacts(
  winnerId: string,
  loserId: string,
  userId: string,
  fieldOverrides: Record<string, unknown>
) {
  return db.transaction(async (tx) => {
    const [winner, loser] = await Promise.all([
      tx.query.contacts.findFirst({ where: and(eq(contacts.id, winnerId), eq(contacts.userId, userId)) }),
      tx.query.contacts.findFirst({ where: and(eq(contacts.id, loserId), eq(contacts.userId, userId)) }),
    ])
    if (!winner || !loser) return null

    const updates: Record<string, unknown> = { ...fieldOverrides, updatedAt: new Date() }
    const winnerTags = winner.tags || []
    const loserTags = loser.tags || []
    const mergedTags = [...new Set([...winnerTags, ...loserTags])]
    if (mergedTags.length > 0) updates.tags = mergedTags

    await tx.update(contacts).set(updates).where(eq(contacts.id, winnerId))

    await tx.update(interactions).set({ contactId: winnerId }).where(eq(interactions.contactId, loserId))

    await tx.update(favors).set({ contactId: winnerId }).where(eq(favors.contactId, loserId))

    const existingCountryConns = await tx.query.contactCountryConnections.findMany({
      where: eq(contactCountryConnections.contactId, winnerId),
    })
    const existingCountries = new Set(existingCountryConns.map((c) => c.country))
    const loserCountryConns = await tx.query.contactCountryConnections.findMany({
      where: eq(contactCountryConnections.contactId, loserId),
    })
    for (const cc of loserCountryConns) {
      if (existingCountries.has(cc.country)) {
        await tx.delete(contactCountryConnections).where(eq(contactCountryConnections.id, cc.id))
      } else {
        await tx.update(contactCountryConnections).set({ contactId: winnerId }).where(eq(contactCountryConnections.id, cc.id))
      }
    }

    const existingConns = await tx.query.contactConnections.findMany({
      where: and(
        eq(contactConnections.userId, userId),
        or(eq(contactConnections.sourceContactId, winnerId), eq(contactConnections.targetContactId, winnerId))
      ),
    })
    const connPairs = new Set(existingConns.map((c) => {
      const ids = [c.sourceContactId, c.targetContactId].sort()
      return ids.join(':')
    }))

    const loserConns = await tx.query.contactConnections.findMany({
      where: and(
        eq(contactConnections.userId, userId),
        or(eq(contactConnections.sourceContactId, loserId), eq(contactConnections.targetContactId, loserId))
      ),
    })
    for (const conn of loserConns) {
      const newSource = conn.sourceContactId === loserId ? winnerId : conn.sourceContactId
      const newTarget = conn.targetContactId === loserId ? winnerId : conn.targetContactId
      if (newSource === newTarget) {
        await tx.delete(contactConnections).where(eq(contactConnections.id, conn.id))
        continue
      }
      const pairKey = [newSource, newTarget].sort().join(':')
      if (connPairs.has(pairKey)) {
        await tx.delete(contactConnections).where(eq(contactConnections.id, conn.id))
      } else {
        await tx.update(contactConnections)
          .set({ sourceContactId: newSource, targetContactId: newTarget })
          .where(eq(contactConnections.id, conn.id))
        connPairs.add(pairKey)
      }
    }

    const loserIntros = await tx.query.introductions.findMany({
      where: and(
        eq(introductions.userId, userId),
        or(eq(introductions.contactAId, loserId), eq(introductions.contactBId, loserId))
      ),
    })
    const existingIntros = await tx.query.introductions.findMany({
      where: and(
        eq(introductions.userId, userId),
        or(eq(introductions.contactAId, winnerId), eq(introductions.contactBId, winnerId))
      ),
    })
    const introPairs = new Set(existingIntros.map((i) => [i.contactAId, i.contactBId].sort().join(':')))

    for (const intro of loserIntros) {
      const newA = intro.contactAId === loserId ? winnerId : intro.contactAId
      const newB = intro.contactBId === loserId ? winnerId : intro.contactBId
      if (newA === newB) {
        await tx.delete(introductions).where(eq(introductions.id, intro.id))
        continue
      }
      const pairKey = [newA, newB].sort().join(':')
      if (introPairs.has(pairKey)) {
        await tx.delete(introductions).where(eq(introductions.id, intro.id))
      } else {
        await tx.update(introductions)
          .set({ contactAId: newA, contactBId: newB })
          .where(eq(introductions.id, intro.id))
        introPairs.add(pairKey)
      }
    }

    // Social previews are keyed by (contactId, platform); move the ones the winner is
    // missing and drop the rest, otherwise they die with the loser row and the merged
    // contact silently loses its enriched profiles.
    const winnerPreviews = await tx.query.socialPreviews.findMany({
      where: eq(socialPreviews.contactId, winnerId),
      columns: { platform: true },
    })
    const winnerPlatforms = new Set(winnerPreviews.map((p) => p.platform))
    const loserPreviews = await tx.query.socialPreviews.findMany({
      where: eq(socialPreviews.contactId, loserId),
    })
    for (const preview of loserPreviews) {
      if (winnerPlatforms.has(preview.platform)) {
        await tx.delete(socialPreviews).where(eq(socialPreviews.id, preview.id))
      } else {
        await tx.update(socialPreviews)
          .set({ contactId: winnerId })
          .where(eq(socialPreviews.id, preview.id))
        winnerPlatforms.add(preview.platform)
      }
    }

    await tx.delete(contacts).where(eq(contacts.id, loserId))

    // The loser's interactions moved to the winner above, so the winner's cached
    // "last contacted" is now stale — recompute it from the merged set.
    const [latest] = await tx
      .select({ date: interactions.date })
      .from(interactions)
      .where(eq(interactions.contactId, winnerId))
      .orderBy(desc(interactions.date))
      .limit(1)
    if (!fieldOverrides.lastContactedAt) {
      await tx
        .update(contacts)
        .set({ lastContactedAt: latest?.date ?? null })
        .where(eq(contacts.id, winnerId))
    }

    const [updated] = await tx
      .select()
      .from(contacts)
      .where(eq(contacts.id, winnerId))

    return updated
  })
}

export async function getAllContactsByUserId(userId: string) {
  return db.query.contacts.findMany({
    where: eq(contacts.userId, userId),
    orderBy: (contacts, { asc }) => [asc(contacts.name)],
  })
}

export async function getAllConnectionsByUserId(userId: string) {
  return db.query.contactConnections.findMany({
    where: eq(contactConnections.userId, userId),
  })
}

export async function getAllInteractionsByUserId(userId: string) {
  return db
    .select({
      id: interactions.id,
      contactId: interactions.contactId,
      type: interactions.type,
      date: interactions.date,
      location: interactions.location,
      notes: interactions.notes,
    })
    .from(interactions)
    .innerJoin(contacts, eq(interactions.contactId, contacts.id))
    .where(eq(contacts.userId, userId))
    .orderBy(desc(interactions.date))
}

export async function getAllFavorsByUserId(userId: string) {
  return db.query.favors.findMany({
    where: eq(favors.userId, userId),
  })
}

export async function getAllIntroductionsByUserId(userId: string) {
  return db.query.introductions.findMany({
    where: eq(introductions.userId, userId),
  })
}

export async function createInteractionsBulk(data: { contactId: string; type: string; date: Date; location: string | null; notes: string | null }[]) {
  if (data.length === 0) return []
  const BATCH_SIZE = 50
  return db.transaction(async (tx) => {
    const results: (typeof interactions.$inferSelect)[] = []
    for (let i = 0; i < data.length; i += BATCH_SIZE) {
      const batch = data.slice(i, i + BATCH_SIZE)
      const rows = await tx.insert(interactions).values(batch as (typeof interactions.$inferInsert)[]).returning()
      results.push(...rows)
    }
    return results
  })
}

export async function createFavorsBulk(data: NewFavor[]) {
  if (data.length === 0) return []
  const BATCH_SIZE = 50
  return db.transaction(async (tx) => {
    const results: (typeof favors.$inferSelect)[] = []
    for (let i = 0; i < data.length; i += BATCH_SIZE) {
      const batch = data.slice(i, i + BATCH_SIZE)
      const rows = await tx.insert(favors).values(batch).returning()
      results.push(...rows)
    }
    return results
  })
}

export async function createIntroductionsBulk(data: NewIntroduction[]) {
  if (data.length === 0) return []
  const BATCH_SIZE = 50
  return db.transaction(async (tx) => {
    const results: (typeof introductions.$inferSelect)[] = []
    for (let i = 0; i < data.length; i += BATCH_SIZE) {
      const batch = data.slice(i, i + BATCH_SIZE)
      const rows = await tx
        .insert(introductions)
        .values(batch)
        .onConflictDoNothing()
        .returning()
      results.push(...rows)
    }
    return results
  })
}

export async function createCountryConnectionsBulk(data: NewContactCountryConnection[]) {
  if (data.length === 0) return []
  const BATCH_SIZE = 50
  return db.transaction(async (tx) => {
    const results: (typeof contactCountryConnections.$inferSelect)[] = []
    for (let i = 0; i < data.length; i += BATCH_SIZE) {
      const batch = data.slice(i, i + BATCH_SIZE)
      const rows = await tx
        .insert(contactCountryConnections)
        .values(batch)
        .onConflictDoNothing()
        .returning()
      results.push(...rows)
    }
    return results
  })
}

export async function createTagsBulk(userId: string, tagData: { name: string; color?: string | null }[]) {
  if (tagData.length === 0) return []
  const names = [...new Set(tagData.map((t) => t.name))]
  await db
    .insert(tags)
    .values(tagData.map((t) => ({ userId, name: t.name, color: t.color ?? null })))
    .onConflictDoNothing({ target: [tags.userId, tags.name] })
  return db.query.tags.findMany({
    where: and(eq(tags.userId, userId), inArray(tags.name, names)),
  })
}

export async function addVisitedCountriesBulk(userId: string, countries: string[], source: 'manual' | 'derived' = 'derived') {
  if (countries.length === 0) return
  const values = [...new Set(countries)].map((country) => ({ userId, country, source }))
  if (source === 'manual') {
    await db
      .insert(visitedCountries)
      .values(values)
      .onConflictDoUpdate({
        target: [visitedCountries.userId, visitedCountries.country],
        set: { source: 'manual' },
      })
  } else {
    await db
      .insert(visitedCountries)
      .values(values)
      .onConflictDoNothing({ target: [visitedCountries.userId, visitedCountries.country] })
  }
}

type DbExecutor = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0]

async function syncDerivedVisitedForCountryWith(exec: DbExecutor, userId: string, country: string) {
  const stillHasPastTrip = await exec.query.trips.findFirst({
    where: and(eq(trips.userId, userId), eq(trips.country, country), lte(trips.arrivalDate, new Date())),
    columns: { id: true },
  })
  if (stillHasPastTrip) {
    await exec
      .insert(visitedCountries)
      .values({ userId, country, source: 'derived' })
      .onConflictDoNothing({ target: [visitedCountries.userId, visitedCountries.country] })
    return
  }
  await exec.delete(visitedCountries).where(
    and(
      eq(visitedCountries.userId, userId),
      eq(visitedCountries.country, country),
      eq(visitedCountries.source, 'derived'),
    )
  )
}

export async function syncDerivedVisitedForCountry(userId: string, country: string) {
  return syncDerivedVisitedForCountryWith(db, userId, country)
}

export async function renameTag(id: string, userId: string, newName: string) {
  const tag = await db.query.tags.findFirst({
    where: and(eq(tags.id, id), eq(tags.userId, userId)),
  })
  if (!tag) return null

  const oldName = tag.name

  return db.transaction(async (tx) => {
    await tx
      .update(contacts)
      .set({ tags: sql`array_replace(${contacts.tags}, ${oldName}, ${newName})` })
      .where(and(eq(contacts.userId, userId), arrayContains(contacts.tags, [oldName])))

    const [updated] = await tx
      .update(tags)
      .set({ name: newName })
      .where(and(eq(tags.id, id), eq(tags.userId, userId)))
      .returning()
    return updated
  })
}

export async function getTripsByUserId(userId: string) {
  return db.query.trips.findMany({
    where: eq(trips.userId, userId),
    orderBy: (trips, { desc }) => [desc(trips.arrivalDate)],
    limit: 1000,
  })
}

export async function createTrip(data: NewTrip) {
  return db.transaction(async (tx) => {
    const [trip] = await tx.insert(trips).values(data).returning()
    await syncDerivedVisitedForCountryWith(tx, data.userId, data.country)
    return trip
  })
}

export async function createTripsBulk(data: NewTrip[]) {
  if (data.length === 0) return []
  const BATCH_SIZE = 50
  return db.transaction(async (tx) => {
    const out: (typeof trips.$inferSelect)[] = []
    for (let i = 0; i < data.length; i += BATCH_SIZE) {
      const batch = data.slice(i, i + BATCH_SIZE)
      const rows = await tx.insert(trips).values(batch).returning()
      out.push(...rows)
    }
    const pairs = new Set<string>()
    for (const t of data) pairs.add(`${t.userId}::${t.country}`)
    for (const key of pairs) {
      const [userId, country] = key.split('::')
      await syncDerivedVisitedForCountryWith(tx, userId, country)
    }
    return out
  })
}

export async function updateTrip(id: string, userId: string, data: Partial<Omit<NewTrip, 'id' | 'userId'>>) {
  return db.transaction(async (tx) => {
    const before = await tx.query.trips.findFirst({ where: and(eq(trips.id, id), eq(trips.userId, userId)) })
    if (!before) return undefined

    // Recompute durationDays from the resulting dates whenever a date changes, so the
    // stored value can never drift out of sync with arrival/departure.
    const dateChanged = data.arrivalDate !== undefined || data.departureDate !== undefined
    if (dateChanged) {
      const arrival = (data.arrivalDate as Date | undefined) ?? before.arrivalDate
      const departure = data.departureDate !== undefined
        ? (data.departureDate as Date | null)
        : before.departureDate
      if (departure && departure < arrival) throw new Error('INVALID_DATE_RANGE')
      data.durationDays = departure
        ? Math.round((new Date(departure).getTime() - new Date(arrival).getTime()) / 86_400_000)
        : null
    }

    const [trip] = await tx
      .update(trips)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(trips.id, id), eq(trips.userId, userId)))
      .returning()
    const countries = new Set<string>([before.country])
    if (trip?.country) countries.add(trip.country)
    for (const c of countries) await syncDerivedVisitedForCountryWith(tx, userId, c)
    return trip
  })
}

export async function deleteTrip(id: string, userId: string) {
  return db.transaction(async (tx) => {
    const before = await tx.query.trips.findFirst({ where: and(eq(trips.id, id), eq(trips.userId, userId)) })
    await tx.delete(trips).where(and(eq(trips.id, id), eq(trips.userId, userId)))
    if (before) await syncDerivedVisitedForCountryWith(tx, userId, before.country)
  })
}

export async function deleteAllTrips(userId: string) {
  return db.transaction(async (tx) => {
    const result = await tx.delete(trips).where(eq(trips.userId, userId))
    await tx.delete(visitedCountries).where(and(eq(visitedCountries.userId, userId), eq(visitedCountries.source, 'derived')))
    return result
  })
}

export async function updateLastActive(userId: string) {
  await db
    .update(users)
    .set({ lastActiveAt: new Date() })
    .where(
      and(
        eq(users.id, userId),
        sql`(${users.lastActiveAt} IS NULL OR ${users.lastActiveAt} < now() - interval '5 minutes')`
      )
    )
}

export async function getAllUsers() {
  const rows = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      image: users.image,
      role: users.role,
      maxInvites: users.maxInvites,
      createdAt: users.createdAt,
      lastActiveAt: users.lastActiveAt,
      contactCount: sql<number>`cast((select count(*) from contacts where contacts.user_id = users.id) as int)`,
      tripCount: sql<number>`cast((select count(*) from trips where trips.user_id = users.id) as int)`,
      visitedCountryCount: sql<number>`cast((select count(*) from visited_countries where visited_countries.user_id = users.id) as int)`,
      visitedCityCount: sql<number>`cast((select count(distinct trips.city) from trips where trips.user_id = users.id) as int)`,
      usedInviteCount: sql<number>`cast((select count(*) from users u2 where u2.invited_by = users.id) as int)`,
    })
    .from(users)
    .orderBy(desc(users.createdAt))
  return rows
}

export async function createUser(data: { email: string; name: string; password: string; role?: string }) {
  const id = crypto.randomUUID()
  const [user] = await db
    .insert(users)
    .values({ id, email: data.email, name: data.name, password: data.password, role: (data.role as 'user' | 'moderator' | 'admin') ?? 'user' })
    .returning({ id: users.id, email: users.email, name: users.name, role: users.role, createdAt: users.createdAt })
  return user
}

export async function updateUserRole(id: string, role: 'user' | 'moderator' | 'admin') {
  const [updated] = await db.update(users).set({ role }).where(eq(users.id, id)).returning({ id: users.id, role: users.role })
  return updated
}

export async function updateUser(id: string, data: { name?: string; email?: string; role?: 'user' | 'moderator' | 'admin'; password?: string; maxInvites?: number | null }) {
  const set: Record<string, unknown> = {}
  if (data.name !== undefined) set.name = data.name
  if (data.email !== undefined) set.email = data.email
  if (data.role !== undefined) set.role = data.role
  if (data.password !== undefined) set.password = data.password
  if (data.maxInvites !== undefined) set.maxInvites = data.maxInvites
  if (Object.keys(set).length === 0) return null
  const [updated] = await db.update(users).set(set).where(eq(users.id, id)).returning({
    id: users.id,
    email: users.email,
    name: users.name,
    role: users.role,
    createdAt: users.createdAt,
  })
  return updated
}

export async function deleteUser(id: string) {
  const [deleted] = await db.delete(users).where(eq(users.id, id)).returning({ id: users.id })
  return deleted
}

export async function getAdminStats() {
  const [row] = await db.select({
    totalUsers: sql<number>`cast((select count(*) from users) as int)`,
    totalContacts: sql<number>`cast((select count(*) from contacts) as int)`,
    totalConnections: sql<number>`cast((select count(*) from contact_connections) as int)`,
    totalInteractions: sql<number>`cast((select count(*) from interactions) as int)`,
    totalFavors: sql<number>`cast((select count(*) from favors) as int)`,
    totalTrips: sql<number>`cast((select count(*) from trips) as int)`,
    totalTags: sql<number>`cast((select count(*) from tags) as int)`,
    waitlistPending: sql<number>`cast((select count(*) from waitlist where status = 'pending') as int)`,
    waitlistTotal: sql<number>`cast((select count(*) from waitlist) as int)`,
  }).from(sql`(select 1) as one`)

  return {
    ...row,
    avgContactsPerUser: row.totalUsers > 0 ? Math.round(row.totalContacts / row.totalUsers) : 0,
  }
}

export async function getWaitlistEntries(status?: 'pending' | 'approved' | 'rejected') {
  const condition = status ? eq(waitlist.status, status) : undefined
  return db.query.waitlist.findMany({
    where: condition,
    orderBy: desc(waitlist.createdAt),
  })
}

export async function getWaitlistEntryById(id: string) {
  return db.query.waitlist.findFirst({
    where: eq(waitlist.id, id),
  })
}

export async function getWaitlistEntryByEmail(email: string) {
  return db.query.waitlist.findFirst({
    where: eq(waitlist.email, email),
  })
}

export async function updateWaitlistStatus(
  id: string,
  status: 'approved' | 'rejected',
  reviewedBy: string,
  adminNote?: string,
) {
  const set: Record<string, unknown> = {
    status,
    reviewedBy,
    reviewedAt: new Date(),
  }
  if (adminNote !== undefined) set.adminNote = adminNote
  const [updated] = await db
    .update(waitlist)
    .set(set)
    .where(eq(waitlist.id, id))
    .returning()
  return updated
}

export async function deleteWaitlistEntry(id: string) {
  const [deleted] = await db
    .delete(waitlist)
    .where(eq(waitlist.id, id))
    .returning({ id: waitlist.id })
  return deleted
}

export async function getWishlistCountries(userId: string) {
  return db.query.countryWishlist.findMany({
    where: eq(countryWishlist.userId, userId),
    orderBy: (cw, { desc }) => [desc(cw.updatedAt)],
  })
}

export async function getWishlistCountryByCountry(userId: string, country: string) {
  return db.query.countryWishlist.findFirst({
    where: and(eq(countryWishlist.userId, userId), eq(countryWishlist.country, country)),
  })
}

export async function addWishlistCountry(userId: string, country: string, data?: { priority?: string; notes?: string }) {
  const values: NewCountryWishlistEntry = { userId, country }
  if (data?.priority) values.priority = data.priority as 'dream' | 'high' | 'medium' | 'low'
  if (data?.notes) values.notes = data.notes
  const [entry] = await db
    .insert(countryWishlist)
    .values(values)
    .onConflictDoNothing({ target: [countryWishlist.userId, countryWishlist.country] })
    .returning()
  if (!entry) {
    return db.query.countryWishlist.findFirst({
      where: and(eq(countryWishlist.userId, userId), eq(countryWishlist.country, country)),
    })
  }
  return entry
}

export async function updateWishlistCountry(
  id: string,
  userId: string,
  data: { priority?: string; status?: string; notes?: string | null },
) {
  const set: Record<string, unknown> = { updatedAt: new Date() }
  if (data.priority !== undefined) set.priority = data.priority
  if (data.status !== undefined) set.status = data.status
  if (data.notes !== undefined) set.notes = data.notes
  const [entry] = await db
    .update(countryWishlist)
    .set(set)
    .where(and(eq(countryWishlist.id, id), eq(countryWishlist.userId, userId)))
    .returning()
  return entry
}

export async function removeWishlistCountry(id: string, userId: string) {
  await db.delete(countryWishlist).where(
    and(eq(countryWishlist.id, id), eq(countryWishlist.userId, userId)),
  )
}

export async function removeWishlistCountryByName(userId: string, country: string) {
  await db.delete(countryWishlist).where(
    and(eq(countryWishlist.userId, userId), eq(countryWishlist.country, country)),
  )
}

export async function getSetting(key: string): Promise<string | null> {
  const row = await db.query.appSettings.findFirst({
    where: eq(appSettings.key, key),
  })
  return row?.value ?? null
}

export async function getAllSettings(): Promise<Record<string, string>> {
  const rows = await db.query.appSettings.findMany()
  return Object.fromEntries(rows.map((r) => [r.key, r.value]))
}

export async function upsertSetting(key: string, value: string) {
  await db.insert(appSettings).values({ key, value, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: appSettings.key,
      set: { value, updatedAt: new Date() },
    })
}

export async function getSocialPreviewsByContactId(contactId: string, userId: string) {
  return db
    .select({
      id: socialPreviews.id,
      contactId: socialPreviews.contactId,
      platform: socialPreviews.platform,
      url: socialPreviews.url,
      title: socialPreviews.title,
      description: socialPreviews.description,
      imageUrl: socialPreviews.imageUrl,
      avatarUrl: socialPreviews.avatarUrl,
      followers: socialPreviews.followers,
      bio: socialPreviews.bio,
      extra: socialPreviews.extra,
      fetchedAt: socialPreviews.fetchedAt,
    })
    .from(socialPreviews)
    .innerJoin(contacts, eq(socialPreviews.contactId, contacts.id))
    .where(and(eq(socialPreviews.contactId, contactId), eq(contacts.userId, userId)))
}

export async function upsertSocialPreview(data: NewSocialPreview) {
  const [row] = await db
    .insert(socialPreviews)
    .values(data)
    .onConflictDoUpdate({
      target: [socialPreviews.contactId, socialPreviews.platform],
      set: {
        url: data.url,
        title: data.title,
        description: data.description,
        imageUrl: data.imageUrl,
        avatarUrl: data.avatarUrl,
        followers: data.followers,
        bio: data.bio,
        extra: data.extra,
        status: data.status,
        fetchedAt: new Date(),
      },
    })
    .returning()
  return row
}

export async function deleteSocialPreviewsByContactId(contactId: string) {
  await db.delete(socialPreviews).where(eq(socialPreviews.contactId, contactId))
}

export async function getInviterByCode(code: string) {
  const rows = await db
    .select({ invite: invites, inviterName: users.name })
    .from(invites)
    .innerJoin(users, eq(users.id, invites.createdBy))
    .where(eq(invites.code, code))
    .limit(1)
  return rows[0] ?? null
}

export async function getActiveInvitesByUserId(userId: string) {
  return db
    .select({ code: invites.code, expiresAt: invites.expiresAt, createdAt: invites.createdAt })
    .from(invites)
    .where(and(eq(invites.createdBy, userId), sql`${invites.usedBy} is null`, sql`${invites.expiresAt} > now()`))
    .orderBy(desc(invites.createdAt))
}

export async function getActiveInviteCount(userId: string): Promise<number> {
  const [{ count }] = await db
    .select({ count: sql<number>`cast(count(*) as int)` })
    .from(invites)
    .where(and(eq(invites.createdBy, userId), sql`${invites.usedBy} is null`, sql`${invites.expiresAt} > now()`))
  return count
}

export async function deleteExpiredInvite(userId: string) {
  await db
    .delete(invites)
    .where(and(eq(invites.createdBy, userId), sql`${invites.usedBy} is null`, sql`${invites.expiresAt} <= now()`))
}

export async function getUsedInviteCount(userId: string): Promise<number> {
  const [{ count }] = await db
    .select({ count: sql<number>`cast(count(*) as int)` })
    .from(users)
    .where(eq(users.invitedBy, userId))
  return count
}

export async function getInviteLimit(userId: string): Promise<number> {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { maxInvites: true },
  })
  if (user?.maxInvites != null) return user.maxInvites

  const setting = await getSetting(SETTING_KEY_MAX_INVITES)
  if (setting != null) {
    const parsed = parseInt(setting, 10)
    if (!isNaN(parsed)) return parsed
  }

  return DEFAULT_MAX_INVITES
}

export async function createInvite(userId: string, code: string, expiresAt: Date) {
  const [usedCount, activeCount, maxInvites] = await Promise.all([
    getUsedInviteCount(userId),
    getActiveInviteCount(userId),
    getInviteLimit(userId),
  ])
  if (usedCount + activeCount >= maxInvites) return { error: 'limit_reached' as const }

  await deleteExpiredInvite(userId)
  const rows = await db
    .insert(invites)
    .values({ createdBy: userId, code, expiresAt })
    .returning()
  return rows[0] ? { invite: rows[0] } : { error: 'insert_failed' as const }
}

export async function registerUser(data: { email: string; name: string; password: string }) {
  const id = crypto.randomUUID()
  const [user] = await db
    .insert(users)
    .values({ id, email: data.email, name: data.name, password: data.password })
    .onConflictDoNothing({ target: users.email })
    .returning({ id: users.id, email: users.email, name: users.name, role: users.role })
  return user ? { user } : { error: 'email_taken' as const }
}

export async function registerViaInvite(data: { email: string; name: string; password: string }, code: string) {
  return db.transaction(async (tx) => {
    const claimed = await tx
      .update(invites)
      .set({ usedAt: new Date() })
      .where(and(eq(invites.code, code), sql`${invites.usedBy} is null`, sql`${invites.expiresAt} > now()`))
      .returning({ id: invites.id, createdBy: invites.createdBy })
    if (!claimed.length) return { error: 'invalid_invite' as const }

    const invite = claimed[0]

    const existing = await tx.query.users.findFirst({
      where: eq(users.email, data.email),
      columns: { id: true },
    })
    if (existing) {
      await tx
        .update(invites)
        .set({ usedAt: null })
        .where(eq(invites.id, invite.id))
      return { error: 'email_taken' as const }
    }

    const id = crypto.randomUUID()
    const [user] = await tx
      .insert(users)
      .values({ id, email: data.email, name: data.name, password: data.password, invitedBy: invite.createdBy })
      .returning({ id: users.id, email: users.email, name: users.name, role: users.role })

    await tx
      .update(invites)
      .set({ usedBy: user.id })
      .where(eq(invites.id, invite.id))

    return { user }
  })
}

export async function getReferrer(userId: string) {
  const rows = await db
    .select({ name: users.name, image: users.image })
    .from(users)
    .where(
      sql`users.id = (SELECT "invited_by" FROM "users" WHERE "id" = ${userId})`
    )
    .limit(1)
  return rows[0] ?? null
}

export async function getAllInvitedUsers(userId: string) {
  return db
    .select({ id: users.id, name: users.name, image: users.image, createdAt: users.createdAt })
    .from(users)
    .where(eq(users.invitedBy, userId))
    .orderBy(desc(users.createdAt))
}

export async function writeAuditLog(entry: Omit<NewAuditLogEntry, 'id' | 'createdAt'>) {
  await db.insert(auditLog).values(entry).catch(() => {})
}

export async function createApiToken(data: { userId: string; name: string; tokenHash: string; tokenPrefix: string; scopes: string[]; expiresAt?: Date | null }) {
  const [row] = await db
    .insert(apiTokens)
    .values({
      userId: data.userId,
      name: data.name,
      tokenHash: data.tokenHash,
      tokenPrefix: data.tokenPrefix,
      scopes: data.scopes,
      expiresAt: data.expiresAt ?? null,
    })
    .returning({
      id: apiTokens.id,
      name: apiTokens.name,
      tokenPrefix: apiTokens.tokenPrefix,
      scopes: apiTokens.scopes,
      expiresAt: apiTokens.expiresAt,
      createdAt: apiTokens.createdAt,
    })
  return row
}

export async function getApiTokensByUserId(userId: string) {
  return db
    .select({
      id: apiTokens.id,
      name: apiTokens.name,
      tokenPrefix: apiTokens.tokenPrefix,
      scopes: apiTokens.scopes,
      lastUsedAt: apiTokens.lastUsedAt,
      expiresAt: apiTokens.expiresAt,
      createdAt: apiTokens.createdAt,
    })
    .from(apiTokens)
    .where(eq(apiTokens.userId, userId))
    .orderBy(desc(apiTokens.createdAt))
}

export async function deleteApiToken(id: string, userId: string) {
  const result = await db.delete(apiTokens).where(and(eq(apiTokens.id, id), eq(apiTokens.userId, userId)))
  return (result.rowCount ?? 0) > 0
}

export async function getApiTokenByHash(tokenHash: string) {
  return db.query.apiTokens.findFirst({
    where: eq(apiTokens.tokenHash, tokenHash),
  })
}

export async function touchApiTokenLastUsed(id: string) {
  await db
    .update(apiTokens)
    .set({ lastUsedAt: new Date() })
    .where(
      and(
        eq(apiTokens.id, id),
        sql`(${apiTokens.lastUsedAt} IS NULL OR ${apiTokens.lastUsedAt} < now() - interval '1 minute')`
      )
    )
    .catch(() => {})
}

export async function countRecentLoginFailures(email: string, windowMs: number): Promise<number> {
  const since = new Date(Date.now() - windowMs)
  const [{ count }] = await db
    .select({ count: sql<number>`cast(count(*) as int)` })
    .from(auditLog)
    .where(
      and(
        eq(auditLog.action, 'login_failure'),
        eq(auditLog.targetId, email),
        gte(auditLog.createdAt, since)
      )
    )
  return count
}

export async function getAuditLogs(page = 1, limit = 50) {
  const offset = (page - 1) * limit
  return db.query.auditLog.findMany({
    orderBy: (log, { desc: d }) => [d(log.createdAt)],
    limit,
    offset,
  })
}

// ---------------------------------------------------------------------------
// Password reset & email verification
// ---------------------------------------------------------------------------

export async function createPasswordResetToken(userId: string, tokenHash: string, expiresAt: Date, ip: string | null) {
  // Older outstanding links are invalidated so a leaked earlier email cannot be replayed
  // after the user has requested a fresh one.
  await db
    .update(passwordResetTokens)
    .set({ usedAt: new Date() })
    .where(and(eq(passwordResetTokens.userId, userId), isNull(passwordResetTokens.usedAt)))

  const [row] = await db
    .insert(passwordResetTokens)
    .values({ userId, tokenHash, expiresAt, requestedIp: ip })
    .returning()
  return row
}

export async function consumePasswordResetToken(tokenHash: string) {
  return db.transaction(async (tx) => {
    const [claimed] = await tx
      .update(passwordResetTokens)
      .set({ usedAt: new Date() })
      .where(
        and(
          eq(passwordResetTokens.tokenHash, tokenHash),
          isNull(passwordResetTokens.usedAt),
          gte(passwordResetTokens.expiresAt, new Date()),
        ),
      )
      .returning({ userId: passwordResetTokens.userId })
    return claimed ?? null
  })
}

export async function countRecentPasswordResets(userId: string, sinceMs: number) {
  const since = new Date(Date.now() - sinceMs)
  const [{ count }] = await db
    .select({ count: sql<number>`cast(count(*) as int)` })
    .from(passwordResetTokens)
    .where(and(eq(passwordResetTokens.userId, userId), gte(passwordResetTokens.createdAt, since)))
  return count
}

export async function createEmailVerificationToken(userId: string, email: string, tokenHash: string, expiresAt: Date) {
  await db
    .update(emailVerificationTokens)
    .set({ usedAt: new Date() })
    .where(and(eq(emailVerificationTokens.userId, userId), isNull(emailVerificationTokens.usedAt)))

  const [row] = await db
    .insert(emailVerificationTokens)
    .values({ userId, email, tokenHash, expiresAt })
    .returning()
  return row
}

export async function consumeEmailVerificationToken(tokenHash: string) {
  return db.transaction(async (tx) => {
    const [claimed] = await tx
      .update(emailVerificationTokens)
      .set({ usedAt: new Date() })
      .where(
        and(
          eq(emailVerificationTokens.tokenHash, tokenHash),
          isNull(emailVerificationTokens.usedAt),
          gte(emailVerificationTokens.expiresAt, new Date()),
        ),
      )
      .returning({ userId: emailVerificationTokens.userId, email: emailVerificationTokens.email })
    if (!claimed) return null

    // Only confirm if the address still matches the one the link was issued for —
    // otherwise changing the email after requesting would verify the wrong address.
    const [updated] = await tx
      .update(users)
      .set({ emailVerified: new Date() })
      .where(and(eq(users.id, claimed.userId), eq(users.email, claimed.email)))
      .returning({ id: users.id, email: users.email })
    return updated ?? null
  })
}

export async function getUserAuthState(id: string) {
  return db.query.users.findFirst({
    where: eq(users.id, id),
    columns: { id: true, email: true, name: true, emailVerified: true },
  })
}

export async function setUserPassword(userId: string, passwordHash: string) {
  const [row] = await db
    .update(users)
    .set({ password: passwordHash })
    .where(eq(users.id, userId))
    .returning({ id: users.id, email: users.email, name: users.name })
  return row ?? null
}



export async function purgeExpiredAuthTokens() {
  const now = new Date()
  const [reset, verification, buckets] = await Promise.all([
    db.delete(passwordResetTokens).where(lte(passwordResetTokens.expiresAt, now)),
    db.delete(emailVerificationTokens).where(lte(emailVerificationTokens.expiresAt, now)),
    db.delete(rateLimitBuckets).where(lte(rateLimitBuckets.resetAt, now)),
  ])
  return {
    passwordResetTokens: reset.rowCount ?? 0,
    emailVerificationTokens: verification.rowCount ?? 0,
    rateLimitBuckets: buckets.rowCount ?? 0,
  }
}

// ---------------------------------------------------------------------------
// Contact location history
// ---------------------------------------------------------------------------

export async function getLocationHistoryByUserId(userId: string, limit = 2000) {
  return db.query.contactLocationHistory.findMany({
    where: eq(contactLocationHistory.userId, userId),
    orderBy: (h, { desc: d }) => [d(h.observedAt)],
    limit,
  })
}

export async function getLocationHistoryByContactId(contactId: string, userId: string) {
  return db.query.contactLocationHistory.findMany({
    where: and(eq(contactLocationHistory.contactId, contactId), eq(contactLocationHistory.userId, userId)),
    orderBy: (h, { desc: d }) => [d(h.observedAt)],
  })
}

export async function recordContactLocation(entry: NewContactLocationHistoryEntry) {
  // Repeated saves of an unchanged location would bury the real moves, so only append
  // when the place actually differs from the latest known one.
  const [latest] = await db
    .select({ city: contactLocationHistory.city, country: contactLocationHistory.country })
    .from(contactLocationHistory)
    .where(eq(contactLocationHistory.contactId, entry.contactId))
    .orderBy(desc(contactLocationHistory.observedAt))
    .limit(1)

  if (latest && latest.city === entry.city && latest.country === entry.country) return null

  const [row] = await db.insert(contactLocationHistory).values(entry).returning()
  return row
}

export async function getInteractionDatesByUserId(userId: string) {
  const rows = await db
    .select({ contactId: interactions.contactId, date: interactions.date })
    .from(interactions)
    .innerJoin(contacts, eq(interactions.contactId, contacts.id))
    .where(eq(contacts.userId, userId))

  const map = new Map<string, Date[]>()
  for (const row of rows) {
    const list = map.get(row.contactId)
    if (list) list.push(row.date)
    else map.set(row.contactId, [row.date])
  }
  return map
}

// ---------------------------------------------------------------------------
// Retention
// ---------------------------------------------------------------------------

/** How long audit entries are kept before they are erased. */
export const AUDIT_LOG_RETENTION_DAYS = 400
/** Unused geocode cache rows are dropped after this long. */
export const GEOCODE_CACHE_RETENTION_DAYS = 365

export async function purgeExpiredRetentionData() {
  const auditCutoff = new Date(Date.now() - AUDIT_LOG_RETENTION_DAYS * 86_400_000)
  const geocodeCutoff = new Date(Date.now() - GEOCODE_CACHE_RETENTION_DAYS * 86_400_000)

  const [audit, geo, tokens] = await Promise.all([
    db.delete(auditLog).where(lt(auditLog.createdAt, auditCutoff)),
    db.delete(geocodeCache).where(lt(geocodeCache.createdAt, geocodeCutoff)),
    purgeExpiredAuthTokens(),
  ])

  return {
    auditLogRows: audit.rowCount ?? 0,
    geocodeCacheRows: geo.rowCount ?? 0,
    ...tokens,
  }
}

// ---------------------------------------------------------------------------
// Full-text search
// ---------------------------------------------------------------------------

export interface SearchHit {
  kind: 'contact' | 'interaction' | 'trip'
  id: string
  title: string
  subtitle: string | null
  snippet: string | null
  contactId: string | null
  date: Date | null
  rank: number
}

/**
 * Postgres full-text search over the places free text actually lives: contact fields and
 * notes, interaction notes, and trip notes. The `simple` dictionary is deliberate — the
 * data is multilingual, and English stemming would mangle non-English notes and names.
 *
 * The expressions here mirror the GIN indexes in migration 0017 exactly; changing one
 * without the other silently drops back to a sequential scan.
 */
export async function searchEverything(userId: string, rawQuery: string, limit = 25) {
  const query = rawQuery.trim()
  if (query.length < 2) return [] as SearchHit[]

  // websearch_to_tsquery accepts human input (quotes, OR, -) without throwing on syntax,
  // unlike to_tsquery which errors on a stray operator.
  const tsquery = sql`websearch_to_tsquery('simple', ${query})`
  const prefix = `%${query.toLowerCase()}%`

  // Mirrors contacts_search_idx exactly. Tags are excluded here for the same reason they
  // are excluded from the index (array_to_string is STABLE, not IMMUTABLE) and matched
  // separately through the array overlap operator instead.
  const contactDoc = sql`to_tsvector('simple',
    coalesce(${contacts.name}, '') || ' ' ||
    coalesce(${contacts.company}, '') || ' ' ||
    coalesce(${contacts.role}, '') || ' ' ||
    coalesce(${contacts.city}, '') || ' ' ||
    coalesce(${contacts.country}, '') || ' ' ||
    coalesce(${contacts.notes}, '') || ' ' ||
    coalesce(${contacts.metAt}, '')
  )`
  const tagMatch = sql`${contacts.tags} && array[${query.toLowerCase()}]::text[]`

  const contactRows = await db
    .select({
      id: contacts.id,
      name: contacts.name,
      company: contacts.company,
      role: contacts.role,
      city: contacts.city,
      country: contacts.country,
      notes: contacts.notes,
      updatedAt: contacts.updatedAt,
      // A short literal query should still match a name prefix ("ann" -> "Anna"), which
      // full-text alone will not do because it matches whole lexemes.
      rank: sql<number>`greatest(
        ts_rank(${contactDoc}, ${tsquery}),
        case when lower(${contacts.name}) like ${prefix} then 0.8 else 0 end,
        case when ${tagMatch} then 0.6 else 0 end
      )`,
    })
    .from(contacts)
    .where(
      and(
        eq(contacts.userId, userId),
        or(sql`${contactDoc} @@ ${tsquery}`, sql`lower(${contacts.name}) like ${prefix}`, tagMatch),
      ),
    )
    .orderBy(sql`4 desc`)
    .limit(limit)

  const interactionDoc = sql`to_tsvector('simple', coalesce(${interactions.notes}, '') || ' ' || coalesce(${interactions.location}, ''))`

  const interactionRows = await db
    .select({
      id: interactions.id,
      contactId: interactions.contactId,
      contactName: contacts.name,
      type: interactions.type,
      notes: interactions.notes,
      location: interactions.location,
      date: interactions.date,
      rank: sql<number>`ts_rank(${interactionDoc}, ${tsquery})`,
    })
    .from(interactions)
    .innerJoin(contacts, eq(interactions.contactId, contacts.id))
    .where(and(eq(contacts.userId, userId), sql`${interactionDoc} @@ ${tsquery}`))
    .orderBy(desc(interactions.date))
    .limit(limit)

  const tripDoc = sql`to_tsvector('simple', coalesce(${trips.city}, '') || ' ' || coalesce(${trips.country}, '') || ' ' || coalesce(${trips.notes}, ''))`

  const tripRows = await db
    .select({
      id: trips.id,
      city: trips.city,
      country: trips.country,
      notes: trips.notes,
      arrivalDate: trips.arrivalDate,
      rank: sql<number>`ts_rank(${tripDoc}, ${tsquery})`,
    })
    .from(trips)
    .where(and(eq(trips.userId, userId), sql`${tripDoc} @@ ${tsquery}`))
    .orderBy(desc(trips.arrivalDate))
    .limit(limit)

  const hits: SearchHit[] = [
    ...contactRows.map((r) => ({
      kind: 'contact' as const,
      id: r.id,
      title: r.name,
      subtitle: [r.role, r.company].filter(Boolean).join(' · ') || [r.city, r.country].filter(Boolean).join(', ') || null,
      snippet: r.notes ? r.notes.slice(0, 140) : null,
      contactId: r.id,
      date: r.updatedAt,
      // Contacts outrank the notes that mention them: searching a person's name should
      // land on the person, not on a meeting note quoting them.
      rank: Number(r.rank) + 1,
    })),
    ...interactionRows.map((r) => ({
      kind: 'interaction' as const,
      id: r.id,
      title: r.contactName,
      subtitle: [r.type, r.location].filter(Boolean).join(' · ') || null,
      snippet: r.notes ? r.notes.slice(0, 140) : null,
      contactId: r.contactId,
      date: r.date,
      rank: Number(r.rank) + 0.5,
    })),
    ...tripRows.map((r) => ({
      kind: 'trip' as const,
      id: r.id,
      title: [r.city, r.country].filter(Boolean).join(', '),
      subtitle: null,
      snippet: r.notes ? r.notes.slice(0, 140) : null,
      contactId: null,
      date: r.arrivalDate,
      rank: Number(r.rank),
    })),
  ]

  return hits.sort((a, b) => b.rank - a.rank || (b.date?.getTime() ?? 0) - (a.date?.getTime() ?? 0)).slice(0, limit)
}

// ---------------------------------------------------------------------------
// Onboarding progress
// ---------------------------------------------------------------------------

export interface OnboardingStatus {
  onboardedAt: Date | null
  dismissedAt: Date | null
  wizardStep: number
  steps: {
    profile: boolean
    contact: boolean
    trip: boolean
    interaction: boolean
    tag: boolean
    atlas: boolean
  }
  counts: { contacts: number; trips: number; visitedCountries: number }
}

/**
 * Checklist state is derived from the data itself rather than stored flags. Stored flags
 * drift (a user deletes their only contact and the step stays ticked) and, when kept in
 * localStorage as before, reset on every new device.
 */
export async function getOnboardingStatus(userId: string): Promise<OnboardingStatus> {
  const [user, progress, aggregates] = await Promise.all([
    db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: { onboardedAt: true, username: true, profileVisibility: true },
    }),
    db.query.onboardingProgress.findFirst({ where: eq(onboardingProgress.userId, userId) }),
    db
      .select({
        contacts: sql<number>`cast(count(*) filter (where ${contacts.isSelf} is not true) as int)`,
        selfContacts: sql<number>`cast(count(*) filter (where ${contacts.isSelf} is true) as int)`,
        tagged: sql<number>`cast(count(*) filter (where ${contacts.tags} is not null and array_length(${contacts.tags}, 1) > 0) as int)`,
      })
      .from(contacts)
      .where(eq(contacts.userId, userId)),
  ])

  const [tripCount] = await db
    .select({ count: sql<number>`cast(count(*) as int)` })
    .from(trips)
    .where(eq(trips.userId, userId))

  const [visitedCount] = await db
    .select({ count: sql<number>`cast(count(*) as int)` })
    .from(visitedCountries)
    .where(eq(visitedCountries.userId, userId))

  const [interactionCount] = await db
    .select({ count: sql<number>`cast(count(*) as int)` })
    .from(interactions)
    .innerJoin(contacts, eq(interactions.contactId, contacts.id))
    .where(eq(contacts.userId, userId))

  const agg = aggregates[0] ?? { contacts: 0, selfContacts: 0, tagged: 0 }

  return {
    onboardedAt: user?.onboardedAt ?? null,
    dismissedAt: progress?.dismissedAt ?? null,
    wizardStep: progress?.wizardStep ?? 0,
    steps: {
      profile: agg.selfContacts > 0,
      contact: agg.contacts > 0,
      trip: tripCount.count > 0 || visitedCount.count > 0,
      interaction: interactionCount.count > 0,
      tag: agg.tagged > 0,
      atlas: Boolean(user?.username) && user?.profileVisibility === 'public',
    },
    counts: {
      contacts: agg.contacts,
      trips: tripCount.count,
      visitedCountries: visitedCount.count,
    },
  }
}

export async function saveOnboardingProgress(
  userId: string,
  data: { wizardStep?: number; dismissed?: boolean },
) {
  const set: Record<string, unknown> = { updatedAt: new Date() }
  if (data.wizardStep !== undefined) set.wizardStep = data.wizardStep
  if (data.dismissed !== undefined) set.dismissedAt = data.dismissed ? new Date() : null

  const [row] = await db
    .insert(onboardingProgress)
    .values({
      userId,
      wizardStep: data.wizardStep ?? 0,
      dismissedAt: data.dismissed ? new Date() : null,
    })
    .onConflictDoUpdate({ target: onboardingProgress.userId, set })
    .returning()
  return row
}

// ---------------------------------------------------------------------------
// Server-side aggregates
// ---------------------------------------------------------------------------

export interface NetworkStats {
  contacts: number
  countries: number
  cities: number
  companies: number
  connections: number
  interactions: number
  trips: number
  visitedCountries: number
  wishlistCountries: number
  staleContacts: number
  overdueFollowUps: number
  topCountries: { country: string; count: number }[]
}

/**
 * Counts computed in SQL rather than by shipping every row to the browser and reducing it
 * there. These stay correct no matter how large the address book gets, and they are what
 * the dashboard header actually needs.
 */
export async function getNetworkStats(userId: string, staleDays = 90): Promise<NetworkStats> {
  const staleCutoff = new Date(Date.now() - staleDays * 86_400_000)

  const [contactAgg] = await db
    .select({
      contacts: sql<number>`cast(count(*) filter (where ${contacts.isSelf} is not true) as int)`,
      countries: sql<number>`cast(count(distinct ${contacts.country}) as int)`,
      cities: sql<number>`cast(count(distinct ${contacts.city}) as int)`,
      companies: sql<number>`cast(count(distinct ${contacts.company}) as int)`,
      stale: sql<number>`cast(count(*) filter (
        where ${contacts.isSelf} is not true
        and (${contacts.lastContactedAt} is null or ${contacts.lastContactedAt} < ${staleCutoff})
      ) as int)`,
      overdue: sql<number>`cast(count(*) filter (
        where ${contacts.nextFollowUp} is not null and ${contacts.nextFollowUp} < now()
      ) as int)`,
    })
    .from(contacts)
    .where(eq(contacts.userId, userId))

  const [connectionAgg] = await db
    .select({ count: sql<number>`cast(count(*) as int)` })
    .from(contactConnections)
    .where(eq(contactConnections.userId, userId))

  const [interactionAgg] = await db
    .select({ count: sql<number>`cast(count(*) as int)` })
    .from(interactions)
    .innerJoin(contacts, eq(interactions.contactId, contacts.id))
    .where(eq(contacts.userId, userId))

  const [tripAgg] = await db
    .select({ count: sql<number>`cast(count(*) as int)` })
    .from(trips)
    .where(eq(trips.userId, userId))

  const [visitedAgg] = await db
    .select({ count: sql<number>`cast(count(*) as int)` })
    .from(visitedCountries)
    .where(eq(visitedCountries.userId, userId))

  const [wishlistAgg] = await db
    .select({ count: sql<number>`cast(count(*) as int)` })
    .from(countryWishlist)
    .where(eq(countryWishlist.userId, userId))

  const topCountries = await db
    .select({
      country: contacts.country,
      count: sql<number>`cast(count(*) as int)`,
    })
    .from(contacts)
    .where(and(eq(contacts.userId, userId), sql`${contacts.country} is not null`))
    .groupBy(contacts.country)
    .orderBy(sql`2 desc`)
    .limit(10)

  return {
    contacts: contactAgg.contacts,
    countries: contactAgg.countries,
    cities: contactAgg.cities,
    companies: contactAgg.companies,
    connections: connectionAgg.count,
    interactions: interactionAgg.count,
    trips: tripAgg.count,
    visitedCountries: visitedAgg.count,
    wishlistCountries: wishlistAgg.count,
    staleContacts: contactAgg.stale,
    overdueFollowUps: contactAgg.overdue,
    topCountries: topCountries
      .filter((r): r is { country: string; count: number } => r.country !== null)
      .map((r) => ({ country: r.country, count: r.count })),
  }
}
