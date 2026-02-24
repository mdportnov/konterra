import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { createContactsBulk, updateContact, getOrCreateSelfContact, createConnectionsBulk, deleteContactsBulk, addTagToContactsBulk, removeTagFromContactsBulk } from '@/lib/db/queries'
import { validateContact, safeParseBody } from '@/lib/validation'
import { toStringOrNull, toDateOrNull, toArrayOrNull, toNumberOrNull, unauthorized, badRequest, success } from '@/lib/api-utils'
import { getCountryCoords } from '@/lib/country-coords'
import type { NewContact, NewContactConnection } from '@/lib/db/schema'

interface BulkItem {
  action: 'create' | 'update' | 'skip'
  contact: Record<string, unknown>
  existingId?: string
}

function buildNewContactData(userId: string, c: Record<string, unknown>): NewContact {
  const country = toStringOrNull(c.country)
  const hasCoords = typeof c.lat === 'number' && typeof c.lng === 'number'
  const coords = hasCoords ? { lat: c.lat as number, lng: c.lng as number } : (country ? getCountryCoords(country) : null)
  return {
    userId,
    name: c.name as string,
    photo: toStringOrNull(c.photo),
    company: toStringOrNull(c.company),
    role: toStringOrNull(c.role),
    city: toStringOrNull(c.city),
    country,
    address: toStringOrNull(c.address),
    lat: coords?.lat ?? null,
    lng: coords?.lng ?? null,
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
    meta: c.meta ?? null,
    secondaryLocations: toArrayOrNull(c.secondaryLocations),
    rating: toNumberOrNull(c.rating),
    gender: toStringOrNull(c.gender) as 'male' | 'female' | null,
    relationshipType: toStringOrNull(c.relationshipType) as NewContact['relationshipType'],
    metAt: toStringOrNull(c.metAt),
    metDate: c.metDate ? toDateOrNull(c.metDate) : null,
    lastContactedAt: c.lastContactedAt ? toDateOrNull(c.lastContactedAt) : null,
    nextFollowUp: c.nextFollowUp ? toDateOrNull(c.nextFollowUp) : null,
    communicationStyle: toStringOrNull(c.communicationStyle) as NewContact['communicationStyle'],
    preferredChannel: toStringOrNull(c.preferredChannel) as NewContact['preferredChannel'],
    responseSpeed: toStringOrNull(c.responseSpeed) as NewContact['responseSpeed'],
    timezone: toStringOrNull(c.timezone),
    language: toStringOrNull(c.language),
    birthday: c.birthday ? toDateOrNull(c.birthday) : null,
    personalInterests: toArrayOrNull(c.personalInterests),
    professionalGoals: toArrayOrNull(c.professionalGoals),
    painPoints: toArrayOrNull(c.painPoints),
    influenceLevel: toNumberOrNull(c.influenceLevel),
    networkReach: toNumberOrNull(c.networkReach),
    trustLevel: toNumberOrNull(c.trustLevel),
    loyaltyIndicator: toStringOrNull(c.loyaltyIndicator) as NewContact['loyaltyIndicator'],
    financialCapacity: toStringOrNull(c.financialCapacity) as NewContact['financialCapacity'],
    motivations: toArrayOrNull(c.motivations),
    importSource: toStringOrNull(c.importSource),
  }
}

const UPDATABLE_FIELDS = [
  'name', 'email', 'phone', 'company', 'role', 'city', 'country', 'address',
  'website', 'notes', 'telegram', 'linkedin', 'twitter', 'instagram',
  'github', 'timezone', 'gender', 'tags', 'birthday', 'photo', 'metAt',
  'relationshipType', 'communicationStyle', 'preferredChannel', 'responseSpeed',
  'language', 'loyaltyIndicator', 'financialCapacity',
] as const

const DATE_FIELDS = new Set(['birthday', 'metDate', 'lastContactedAt', 'nextFollowUp'])
const ARRAY_FIELDS = new Set(['tags', 'secondaryLocations', 'personalInterests', 'professionalGoals', 'painPoints', 'motivations'])
const NUMBER_FIELDS = new Set(['rating', 'influenceLevel', 'networkReach', 'trustLevel'])

function buildUpdateData(c: Record<string, unknown>): Partial<NewContact> {
  const data: Record<string, unknown> = {}
  const allFields = [...UPDATABLE_FIELDS, 'metDate', 'lastContactedAt', 'nextFollowUp',
    'secondaryLocations', 'personalInterests', 'professionalGoals', 'painPoints',
    'motivations', 'rating', 'influenceLevel', 'networkReach', 'trustLevel'] as const

  for (const field of allFields) {
    if (!(field in c) || c[field] === undefined) continue

    if (DATE_FIELDS.has(field)) {
      data[field] = c[field] ? toDateOrNull(c[field]) : null
    } else if (ARRAY_FIELDS.has(field)) {
      data[field] = Array.isArray(c[field]) ? c[field] : null
    } else if (NUMBER_FIELDS.has(field)) {
      data[field] = toNumberOrNull(c[field])
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
      console.error('Bulk create error:', e)
      let msg = 'Unknown error'
      if (e instanceof Error) {
        const cause = (e as { cause?: { message?: string } }).cause
        msg = cause?.message || e.message
      }
      if (msg.includes('Failed query:')) msg = msg.slice(0, msg.indexOf('Failed query:')).trim() || msg.slice(0, 200)
      errors.push(`Bulk create failed: ${msg.slice(0, 300)}`)
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

  let connectionsCreated = 0
  if (created > 0) {
    try {
      const selfContact = await getOrCreateSelfContact(userId, session.user.name ?? 'Me')
      const connData: NewContactConnection[] = (allContacts as { id: string }[])
        .filter((c) => c.id !== selfContact.id)
        .map((c) => ({
          userId,
          sourceContactId: selfContact.id,
          targetContactId: c.id,
          connectionType: 'knows' as const,
        }))
      const conns = await createConnectionsBulk(connData)
      connectionsCreated = conns.length
    } catch (e) {
      console.error('Auto-connect error:', e)
    }
  }

  return NextResponse.json({
    created,
    updated,
    skipped,
    errors,
    contacts: allContacts,
    connectionsCreated,
  })
}

export async function DELETE(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return unauthorized()

  const body = await safeParseBody(req)
  if (!body || !Array.isArray(body.ids)) return badRequest('Expected { ids: string[] }')
  if (body.ids.length > 500) return badRequest('Maximum 500 items per request')

  const deleted = await deleteContactsBulk(body.ids as string[], session.user.id)
  return success({ deleted })
}

export async function PATCH(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return unauthorized()

  const body = await safeParseBody(req)
  if (!body || !Array.isArray(body.ids)) return badRequest('Expected { ids: string[], action, tag }')
  if (body.ids.length > 500) return badRequest('Maximum 500 items per request')

  const ids = body.ids as string[]
  const action = body.action as string
  const tag = body.tag as string

  if (action === 'addTag' && tag) {
    const count = await addTagToContactsBulk(ids, session.user.id, tag)
    return success({ updated: count })
  }

  if (action === 'removeTag' && tag) {
    const count = await removeTagFromContactsBulk(ids, session.user.id, tag)
    return success({ updated: count })
  }

  return badRequest('Invalid action. Supported: addTag, removeTag')
}
