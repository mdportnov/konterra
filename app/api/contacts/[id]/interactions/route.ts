import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getInteractions, createInteraction, getContact } from '@/lib/store'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  const userId = session?.user?.email || 'demo@example.com'
  const { id } = await params

  const contact = getContact(id, userId)
  if (!contact) {
    return NextResponse.json({ error: 'Contact not found' }, { status: 404 })
  }

  const items = getInteractions(id)
  return NextResponse.json(items)
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  const userId = session?.user?.email || 'demo@example.com'
  const { id } = await params

  const contact = getContact(id, userId)
  if (!contact) {
    return NextResponse.json({ error: 'Contact not found' }, { status: 404 })
  }

  const body = await req.json()
  const { type, date, location, notes } = body

  if (!type || !date) {
    return NextResponse.json({ error: 'type and date are required' }, { status: 400 })
  }

  const interaction = createInteraction({
    contactId: id,
    type,
    date: new Date(date),
    location: location || null,
    notes: notes || null,
  })

  return NextResponse.json(interaction, { status: 201 })
}
