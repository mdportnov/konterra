import { db } from './index'
import { users, contacts, interactions, contactConnections, contactCountryConnections, introductions, favors, visitedCountries, waitlist, tags } from './schema'
import { eq, and, or, desc, sql, arrayContains, inArray } from 'drizzle-orm'
import type { NewContact, NewContactConnection, NewContactCountryConnection, NewIntroduction, NewFavor } from './schema'

export async function deleteAllContactsByUserId(userId: string) {
  return db.delete(contacts).where(eq(contacts.userId, userId))
}

export async function getUserByEmail(email: string) {
  return db.query.users.findFirst({
    where: eq(users.email, email),
    columns: { id: true, email: true, name: true, password: true },
  })
}

export async function createWaitlistEntry(data: { email: string; name: string; message?: string }) {
  await db
    .insert(waitlist)
    .values(data)
    .onConflictDoNothing({ target: waitlist.email })
}

export async function getUserById(id: string) {
  return db.query.users.findFirst({
    where: eq(users.id, id),
    columns: { id: true, email: true, name: true, image: true },
  })
}

export async function upsertUser(id: string, email: string, name: string, password: string) {
  const [row] = await db
    .insert(users)
    .values({ id, email, name, password })
    .onConflictDoNothing({ target: users.id })
    .returning()
  return row ?? db.query.users.findFirst({ where: eq(users.id, id) })
}

export async function updateUserProfile(id: string, data: { name?: string; image?: string | null }) {
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
  })
}

export async function createCountryConnection(data: NewContactCountryConnection) {
  const [conn] = await db.insert(contactCountryConnections).values(data).returning()
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
