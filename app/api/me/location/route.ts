import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getOrCreateSelfContact } from '@/lib/db/queries'
import { db } from '@/lib/db'
import { contacts } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { unauthorized, badRequest } from '@/lib/api-utils'
import { safeParseBody } from '@/lib/validation'
import { geocode, reverseGeocode } from '@/lib/geocoding'

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
    currentCity: self.currentCity,
    currentCountry: self.currentCountry,
    currentLat: self.currentLat,
    currentLng: self.currentLng,
    currentLocationUpdatedAt: self.currentLocationUpdatedAt,
  })
}

export async function DELETE() {
  const session = await auth()
  if (!session?.user?.id) return unauthorized()

  const self = await getOrCreateSelfContact(session.user.id, session.user.name ?? 'Me')

  await db
    .update(contacts)
    .set({
      currentCity: null,
      currentCountry: null,
      currentLat: null,
      currentLng: null,
      currentLocationUpdatedAt: null,
    })
    .where(and(eq(contacts.id, self.id), eq(contacts.userId, session.user.id)))

  return NextResponse.json({ cleared: true })
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return unauthorized()

  const body = await safeParseBody(req)
  if (!body) return badRequest('Invalid JSON')

  const self = await getOrCreateSelfContact(session.user.id, session.user.name ?? 'Me')

  if (body.source === 'gps' && typeof body.lat === 'number' && typeof body.lng === 'number') {
    const geo = await reverseGeocode(body.lat, body.lng)
    const now = new Date()
    const update: Record<string, unknown> = {
      currentLat: body.lat,
      currentLng: body.lng,
      currentCity: geo?.city ?? null,
      currentCountry: geo?.country ?? null,
      currentLocationUpdatedAt: now,
    }

    await db
      .update(contacts)
      .set(update)
      .where(and(eq(contacts.id, self.id), eq(contacts.userId, session.user.id)))

    return NextResponse.json({
      updated: true,
      currentCity: update.currentCity,
      currentCountry: update.currentCountry,
      currentLocationUpdatedAt: now.toISOString(),
    })
  }

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
