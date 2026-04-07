import { auth } from '@/auth'
import { deleteTrip, updateTrip } from '@/lib/db/queries'
import { unauthorized, badRequest, success } from '@/lib/api-utils'
import { safeParseBody } from '@/lib/validation'
import { geocode } from '@/lib/geocoding'

function parseDate(v: unknown): Date | null {
  if (!v || typeof v !== 'string') return null
  const d = new Date(v)
  return isNaN(d.getTime()) ? null : d
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return unauthorized()
  const { id } = await params

  const body = await safeParseBody(req)
  if (!body) return badRequest('Invalid JSON body')

  const data: Record<string, unknown> = {}
  if (body.city != null) data.city = String(body.city)
  if (body.country != null) data.country = String(body.country)
  if (body.arrivalDate !== undefined) {
    const d = parseDate(body.arrivalDate)
    if (!d) return badRequest('Invalid arrivalDate')
    data.arrivalDate = d
  }
  if (body.departureDate !== undefined) {
    data.departureDate = parseDate(body.departureDate)
  }
  if (data.arrivalDate && data.departureDate && (data.departureDate as Date) < (data.arrivalDate as Date)) {
    return badRequest('departureDate must be on or after arrivalDate')
  }
  if (body.durationDays !== undefined) {
    data.durationDays = typeof body.durationDays === 'number' ? body.durationDays : null
  }
  if (body.notes !== undefined) {
    data.notes = typeof body.notes === 'string' ? body.notes : null
  }

  if (data.city || data.country) {
    const city = typeof data.city === 'string' ? data.city : (typeof body.city === 'string' ? body.city : null)
    const country = typeof data.country === 'string' ? data.country : (typeof body.country === 'string' ? body.country : null)
    if (city && country) {
      const result = await geocode(`${city}, ${country}`)
      if (result) {
        data.lat = result.lat
        data.lng = result.lng
      }
    }
  }

  if (body.lat !== undefined) data.lat = typeof body.lat === 'number' ? body.lat : null
  if (body.lng !== undefined) data.lng = typeof body.lng === 'number' ? body.lng : null

  const trip = await updateTrip(id, session.user.id, data)
  if (!trip) return badRequest('Trip not found')
  return success(trip)
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return unauthorized()
  const { id } = await params
  await deleteTrip(id, session.user.id)
  return success({ deleted: true })
}
