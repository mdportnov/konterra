import { auth } from '@/auth'
import { unauthorized, badRequest, notFound, success, serverError } from '@/lib/api-utils'
import { getInteractionsByContactId, createInteraction, updateInteraction, deleteInteraction, getContactById } from '@/lib/db/queries'
import { validateInteraction, validateMaxLength, safeParseBody, MAX_SHORT_TEXT_LENGTH, MAX_NOTES_LENGTH } from '@/lib/validation'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return unauthorized()
  const { id } = await params

  const contact = await getContactById(id, session.user.id)
  if (!contact) return notFound('Contact')

  const items = await getInteractionsByContactId(id, session.user.id)
  return success(items)
}

export async function POST(
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

  const { type, date, location, notes } = body as Record<string, unknown>

  if (!type || !date) return badRequest('type and date are required')

  const validationError = validateInteraction(body)
    || validateMaxLength(location, MAX_SHORT_TEXT_LENGTH, 'location')
    || validateMaxLength(notes, MAX_NOTES_LENGTH, 'notes')
  if (validationError) return badRequest(validationError)

  const parsedDate = new Date(date as string)
  if (isNaN(parsedDate.getTime())) return badRequest('Invalid date')

  try {
    const interaction = await createInteraction({
      contactId: id,
      type: type as string,
      date: parsedDate,
      location: (location as string) || null,
      notes: (notes as string) || null,
    })

    return success(interaction, 201)
  } catch (err) {
    console.error('[POST /api/contacts/[id]/interactions]', err)
    return serverError('Failed to log interaction')
  }
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

  const { interactionId, type, date, location, notes } = body as Record<string, unknown>
  if (!interactionId || typeof interactionId !== 'string') return badRequest('interactionId required')

  const updates: Record<string, unknown> = {}
  if (type !== undefined) updates.type = type
  if (location !== undefined) updates.location = (location as string) || null
  if (notes !== undefined) updates.notes = (notes as string) || null

  // Parse before validating: `new Date(null)` silently yields 1970 and `new Date('x')`
  // yields an Invalid Date that only blows up once it reaches the driver.
  if (date !== undefined) {
    if (typeof date !== 'string' && !(date instanceof Date)) return badRequest('Invalid date')
    const parsed = new Date(date as string)
    if (isNaN(parsed.getTime())) return badRequest('Invalid date')
    updates.date = parsed
  }

  const lengthError = validateMaxLength(location, MAX_SHORT_TEXT_LENGTH, 'location')
    || validateMaxLength(notes, MAX_NOTES_LENGTH, 'notes')
  if (lengthError) return badRequest(lengthError)

  if (updates.type !== undefined || updates.date !== undefined) {
    const validationError = validateInteraction({
      type: updates.type ?? undefined,
      date: updates.date ?? undefined,
    })
    if (validationError) return badRequest(validationError)
  }

  if (Object.keys(updates).length === 0) return badRequest('No fields to update')

  try {
    const interaction = await updateInteraction(interactionId, id, updates)
    if (!interaction) return notFound('Interaction')
    return success(interaction)
  } catch (err) {
    console.error('[PATCH /api/contacts/[id]/interactions]', err)
    return serverError('Failed to update interaction')
  }
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
  if (!body.interactionId) return badRequest('interactionId required')

  await deleteInteraction(body.interactionId as string, id)
  return success({ success: true })
}
