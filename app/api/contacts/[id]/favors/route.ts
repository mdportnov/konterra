import { auth } from '@/auth'
import { unauthorized, badRequest, notFound, success } from '@/lib/api-utils'
import { getFavorsByContactId, createFavor, updateFavor, deleteFavor, getContactById } from '@/lib/db/queries'
import { validateFavor, validateEnum, validateMaxLength, safeParseBody, FAVOR_STATUSES, MAX_DESCRIPTION_LENGTH } from '@/lib/validation'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return unauthorized()
  const { id } = await params

  const contact = await getContactById(id, session.user.id)
  if (!contact) return notFound('Contact')

  const items = await getFavorsByContactId(id, session.user.id)
  return success(items)
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return unauthorized()
  const { id } = await params
  const body = await safeParseBody(req)
  if (!body) return badRequest('Invalid JSON body')
  const { direction, type, description, value, date } = body as Record<string, unknown>

  if (!direction || !type) return badRequest('direction and type are required')

  const validationError = validateFavor(body)
    || validateMaxLength(description, MAX_DESCRIPTION_LENGTH, 'description')
  if (validationError) return badRequest(validationError)

  const contact = await getContactById(id, session.user.id)
  if (!contact) return notFound('Contact')

  const favor = await createFavor({
    userId: session.user.id,
    contactId: id,
    direction: direction as 'given' | 'received',
    type: type as typeof import('@/lib/db/schema').favors.$inferInsert.type,
    description: (description as string) || null,
    value: ((value as string) || 'medium') as typeof import('@/lib/db/schema').favors.$inferInsert.value,
    date: date ? new Date(date as string) : new Date(),
  })

  return success(favor, 201)
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return unauthorized()
  const { id } = await params

  const contact = await getContactById(id, session.user.id)
  if (!contact) return notFound('Contact')

  const body = await safeParseBody(req)
  if (!body) return badRequest('Invalid JSON body')
  const { favorId, direction, type, value, status, description, date, resolvedAt } = body as Record<string, unknown>
  if (!favorId) return badRequest('favorId required')

  const validationError = validateFavor({ direction, type, value })
    || validateEnum(status, FAVOR_STATUSES, 'status')
    || validateMaxLength(description, MAX_DESCRIPTION_LENGTH, 'description')
  if (validationError) return badRequest(validationError)

  const updates: Record<string, unknown> = {}
  if (direction !== undefined) updates.direction = direction
  if (type !== undefined) updates.type = type
  if (value !== undefined) updates.value = value
  if (status !== undefined) updates.status = status
  if (description !== undefined) updates.description = (description as string) || null
  if (date !== undefined) {
    const d = date ? new Date(date as string) : null
    if (d && isNaN(d.getTime())) return badRequest('Invalid date')
    updates.date = d
  }
  if (resolvedAt !== undefined) {
    const d = resolvedAt ? new Date(resolvedAt as string) : null
    if (d && isNaN(d.getTime())) return badRequest('Invalid resolvedAt')
    updates.resolvedAt = d
  }
  if (Object.keys(updates).length === 0) return badRequest('No valid fields to update')

  const favor = await updateFavor(favorId as string, session.user.id, updates)
  if (!favor) return notFound('Favor')
  return success(favor)
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return unauthorized()
  const { id } = await params

  const contact = await getContactById(id, session.user.id)
  if (!contact) return notFound('Contact')

  const body = await safeParseBody(req)
  if (!body) return badRequest('Invalid JSON body')
  if (!body.favorId) return badRequest('favorId required')
  await deleteFavor(body.favorId as string, session.user.id)
  return success({ success: true })
}
