import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getIntroductionsByUserId, createIntroduction, updateIntroduction, deleteIntroduction, verifyContactOwnership } from '@/lib/db/queries'
import { safeParseBody } from '@/lib/validation'

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1)
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10) || 50))

  const result = await getIntroductionsByUserId(session.user.id, page, limit)
  return NextResponse.json(result)
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const body = await safeParseBody(req)
  if (!body) {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }
  const { contactAId, contactBId, initiatedBy, status, date, notes } = body as Record<string, unknown>

  if (!contactAId || !contactBId || !initiatedBy) {
    return NextResponse.json({ error: 'contactAId, contactBId, and initiatedBy are required' }, { status: 400 })
  }

  const [ownsA, ownsB] = await Promise.all([
    verifyContactOwnership(contactAId as string, session.user.id),
    verifyContactOwnership(contactBId as string, session.user.id),
  ])
  if (!ownsA || !ownsB) {
    return NextResponse.json({ error: 'Contact not found' }, { status: 404 })
  }

  const intro = await createIntroduction({
    userId: session.user.id,
    contactAId: contactAId as string,
    contactBId: contactBId as string,
    initiatedBy: initiatedBy as string,
    status: ((status as string) || 'planned') as typeof import('@/lib/db/schema').introductions.$inferInsert.status,
    date: date ? new Date(date as string) : null,
    notes: (notes as string) || null,
  })

  if (!intro) {
    return NextResponse.json({ error: 'Introduction between these contacts already exists' }, { status: 409 })
  }

  return NextResponse.json(intro, { status: 201 })
}

export async function PATCH(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const body = await safeParseBody(req)
  if (!body) {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }
  const { id, ...updates } = body as Record<string, unknown>
  if (!id) {
    return NextResponse.json({ error: 'id required' }, { status: 400 })
  }
  if (updates.date) updates.date = new Date(updates.date as string)
  const intro = await updateIntroduction(id as string, session.user.id, updates)
  if (!intro) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  return NextResponse.json(intro)
}

export async function DELETE(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const body = await safeParseBody(req)
  if (!body) {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }
  if (!body.id) {
    return NextResponse.json({ error: 'id required' }, { status: 400 })
  }
  await deleteIntroduction(body.id as string, session.user.id)
  return NextResponse.json({ success: true })
}
