import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getConnectionsByContactId, createConnection, deleteConnection, getContactById } from '@/lib/db/queries'
import { validateConnection, safeParseBody } from '@/lib/validation'

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

  const items = await getConnectionsByContactId(id, session.user.id)
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
  const { targetContactId, connectionType, strength, bidirectional, notes } = body as Record<string, unknown>

  if (!targetContactId || !connectionType) {
    return NextResponse.json({ error: 'targetContactId and connectionType are required' }, { status: 400 })
  }

  const validationError = validateConnection(body)
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 })
  }

  const source = await getContactById(id, session.user.id)
  const target = await getContactById(targetContactId as string, session.user.id)
  if (!source || !target) {
    return NextResponse.json({ error: 'Contact not found' }, { status: 404 })
  }

  const conn = await createConnection({
    userId: session.user.id,
    sourceContactId: id,
    targetContactId: targetContactId as string,
    connectionType: connectionType as typeof import('@/lib/db/schema').contactConnections.$inferInsert.connectionType,
    strength: (strength as number) ?? 3,
    bidirectional: (bidirectional as boolean) ?? true,
    notes: (notes as string) || null,
  })

  return NextResponse.json(conn, { status: 201 })
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
  if (!body.connectionId) {
    return NextResponse.json({ error: 'connectionId required' }, { status: 400 })
  }
  await deleteConnection(body.connectionId as string, session.user.id)
  return NextResponse.json({ success: true })
}
