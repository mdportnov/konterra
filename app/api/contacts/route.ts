import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getContacts, createContact } from '@/lib/store'
import { geocode } from '@/lib/geocoding'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const contacts = getContacts(session.user.id)
  return NextResponse.json(contacts)
}

function toDateOrNull(v: unknown): Date | null {
  if (!v) return null
  if (v instanceof Date) return v
  const d = new Date(v as string)
  return isNaN(d.getTime()) ? null : d
}

function toStringOrNull(v: unknown): string | null {
  if (typeof v === 'string' && v.trim() !== '') return v.trim()
  return null
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  let { lat, lng } = body

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

  const tags = Array.isArray(body.tags) ? body.tags : null

  const contact = createContact({
    userId: session.user.id,
    name: body.name,
    photo: toStringOrNull(body.photo),
    company: toStringOrNull(body.company),
    role: toStringOrNull(body.role),
    city: toStringOrNull(body.city),
    country: toStringOrNull(body.country),
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
    secondaryLocations: body.secondaryLocations ?? null,
    rating: typeof body.rating === 'number' ? body.rating : null,
    gender: toStringOrNull(body.gender),
    relationshipType: toStringOrNull(body.relationshipType),
    metAt: toStringOrNull(body.metAt),
    metDate: toDateOrNull(body.metDate),
    lastContactedAt: toDateOrNull(body.lastContactedAt),
    nextFollowUp: toDateOrNull(body.nextFollowUp),
  })

  return NextResponse.json(contact, { status: 201 })
}
