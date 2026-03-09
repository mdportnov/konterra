import { db } from './index'
import { users, contacts, interactions, contactConnections, contactCountryConnections, introductions, favors, visitedCountries, waitlist, tags, trips, countryWishlist, appSettings, socialPreviews, invites } from './schema'
import { and, arrayContains, desc, eq, inArray, isNotNull, or, sql } from 'drizzle-orm'
import type { NewContact, NewContactConnection, NewContactCountryConnection, NewIntroduction, NewFavor, NewTrip, NewCountryWishlistEntry, NewSocialPreview } from './schema'
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

export async function getUserProfile(id: string) {
  return db.query.users.findFirst({
    where: eq(users.id, id),
    columns: { id: true, email: true, name: true, image: true, role: true, username: true, bio: true, profileVisibility: true, profilePrivacyLevel: true, globeAutoRotate: true, createdAt: true },
  })
}

export async function getUserByUsername(username: string) {
  return db.query.users.findFirst({
    where: sql`lower(${users.username}) = ${username.toLowerCase()}`,
    columns: { id: true, name: true, image: true, username: true, bio: true, profileVisibility: true, profilePrivacyLevel: true, createdAt: true },
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
  return { countries, trips: tripsData }
}

export async function updateUserProfile(id: string, data: {
  name?: string
  image?: string | null
  username?: string | null
  bio?: string | null
  profileVisibility?: 'private' | 'public'
  profilePrivacyLevel?: 'countries_only' | 'full_travel'
  globeAutoRotate?: boolean
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
  let count = 0
  for (const id of ids) {
    const contact = await db.query.contacts.findFirst({
      where: and(eq(contacts.id, id), eq(contacts.userId, userId)),
      columns: { id: true, tags: true },
    })
    if (!contact) continue
    const currentTags = contact.tags || []
    if (currentTags.includes(tag)) continue
    await db.update(contacts).set({ tags: [...currentTags, tag], updatedAt: new Date() }).where(eq(contacts.id, id))
    count++
  }
  return count
}

export async function removeTagFromContactsBulk(ids: string[], userId: string, tag: string) {
  if (ids.length === 0) return 0
  let count = 0
  for (const id of ids) {
    const contact = await db.query.contacts.findFirst({
      where: and(eq(contacts.id, id), eq(contacts.userId, userId)),
      columns: { id: true, tags: true },
    })
    if (!contact) continue
    const currentTags = contact.tags || []
    if (!currentTags.includes(tag)) continue
    const updated = currentTags.filter((t) => t !== tag)
    await db.update(contacts).set({ tags: updated.length > 0 ? updated : null, updatedAt: new Date() }).where(eq(contacts.id, id))
    count++
  }
  return count
}

export async function getInteractionsByContactId(contactId: string) {
  return db.query.interactions.findMany({
    where: eq(interactions.contactId, contactId),
    orderBy: (interactions, { desc }) => [desc(interactions.date)],
  })
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
      if (data.date.getTime() > current) {
        await tx
          .update(contacts)
          .set({ lastContactedAt: data.date, updatedAt: new Date() })
          .where(eq(contacts.id, data.contactId))
      }
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
  const rows = await db.query.visitedCountries.findMany({
    where: eq(visitedCountries.userId, userId),
  })
  return rows.map((r) => r.country)
}

export async function addVisitedCountry(userId: string, country: string): Promise<string[]> {
  await db
    .insert(visitedCountries)
    .values({ userId, country })
    .onConflictDoNothing({ target: [visitedCountries.userId, visitedCountries.country] })
  return getVisitedCountries(userId)
}

export async function removeVisitedCountry(userId: string, country: string): Promise<string[]> {
  await db.delete(visitedCountries).where(
    and(eq(visitedCountries.userId, userId), eq(visitedCountries.country, country))
  )
  return getVisitedCountries(userId)
}

export async function setVisitedCountries(userId: string, countries: string[]): Promise<string[]> {
  return db.transaction(async (tx) => {
    await tx.delete(visitedCountries).where(eq(visitedCountries.userId, userId))
    if (countries.length > 0) {
      await tx.insert(visitedCountries).values(
        countries.map((country) => ({ userId, country }))
      )
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

export async function createConnection(data: NewContactConnection) {
  const [conn] = await db.insert(contactConnections).values(data).returning()
  return conn
}

export async function deleteConnection(id: string, userId: string) {
  await db.delete(contactConnections).where(
    and(eq(contactConnections.id, id), eq(contactConnections.userId, userId))
  )
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
  const BATCH_SIZE = 50
  return db.transaction(async (tx) => {
    const results: (typeof contactConnections.$inferSelect)[] = []
    for (let i = 0; i < data.length; i += BATCH_SIZE) {
      const batch = data.slice(i, i + BATCH_SIZE)
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

    await tx.delete(contacts).where(eq(contacts.id, loserId))

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
  const results: (typeof tags.$inferSelect)[] = []
  for (const t of tagData) {
    const tag = await createTag(userId, t.name, t.color ?? undefined)
    if (tag) results.push(tag)
  }
  return results
}

export async function addVisitedCountriesBulk(userId: string, countries: string[]) {
  if (countries.length === 0) return
  for (const country of countries) {
    await db
      .insert(visitedCountries)
      .values({ userId, country })
      .onConflictDoNothing({ target: [visitedCountries.userId, visitedCountries.country] })
  }
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
  const [trip] = await db.insert(trips).values(data).returning()
  return trip
}

export async function createTripsBulk(data: NewTrip[]) {
  if (data.length === 0) return []
  const BATCH_SIZE = 50
  return db.transaction(async (tx) => {
    const results: (typeof trips.$inferSelect)[] = []
    for (let i = 0; i < data.length; i += BATCH_SIZE) {
      const batch = data.slice(i, i + BATCH_SIZE)
      const rows = await tx.insert(trips).values(batch).returning()
      results.push(...rows)
    }
    return results
  })
}

export async function updateTrip(id: string, userId: string, data: Partial<Omit<NewTrip, 'id' | 'userId'>>) {
  const [trip] = await db
    .update(trips)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(trips.id, id), eq(trips.userId, userId)))
    .returning()
  return trip
}

export async function deleteTrip(id: string, userId: string) {
  await db.delete(trips).where(and(eq(trips.id, id), eq(trips.userId, userId)))
}

export async function deleteAllTrips(userId: string) {
  return db.delete(trips).where(eq(trips.userId, userId))
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
      usedInviteCount: sql<number>`cast((select count(*) from invites where invites.created_by = users.id and invites.used_by is not null) as int)`,
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
  const [userCount] = await db.select({ count: sql<number>`cast(count(*) as int)` }).from(users)
  const [contactCount] = await db.select({ count: sql<number>`cast(count(*) as int)` }).from(contacts)
  const [connectionCount] = await db.select({ count: sql<number>`cast(count(*) as int)` }).from(contactConnections)
  const [interactionCount] = await db.select({ count: sql<number>`cast(count(*) as int)` }).from(interactions)
  const [favorCount] = await db.select({ count: sql<number>`cast(count(*) as int)` }).from(favors)
  const [tripCount] = await db.select({ count: sql<number>`cast(count(*) as int)` }).from(trips)
  const [tagCount] = await db.select({ count: sql<number>`cast(count(*) as int)` }).from(tags)

  const usersWithStats = await db
    .select({
      userId: users.id,
      contactCount: sql<number>`cast(count(distinct contacts.id) as int)`,
    })
    .from(users)
    .leftJoin(contacts, eq(users.id, contacts.userId))
    .groupBy(users.id)

  const [waitlistPending] = await db
    .select({ count: sql<number>`cast(count(*) as int)` })
    .from(waitlist)
    .where(eq(waitlist.status, 'pending'))
  const [waitlistTotal] = await db
    .select({ count: sql<number>`cast(count(*) as int)` })
    .from(waitlist)

  return {
    totalUsers: userCount.count,
    totalContacts: contactCount.count,
    totalConnections: connectionCount.count,
    totalInteractions: interactionCount.count,
    totalFavors: favorCount.count,
    totalTrips: tripCount.count,
    totalTags: tagCount.count,
    avgContactsPerUser: userCount.count > 0 ? Math.round(contactCount.count / userCount.count) : 0,
    waitlistPending: waitlistPending.count,
    waitlistTotal: waitlistTotal.count,
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

export async function getSocialPreviewsByContactId(contactId: string) {
  return db.query.socialPreviews.findMany({
    where: eq(socialPreviews.contactId, contactId),
  })
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

export async function getInviteByCode(code: string) {
  return db.query.invites.findFirst({
    where: eq(invites.code, code),
  })
}

export async function getInviterByCode(code: string) {
  const rows = await db
    .select({ invite: invites, inviterName: users.name, inviterImage: users.image })
    .from(invites)
    .innerJoin(users, eq(users.id, invites.createdBy))
    .where(eq(invites.code, code))
    .limit(1)
  return rows[0] ?? null
}

export async function getActiveInviteByUserId(userId: string) {
  return db.query.invites.findFirst({
    where: and(eq(invites.createdBy, userId), sql`${invites.usedBy} is null`, sql`${invites.expiresAt} > now()`),
  })
}

export async function getInviteByUserId(userId: string) {
  return db.query.invites.findFirst({
    where: eq(invites.createdBy, userId),
    orderBy: desc(invites.createdAt),
  })
}

export async function deleteExpiredInvite(userId: string) {
  await db
    .delete(invites)
    .where(and(eq(invites.createdBy, userId), sql`${invites.usedBy} is null`, sql`${invites.expiresAt} <= now()`))
}

export async function getUsedInviteCount(userId: string): Promise<number> {
  const [{ count }] = await db
    .select({ count: sql<number>`cast(count(*) as int)` })
    .from(invites)
    .where(and(eq(invites.createdBy, userId), isNotNull(invites.usedBy)))
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
  const active = await getActiveInviteByUserId(userId)
  if (active) return { error: 'active_exists' as const }

  const [usedCount, maxInvites] = await Promise.all([
    getUsedInviteCount(userId),
    getInviteLimit(userId),
  ])
  if (usedCount >= maxInvites) return { error: 'limit_reached' as const }

  await deleteExpiredInvite(userId)
  const rows = await db
    .insert(invites)
    .values({ createdBy: userId, code, expiresAt })
    .returning()
  return rows[0] ? { invite: rows[0] } : { error: 'active_exists' as const }
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

export async function getInvitedUser(userId: string) {
  const rows = await db
    .select({ name: users.name, image: users.image, createdAt: users.createdAt })
    .from(invites)
    .innerJoin(users, eq(users.id, invites.usedBy))
    .where(eq(invites.createdBy, userId))
    .limit(1)
  return rows[0] ?? null
}
