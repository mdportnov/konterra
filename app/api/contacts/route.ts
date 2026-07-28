import { after } from 'next/server'
import { auth } from '@/auth'
import { getContactsByUserId, createContact, deleteAllContactsByUserId, getOrCreateSelfContact, createConnection, upsertSocialPreview, writeAuditLog } from '@/lib/db/queries'
import { getClientIp } from '@/lib/rate-limit'
import { db } from '@/lib/db'
import { contacts as contactsTable } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { geocode } from '@/lib/geocoding'
import { validateContact, safeParseBody } from '@/lib/validation'
import { toStringOrNull, toDateOrNull, parsePagination, unauthorized, badRequest, success } from '@/lib/api-utils'
import { scrapeAllProfiles } from '@/lib/social/scraper'

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return unauthorized()

  const { searchParams } = new URL(req.url)
  const { page, limit } = parsePagination(searchParams)

  const result = await getContactsByUserId(session.user.id, page, limit)
  return success(result)
}

/**
 * Wipes the whole address book. Requires an explicit confirmation token in the body so a
 * stray or forged request cannot destroy everything with a bare DELETE.
 */
export async function DELETE(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return unauthorized()

  const body = await safeParseBody(req)
  if (body?.confirm !== 'DELETE_ALL_CONTACTS') {
    return badRequest('Confirmation required to delete all contacts')
  }

  const result = await deleteAllContactsByUserId(session.user.id)
  const deleted = result.rowCount ?? 0

  writeAuditLog({
    userId: session.user.id,
    action: 'bulk_delete',
    targetType: 'contact',
    ip: getClientIp(req),
    detail: `Deleted all contacts (${deleted})`,
  })

  return success({ deleted: true, count: deleted })
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return unauthorized()

  const body = await safeParseBody(req)
  if (!body) return badRequest('Invalid JSON body')

  const validationError = validateContact(body)
  if (validationError) return badRequest(validationError)

  let { lat, lng } = body as { lat?: number; lng?: number }

  if (!lat || !lng) {
    const locationQuery = [body.city, body.country].filter(Boolean).join(', ')
    if (locationQuery) {
      try {
        const result = await geocode(locationQuery)
        if (result) {
          lat = result.lat
          lng = result.lng
        }
      } catch (e) {
        console.error('Geocoding failed:', e)
      }
    }
  }

  const tags: string[] | null = Array.isArray(body.tags) ? body.tags as string[] : null

  const isSelf = body.isSelf === true

  let contact: Awaited<ReturnType<typeof createContact>>

  if (isSelf) {
    const existing = await getOrCreateSelfContact(session.user.id, body.name as string)
    const update: Record<string, unknown> = {
      name: body.name as string,
      country: toStringOrNull(body.country),
      city: toStringOrNull(body.city),
      timezone: toStringOrNull(body.timezone),
      lat: lat ?? null,
      lng: lng ?? null,
    }
    const [updated] = await db
      .update(contactsTable)
      .set(update)
      .where(eq(contactsTable.id, existing.id))
      .returning()
    contact = updated
  } else {
    contact = await createContact({
      userId: session.user.id,
      name: body.name as string,
      photo: toStringOrNull(body.photo),
      company: toStringOrNull(body.company),
      role: toStringOrNull(body.role),
      city: toStringOrNull(body.city),
      country: toStringOrNull(body.country),
      address: toStringOrNull(body.address),
      lat: lat ?? null,
      lng: lng ?? null,
      email: toStringOrNull(body.email),
      phone: toStringOrNull(body.phone),
      linkedin: toStringOrNull(body.linkedin),
      twitter: toStringOrNull(body.twitter),
      telegram: toStringOrNull(body.telegram),
      instagram: toStringOrNull(body.instagram),
      github: toStringOrNull(body.github),
      website: toStringOrNull(body.website),
      tags,
      notes: toStringOrNull(body.notes),
      meta: body.meta ?? null,
      secondaryLocations: Array.isArray(body.secondaryLocations) ? body.secondaryLocations as string[] : null,
      rating: typeof body.rating === 'number' ? body.rating : null,
      gender: toStringOrNull(body.gender) as 'male' | 'female' | null,
      relationshipType: toStringOrNull(body.relationshipType) as typeof import('@/lib/db/schema').contacts.$inferInsert.relationshipType,
      metAt: toStringOrNull(body.metAt),
      metDate: toDateOrNull(body.metDate),
      lastContactedAt: toDateOrNull(body.lastContactedAt),
      nextFollowUp: toDateOrNull(body.nextFollowUp),
      timezone: toStringOrNull(body.timezone),
      importSource: 'manual',
      isSelf: false,
    })
  }

  if (!isSelf) {
    try {
      const selfContact = await getOrCreateSelfContact(session.user.id, session.user.name ?? 'Me')
      await createConnection({
        userId: session.user.id,
        sourceContactId: selfContact.id,
        targetContactId: contact.id,
        connectionType: 'knows',
      })
    } catch (e) {
      console.error('Auto-connect error:', e)
    }
  }

  triggerEnrichment(contact)

  return success(contact, 201)
}

function triggerEnrichment(contact: Awaited<ReturnType<typeof createContact>>) {
  const hasSocial = contact.github || contact.website || contact.linkedin || contact.twitter || contact.instagram || contact.telegram
  if (!hasSocial) return
  // Serverless freezes the function once the response is returned, so a bare
  // fire-and-forget promise would often never finish. `after` keeps it alive.
  after(() => runEnrichment(contact))
}

function runEnrichment(contact: Awaited<ReturnType<typeof createContact>>) {
  return scrapeAllProfiles(contact).then((results) => {
    for (const r of results) {
      upsertSocialPreview({
        contactId: contact.id,
        platform: r.platform,
        url: r.url,
        title: r.title,
        description: r.description,
        imageUrl: r.imageUrl,
        avatarUrl: r.avatarUrl,
        followers: r.followers,
        bio: r.bio,
        extra: r.extra,
        status: r.status,
        fetchedAt: new Date(),
      }).catch((e) => console.error('Social preview upsert error:', e))
    }
  }).catch((e) => console.error('Enrichment error:', e))
}
