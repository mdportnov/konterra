import { auth } from '@/auth'
import { unauthorized, badRequest, notFound, success, serverError } from '@/lib/api-utils'
import { safeParseBody, validateMaxLength, MAX_SHORT_TEXT_LENGTH } from '@/lib/validation'
import {
  getContactById,
  getLocationHistoryByContactId,
  recordContactLocation,
  updateContact,
} from '@/lib/db/queries'
import { toStringOrNull } from '@/lib/api-utils'
import { geocode } from '@/lib/geocoding'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return unauthorized()
  const { id } = await params

  const contact = await getContactById(id, session.user.id)
  if (!contact) return notFound('Contact')

  return success(await getLocationHistoryByContactId(id, session.user.id))
}

/**
 * Appends a sighting. Used for backfilling where someone used to be, which is what turns
 * past crossings from guesswork into something the overlap engine can compute.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return unauthorized()
  const { id } = await params

  try {
    const contact = await getContactById(id, session.user.id)
    if (!contact) return notFound('Contact')

    const body = await safeParseBody(req)
    if (!body) return badRequest('Invalid JSON body')

    const country = toStringOrNull(body.country)
    if (!country) return badRequest('country is required')

    const city = toStringOrNull(body.city)
    const lengthError = validateMaxLength(country, MAX_SHORT_TEXT_LENGTH, 'country')
      || validateMaxLength(city, MAX_SHORT_TEXT_LENGTH, 'city')
    if (lengthError) return badRequest(lengthError)

    let observedAt = new Date()
    if (body.observedAt !== undefined) {
      const parsed = new Date(body.observedAt as string)
      if (isNaN(parsed.getTime())) return badRequest('Invalid observedAt')
      if (parsed.getTime() > Date.now() + 86_400_000) return badRequest('observedAt cannot be in the future')
      observedAt = parsed
    }

    let lat = typeof body.lat === 'number' ? body.lat : null
    let lng = typeof body.lng === 'number' ? body.lng : null
    if (lat === null) {
      const result = await geocode([city, country].filter(Boolean).join(', ')).catch(() => null)
      if (result) {
        lat = result.lat
        lng = result.lng
      }
    }

    const entry = await recordContactLocation({
      userId: session.user.id,
      contactId: id,
      city,
      country,
      lat,
      lng,
      source: toStringOrNull(body.source) ?? 'manual',
      observedAt,
    })

    // A sighting that is the newest one also becomes the contact's current location.
    const existing = contact.currentLocationUpdatedAt ? new Date(contact.currentLocationUpdatedAt) : null
    if (!existing || observedAt >= existing) {
      await updateContact(id, session.user.id, {
        currentCity: city,
        currentCountry: country,
        currentLat: lat,
        currentLng: lng,
        currentLocationUpdatedAt: observedAt,
      })
    }

    return success(entry ?? { unchanged: true }, entry ? 201 : 200)
  } catch (err) {
    console.error('[POST /api/contacts/[id]/locations]', err)
    return serverError('Failed to record location')
  }
}
