import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getOrCreateSelfContact } from '@/lib/db/queries'
import { db } from '@/lib/db'
import { contacts } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { unauthorized, badRequest } from '@/lib/api-utils'
import { geocode } from '@/lib/geocoding'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return unauthorized()

  const self = await getOrCreateSelfContact(session.user.id, session.user.name ?? 'Me')

  return NextResponse.json({
    city: self.city,
    country: self.country,
    timezone: self.timezone,
    lat: self.lat,
    lng: self.lng,
  })
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return unauthorized()

  let body: { city?: string; country?: string; timezone?: string; lat?: number; lng?: number }
  try {
    body = await req.json()
  } catch {
    return badRequest('Invalid JSON')
  }

  const self = await getOrCreateSelfContact(session.user.id, session.user.name ?? 'Me')

  const update: Record<string, unknown> = {}

  if (body.city !== undefined) update.city = body.city
  if (body.country !== undefined) update.country = body.country
  if (body.timezone !== undefined) update.timezone = body.timezone

  if (typeof body.lat === 'number' && typeof body.lng === 'number') {
    update.lat = body.lat
    update.lng = body.lng
  } else if (body.city) {
    const geo = await geocode(body.city + (body.country ? `, ${body.country}` : ''))
    if (geo) {
      update.lat = geo.lat
      update.lng = geo.lng
    }
  }

  if (Object.keys(update).length === 0) {
    return badRequest('No fields to update')
  }

  await db
    .update(contacts)
    .set(update)
    .where(and(eq(contacts.id, self.id), eq(contacts.userId, session.user.id)))

  return NextResponse.json({ updated: true, id: self.id })
}
