import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getFavorsByContactId, createFavor, updateFavor, deleteFavor, getContactById } from '@/lib/db/queries'
import { validateFavor, safeParseBody } from '@/lib/validation'

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

  const items = await getFavorsByContactId(id, session.user.id)
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
  const { direction, type, description, value, date } = body as Record<string, unknown>

  if (!direction || !type) {
    return NextResponse.json({ error: 'direction and type are required' }, { status: 400 })
  }

  const validationError = validateFavor(body)
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 })
  }

  const contact = await getContactById(id, session.user.id)
  if (!contact) {
    return NextResponse.json({ error: 'Contact not found' }, { status: 404 })
  }

  const favor = await createFavor({
    userId: session.user.id,
    contactId: id,
    direction: direction as 'given' | 'received',
    type: type as typeof import('@/lib/db/schema').favors.$inferInsert.type,
    description: (description as string) || null,
    value: ((value as string) || 'medium') as typeof import('@/lib/db/schema').favors.$inferInsert.value,
    date: date ? new Date(date as string) : new Date(),
  })

  return NextResponse.json(favor, { status: 201 })
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  await params
  const body = await safeParseBody(req)
  if (!body) {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }
  const { favorId, ...updates } = body as Record<string, unknown>
  if (!favorId) {
    return NextResponse.json({ error: 'favorId required' }, { status: 400 })
  }
  const favor = await updateFavor(favorId as string, session.user.id, updates)
  if (!favor) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  return NextResponse.json(favor)
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  await params
  const body = await safeParseBody(req)
  if (!body) {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }
  if (!body.favorId) {
    return NextResponse.json({ error: 'favorId required' }, { status: 400 })
  }
  await deleteFavor(body.favorId as string, session.user.id)
  return NextResponse.json({ success: true })
}
