import { auth } from '@/auth'
import { getContactsByUserId, createContact, deleteAllContactsByUserId, getOrCreateSelfContact, createConnection } from '@/lib/db/queries'
import { geocode } from '@/lib/geocoding'
import { validateContact, safeParseBody } from '@/lib/validation'
import { toStringOrNull, toDateOrNull, parsePagination, unauthorized, badRequest, success } from '@/lib/api-utils'

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return unauthorized()

  const { searchParams } = new URL(req.url)
  const { page, limit } = parsePagination(searchParams)

  const result = await getContactsByUserId(session.user.id, page, limit)
  return success(result)
}

export async function DELETE() {
  const session = await auth()
  if (!session?.user?.id) return unauthorized()

  await deleteAllContactsByUserId(session.user.id)
  return success({ deleted: true })
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

  const contact = await createContact({
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
    isSelf,
  })

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

  return success(contact, 201)
}
