import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getInteractionsByContactId, createInteraction, getContactById } from '@/lib/db/queries'
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
