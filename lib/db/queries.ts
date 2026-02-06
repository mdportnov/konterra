import { db } from './index'
import { contacts, interactions } from './schema'
import { eq, and } from 'drizzle-orm'
import type { NewContact } from './schema'

export async function getContactsByUserId(userId: string) {
  return db.query.contacts.findMany({
    where: eq(contacts.userId, userId),
    orderBy: (contacts, { desc }) => [desc(contacts.updatedAt)]
  })
}

export async function getContactById(id: string, userId: string) {
  return db.query.contacts.findFirst({
    where: and(eq(contacts.id, id), eq(contacts.userId, userId))
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

export async function getContactsWithCoords(userId: string) {
  return db.query.contacts.findMany({
    where: and(
      eq(contacts.userId, userId),
      // Only return contacts with coordinates
    ),
    columns: {
      id: true,
      name: true,
      photo: true,
      company: true,
      role: true,
      city: true,
      country: true,
      lat: true,
      lng: true,
      tags: true
    }
  })
}

export async function getInteractionsByContactId(contactId: string) {
  return db.query.interactions.findMany({
    where: eq(interactions.contactId, contactId),
    orderBy: (interactions, { desc }) => [desc(interactions.date)]
  })
}
