import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getCountryConnectionsByContactId, createCountryConnection, updateCountryConnection, deleteCountryConnection, getContactById } from '@/lib/db/queries'
import { safeParseBody } from '@/lib/validation'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await params

  const contact = await getContactById(id, session.user.id)
  if (!contact) {
    return NextResponse.json({ error: 'Contact not found' }, { status: 404 })
  }

  const items = await getCountryConnectionsByContactId(id, session.user.id)
  return NextResponse.json(items)
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await params
  const body = await safeParseBody(req)
  if (!body) {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { country, notes, tags } = body as Record<string, unknown>
  if (!country || typeof country !== 'string') {
    return NextResponse.json({ error: 'country is required' }, { status: 400 })
  }

  const contact = await getContactById(id, session.user.id)
  if (!contact) {
    return NextResponse.json({ error: 'Contact not found' }, { status: 404 })
  }

  const conn = await createCountryConnection({
    userId: session.user.id,
    contactId: id,
    country: country.trim(),
    notes: (notes as string) || null,
    tags: Array.isArray(tags) ? tags.filter((t): t is string => typeof t === 'string') : null,
  })

  return NextResponse.json(conn, { status: 201 })
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await params
  const contact = await getContactById(id, session.user.id)
  if (!contact) {
    return NextResponse.json({ error: 'Contact not found' }, { status: 404 })
  }
  const body = await safeParseBody(req)
  if (!body) {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }
  if (!body.connectionId) {
    return NextResponse.json({ error: 'connectionId required' }, { status: 400 })
  }
  const updates: { notes?: string | null; tags?: string[] | null } = {}
  if (body.notes !== undefined) updates.notes = (body.notes as string) || null
  if (body.tags !== undefined) updates.tags = Array.isArray(body.tags) ? body.tags.filter((t): t is string => typeof t === 'string') : null
  const conn = await updateCountryConnection(body.connectionId as string, id, session.user.id, updates)
  if (!conn) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  return NextResponse.json(conn)
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await params
  const contact = await getContactById(id, session.user.id)
  if (!contact) {
    return NextResponse.json({ error: 'Contact not found' }, { status: 404 })
  }
  const body = await safeParseBody(req)
  if (!body) {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }
  if (!body.connectionId) {
    return NextResponse.json({ error: 'connectionId required' }, { status: 400 })
  }
  await deleteCountryConnection(body.connectionId as string, id, session.user.id)
  return NextResponse.json({ success: true })
}
