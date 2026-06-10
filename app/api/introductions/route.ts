import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { unauthorized, badRequest, notFound, success } from '@/lib/api-utils'
import { getIntroductionsByUserId, createIntroduction, updateIntroduction, deleteIntroduction, verifyContactOwnership } from '@/lib/db/queries'
import { safeParseBody, validateEnum, validateMaxLength, INTRODUCTION_STATUSES, MAX_DESCRIPTION_LENGTH, MAX_NOTES_LENGTH } from '@/lib/validation'

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return unauthorized()

  const { searchParams } = new URL(req.url)
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1)
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10) || 50))

  const result = await getIntroductionsByUserId(session.user.id, page, limit)
  return success(result)
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return unauthorized()
  const body = await safeParseBody(req)
  if (!body) return badRequest('Invalid JSON body')
  const { contactAId, contactBId, initiatedBy, status, date, notes } = body as Record<string, unknown>

  if (!contactAId || !contactBId || !initiatedBy) {
    return badRequest('contactAId, contactBId, and initiatedBy are required')
  }

  const validationError = validateEnum(status, INTRODUCTION_STATUSES, 'status')
    || validateMaxLength(notes, MAX_NOTES_LENGTH, 'notes')
  if (validationError) return badRequest(validationError)

  const [ownsA, ownsB] = await Promise.all([
    verifyContactOwnership(contactAId as string, session.user.id),
    verifyContactOwnership(contactBId as string, session.user.id),
  ])
  if (!ownsA || !ownsB) return notFound('Contact')

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

  return success(intro, 201)
}

export async function PATCH(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return unauthorized()
  const body = await safeParseBody(req)
  if (!body) return badRequest('Invalid JSON body')
  const { id, status, date, outcome, notes, initiatedBy } = body as Record<string, unknown>
  if (!id) return badRequest('id required')

  const validationError = validateEnum(status, INTRODUCTION_STATUSES, 'status')
    || validateMaxLength(outcome, MAX_DESCRIPTION_LENGTH, 'outcome')
    || validateMaxLength(notes, MAX_NOTES_LENGTH, 'notes')
  if (validationError) return badRequest(validationError)

  const updates: Record<string, unknown> = {}
  if (status !== undefined) updates.status = status
  if (outcome !== undefined) updates.outcome = (outcome as string) || null
  if (notes !== undefined) updates.notes = (notes as string) || null
  if (initiatedBy !== undefined && typeof initiatedBy === 'string') updates.initiatedBy = initiatedBy
  if (date !== undefined) {
    const d = date ? new Date(date as string) : null
    if (d && isNaN(d.getTime())) return badRequest('Invalid date')
    updates.date = d
  }
  if (Object.keys(updates).length === 0) return badRequest('No valid fields to update')

  const intro = await updateIntroduction(id as string, session.user.id, updates)
  if (!intro) return notFound('Introduction')
  return success(intro)
}

export async function DELETE(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return unauthorized()
  const body = await safeParseBody(req)
  if (!body) return badRequest('Invalid JSON body')
  if (!body.id) return badRequest('id required')
  await deleteIntroduction(body.id as string, session.user.id)
  return success({ success: true })
}
