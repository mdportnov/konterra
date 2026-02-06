import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getContact, updateContact, deleteContactById } from '@/lib/store'
import { geocode } from '@/lib/geocoding'

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

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const contact = getContact(id, session.user.id)

  if (!contact) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json(contact)
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const body = await req.json()
  let { lat, lng } = body

  if ((body.city || body.country) && (!lat || !lng)) {
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

  const updates: Record<string, unknown> = {}
  if (body.name !== undefined) updates.name = body.name
  if (body.photo !== undefined) updates.photo = toStringOrNull(body.photo)
  if (body.company !== undefined) updates.company = toStringOrNull(body.company)
  if (body.role !== undefined) updates.role = toStringOrNull(body.role)
  if (body.city !== undefined) updates.city = toStringOrNull(body.city)
  if (body.country !== undefined) updates.country = toStringOrNull(body.country)
  if (body.email !== undefined) updates.email = toStringOrNull(body.email)
  if (body.phone !== undefined) updates.phone = toStringOrNull(body.phone)
  if (body.linkedin !== undefined) updates.linkedin = toStringOrNull(body.linkedin)
  if (body.twitter !== undefined) updates.twitter = toStringOrNull(body.twitter)
  if (body.telegram !== undefined) updates.telegram = toStringOrNull(body.telegram)
  if (body.instagram !== undefined) updates.instagram = toStringOrNull(body.instagram)
  if (body.github !== undefined) updates.github = toStringOrNull(body.github)
  if (body.website !== undefined) updates.website = toStringOrNull(body.website)
  if (body.tags !== undefined) updates.tags = Array.isArray(body.tags) ? body.tags : null
  if (body.notes !== undefined) updates.notes = toStringOrNull(body.notes)
  if (body.rating !== undefined) updates.rating = typeof body.rating === 'number' ? body.rating : null
  if (body.gender !== undefined) updates.gender = toStringOrNull(body.gender)
  if (body.relationshipType !== undefined) updates.relationshipType = toStringOrNull(body.relationshipType)
  if (body.metAt !== undefined) updates.metAt = toStringOrNull(body.metAt)
  if (body.metDate !== undefined) updates.metDate = toDateOrNull(body.metDate)
  if (body.nextFollowUp !== undefined) updates.nextFollowUp = toDateOrNull(body.nextFollowUp)
  if (body.lastContactedAt !== undefined) updates.lastContactedAt = toDateOrNull(body.lastContactedAt)
  updates.lat = lat ?? null
  updates.lng = lng ?? null

  const contact = updateContact(id, session.user.id, updates)

  if (!contact) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json(contact)
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  deleteContactById(id, session.user.id)
  return NextResponse.json({ success: true })
}
