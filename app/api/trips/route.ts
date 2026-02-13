import { auth } from '@/auth'
import { getTripsByUserId, createTrip, createTripsBulk, deleteAllTrips } from '@/lib/db/queries'
import { unauthorized, badRequest, success } from '@/lib/api-utils'
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

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return unauthorized()

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return badRequest('Invalid JSON body')
  }

  if (Array.isArray(body.trips)) {
    const tripsData: NewTrip[] = []
    for (const t of body.trips as Record<string, unknown>[]) {
      const arrival = parseDate(t.arrivalDate)
      if (!arrival || !t.city || !t.country) continue
      tripsData.push({
        userId: session.user!.id,
        arrivalDate: arrival,
        departureDate: parseDate(t.departureDate),
        durationDays: typeof t.durationDays === 'number' ? t.durationDays : null,
        city: String(t.city),
        country: String(t.country),
        lat: typeof t.lat === 'number' ? t.lat : null,
        lng: typeof t.lng === 'number' ? t.lng : null,
        notes: typeof t.notes === 'string' ? t.notes : null,
      })
    }
    if (tripsData.length === 0) return badRequest('No valid trips in payload')
    const created = await createTripsBulk(tripsData)
    return success({ created: created.length })
  }

  if (!body.city || !body.country || !body.arrivalDate) {
    return badRequest('city, country, and arrivalDate are required')
  }

  const arrivalDate = parseDate(body.arrivalDate)
  if (!arrivalDate) return badRequest('Invalid arrivalDate')

  const trip = await createTrip({
    userId: session.user.id,
    arrivalDate,
    departureDate: parseDate(body.departureDate),
    durationDays: typeof body.durationDays === 'number' ? body.durationDays : null,
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
