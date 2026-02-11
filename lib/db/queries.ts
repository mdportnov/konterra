import { db } from './index'
import { users, contacts, interactions, contactConnections, contactCountryConnections, introductions, favors, visitedCountries, waitlist, tags } from './schema'
import { eq, and, or, desc, sql, arrayContains } from 'drizzle-orm'
import type { NewContact, NewContactConnection, NewContactCountryConnection, NewIntroduction, NewFavor } from './schema'

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
      orderBy: (contacts, { desc }) => [desc(contacts.updatedAt)],
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
  const [intro] = await db.insert(introductions).values(data).returning()
  return intro
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

export async function createContactsBulk(data: NewContact[]) {
  if (data.length === 0) return []
  return db.insert(contacts).values(data).returning()
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

export async function deleteCountryConnection(id: string, userId: string) {
  await db.delete(contactCountryConnections).where(
    and(eq(contactCountryConnections.id, id), eq(contactCountryConnections.userId, userId))
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

  const userContacts = await db.query.contacts.findMany({
    where: and(eq(contacts.userId, userId), arrayContains(contacts.tags, [tag.name])),
    columns: { id: true, tags: true },
  })

  await db.transaction(async (tx) => {
    for (const c of userContacts) {
      const updated = (c.tags || []).filter((t) => t !== tag.name)
      await tx
        .update(contacts)
        .set({ tags: updated.length > 0 ? updated : null })
        .where(eq(contacts.id, c.id))
    }
    await tx.delete(tags).where(and(eq(tags.id, id), eq(tags.userId, userId)))
  })

  return tag
}

export async function renameTag(id: string, userId: string, newName: string) {
  const tag = await db.query.tags.findFirst({
    where: and(eq(tags.id, id), eq(tags.userId, userId)),
  })
  if (!tag) return null

  const oldName = tag.name

  const userContacts = await db.query.contacts.findMany({
    where: and(eq(contacts.userId, userId), arrayContains(contacts.tags, [oldName])),
    columns: { id: true, tags: true },
  })

  return db.transaction(async (tx) => {
    for (const c of userContacts) {
      const updated = (c.tags || []).map((t) => (t === oldName ? newName : t))
      await tx.update(contacts).set({ tags: updated }).where(eq(contacts.id, c.id))
    }
    const [updated] = await tx
      .update(tags)
      .set({ name: newName })
      .where(and(eq(tags.id, id), eq(tags.userId, userId)))
      .returning()
    return updated
  })
}
