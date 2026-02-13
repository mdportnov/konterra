import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getOrCreateSelfContact } from '@/lib/db/queries'
import { db } from '@/lib/db'
import { contacts } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { unauthorized, badRequest } from '@/lib/api-utils'

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return unauthorized()

  let body: { lat: number; lng: number }
  try {
    body = await req.json()
  } catch {
    return badRequest('Invalid JSON')
  }

  if (typeof body.lat !== 'number' || typeof body.lng !== 'number') {
    return badRequest('lat and lng are required numbers')
  }

  const self = await getOrCreateSelfContact(session.user.id, session.user.name ?? 'Me')

  if (self.lat != null && self.lng != null) {
    return NextResponse.json({ updated: false, id: self.id })
  }

  await db
    .update(contacts)
    .set({ lat: body.lat, lng: body.lng })
    .where(and(eq(contacts.id, self.id), eq(contacts.userId, session.user.id)))

  return NextResponse.json({ updated: true, id: self.id })
}
