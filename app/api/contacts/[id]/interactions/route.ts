import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getInteractionsByContactId, createInteraction, updateInteraction, deleteInteraction, getContactById } from '@/lib/db/queries'
import { validateInteraction, safeParseBody } from '@/lib/validation'

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

  const items = await getInteractionsByContactId(id)
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

  const contact = await getContactById(id, session.user.id)
  if (!contact) {
    return NextResponse.json({ error: 'Contact not found' }, { status: 404 })
  }

  const body = await safeParseBody(req)
  if (!body) {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { type, date, location, notes } = body as Record<string, unknown>

  if (!type || !date) {
    return NextResponse.json({ error: 'type and date are required' }, { status: 400 })
  }

  const validationError = validateInteraction(body)
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 })
  }

  const interaction = await createInteraction({
    contactId: id,
    type: type as string,
    date: new Date(date as string),
    location: (location as string) || null,
    notes: (notes as string) || null,
  })

  return NextResponse.json(interaction, { status: 201 })
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

  const { interactionId, type, date, location, notes } = body as Record<string, unknown>
  if (!interactionId) {
    return NextResponse.json({ error: 'interactionId required' }, { status: 400 })
  }

  const updates: Record<string, unknown> = {}
  if (type !== undefined) updates.type = type
  if (date !== undefined) updates.date = new Date(date as string)
  if (location !== undefined) updates.location = (location as string) || null
  if (notes !== undefined) updates.notes = (notes as string) || null

  if (updates.type || updates.date) {
    const validationError = validateInteraction({ ...updates, date: date || new Date().toISOString() })
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 })
    }
  }

  const interaction = await updateInteraction(interactionId as string, id, updates)
  if (!interaction) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  return NextResponse.json(interaction)
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
  if (!body.interactionId) {
    return NextResponse.json({ error: 'interactionId required' }, { status: 400 })
  }

  await deleteInteraction(body.interactionId as string, id)
  return NextResponse.json({ success: true })
}
