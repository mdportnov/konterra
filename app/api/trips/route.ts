import { auth } from '@/auth'
import { getTripsByUserId, createTrip, createTripsBulk, deleteAllTrips } from '@/lib/db/queries'
import { unauthorized, badRequest, success } from '@/lib/api-utils'
import { safeParseBody, validateMaxLength, MAX_SHORT_TEXT_LENGTH, MAX_NOTES_LENGTH } from '@/lib/validation'
import type { NewTrip } from '@/lib/db/schema'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return unauthorized()
  const trips = await getTripsByUserId(session.user.id)
  return success(trips)
}

function parseDate(v: unknown): Date | null {
  if (!v || typeof v !== 'string') return null
  const d = new Date(v)
  return isNaN(d.getTime()) ? null : d
}

const MAX_BULK_TRIPS = 500

// durationDays is derived from the dates server-side so it can never drift out of
// sync with arrival/departure (clients and importers must not be trusted for it).
function computeDurationDays(arrival: Date, departure: Date | null): number | null {
  if (!departure) return null
  return Math.round((departure.getTime() - arrival.getTime()) / 86_400_000)
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return unauthorized()

  const body = await safeParseBody(req)
  if (!body) return badRequest('Invalid JSON body')

  if (Array.isArray(body.trips)) {
    if (body.trips.length > MAX_BULK_TRIPS) {
      return badRequest(`Maximum ${MAX_BULK_TRIPS} trips per request`)
    }
    const rawCount = body.trips.length
    const tripsData: NewTrip[] = []
    for (const t of body.trips as Record<string, unknown>[]) {
      const arrival = parseDate(t.arrivalDate)
      if (!arrival || !t.city || !t.country) continue
      const departure = parseDate(t.departureDate)
      if (departure && departure < arrival) continue
      if (String(t.city).length > MAX_SHORT_TEXT_LENGTH || String(t.country).length > MAX_SHORT_TEXT_LENGTH) continue
      if (typeof t.notes === 'string' && t.notes.length > MAX_NOTES_LENGTH) continue
      tripsData.push({
        userId: session.user!.id,
        arrivalDate: arrival,
        departureDate: departure,
        durationDays: computeDurationDays(arrival, departure),
        city: String(t.city),
        country: String(t.country),
        lat: typeof t.lat === 'number' ? t.lat : null,
        lng: typeof t.lng === 'number' ? t.lng : null,
        notes: typeof t.notes === 'string' ? t.notes : null,
      })
    }
    if (tripsData.length === 0) return badRequest('No valid trips in payload')
    const created = await createTripsBulk(tripsData)
    return success({ created: created.length, skipped: rawCount - tripsData.length })
  }

  if (!body.city || !body.country || !body.arrivalDate) {
    return badRequest('city, country, and arrivalDate are required')
  }

  const arrivalDate = parseDate(body.arrivalDate)
  if (!arrivalDate) return badRequest('Invalid arrivalDate')
  const departureDate = parseDate(body.departureDate)
  if (departureDate && departureDate < arrivalDate) return badRequest('departureDate must be on or after arrivalDate')

  const validationError = validateMaxLength(body.city, MAX_SHORT_TEXT_LENGTH, 'city')
    || validateMaxLength(body.country, MAX_SHORT_TEXT_LENGTH, 'country')
    || validateMaxLength(body.notes, MAX_NOTES_LENGTH, 'notes')
  if (validationError) return badRequest(validationError)

  const trip = await createTrip({
    userId: session.user.id,
    arrivalDate,
    departureDate,
    durationDays: computeDurationDays(arrivalDate, departureDate),
    city: String(body.city),
    country: String(body.country),
    lat: typeof body.lat === 'number' ? body.lat : null,
    lng: typeof body.lng === 'number' ? body.lng : null,
    notes: typeof body.notes === 'string' ? body.notes : null,
  })
  return success(trip, 201)
}

export async function DELETE() {
  const session = await auth()
  if (!session?.user?.id) return unauthorized()
  await deleteAllTrips(session.user.id)
  return success({ deleted: true })
}
