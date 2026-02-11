import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { createContactsBulk, updateContact } from '@/lib/db/queries'
import { validateContact, safeParseBody } from '@/lib/validation'
import { toStringOrNull, toDateOrNull, unauthorized, badRequest } from '@/lib/api-utils'
import type { NewContact } from '@/lib/db/schema'

interface BulkItem {
  action: 'create' | 'update' | 'skip'
  contact: Record<string, unknown>
  existingId?: string
}

function buildNewContactData(userId: string, c: Record<string, unknown>): NewContact {
  return {
    userId,
    name: c.name as string,
    photo: toStringOrNull(c.photo),
    company: toStringOrNull(c.company),
    role: toStringOrNull(c.role),
    city: toStringOrNull(c.city),
    country: toStringOrNull(c.country),
    address: toStringOrNull(c.address),
    lat: null,
    lng: null,
    email: toStringOrNull(c.email),
    phone: toStringOrNull(c.phone),
    linkedin: toStringOrNull(c.linkedin),
    twitter: toStringOrNull(c.twitter),
    telegram: toStringOrNull(c.telegram),
    instagram: toStringOrNull(c.instagram),
    github: toStringOrNull(c.github),
    website: toStringOrNull(c.website),
    tags: Array.isArray(c.tags) ? c.tags as string[] : null,
    notes: toStringOrNull(c.notes),
    meta: null,
    secondaryLocations: null,
    rating: typeof c.rating === 'number' ? c.rating : null,
    gender: toStringOrNull(c.gender) as 'male' | 'female' | null,
    relationshipType: null,
    metAt: null,
    metDate: null,
    lastContactedAt: null,
    nextFollowUp: null,
    timezone: toStringOrNull(c.timezone),
    birthday: c.birthday ? toDateOrNull(c.birthday) : null,
  }
}

const UPDATABLE_FIELDS = [
  'name', 'email', 'phone', 'company', 'role', 'city', 'country', 'address',
  'website', 'notes', 'telegram', 'linkedin', 'twitter', 'instagram',
  'github', 'timezone', 'gender', 'tags', 'birthday',
] as const

function buildUpdateData(c: Record<string, unknown>): Partial<NewContact> {
  const data: Record<string, unknown> = {}

  for (const field of UPDATABLE_FIELDS) {
    if (!(field in c) || c[field] === undefined) continue

    if (field === 'tags') {
      data[field] = Array.isArray(c[field]) ? c[field] : null
    } else if (field === 'gender') {
      data[field] = toStringOrNull(c[field]) as 'male' | 'female' | null
    } else if (field === 'birthday') {
      data[field] = c[field] ? toDateOrNull(c[field]) : null
    } else {
      data[field] = toStringOrNull(c[field])
    }
  }

  return data as Partial<NewContact>
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return unauthorized()

  const body = await safeParseBody(req)
  if (!body || !Array.isArray(body.items)) return badRequest('Invalid request body')

  const items = body.items as BulkItem[]
  if (items.length > 500) {
    return NextResponse.json({ error: 'Maximum 500 items per request' }, { status: 400 })
  }

  const userId = session.user.id
  let created = 0
  let updated = 0
  let skipped = 0
  const errors: string[] = []
  const allContacts: unknown[] = []

  const toCreate: NewContact[] = []
  const toUpdate: { id: string; data: Partial<NewContact> }[] = []

  for (const item of items) {
    if (item.action === 'skip') {
      skipped++
      continue
    }

    const err = validateContact(item.contact)
    if (err) {
      errors.push(`${item.contact.name || 'Unknown'}: ${err}`)
      continue
    }

    if (item.action === 'create') {
      toCreate.push(buildNewContactData(userId, item.contact))
    } else if (item.action === 'update' && item.existingId) {
      toUpdate.push({ id: item.existingId, data: buildUpdateData(item.contact) })
    }
  }

  if (toCreate.length > 0) {
    try {
      const results = await createContactsBulk(toCreate)
      allContacts.push(...results)
      created = results.length
    } catch (e) {
      const raw = e instanceof Error ? e.message : 'Unknown error'
      const msg = raw.includes('Failed query:') ? raw.slice(0, raw.indexOf('Failed query:')) : raw
      errors.push(`Bulk create failed: ${msg.trim() || raw.slice(0, 200)}`)
    }
  }

  for (const { id, data } of toUpdate) {
    try {
      const result = await updateContact(id, userId, data)
      if (result) {
        allContacts.push(result)
        updated++
      }
    } catch (e) {
      errors.push(`Update ${id} failed: ${e instanceof Error ? e.message : 'Unknown error'}`)
    }
  }

  return NextResponse.json({
    created,
    updated,
    skipped,
    errors,
    contacts: allContacts,
  })
}
