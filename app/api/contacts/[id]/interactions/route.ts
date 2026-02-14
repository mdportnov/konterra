import { auth } from '@/auth'
import { unauthorized, badRequest, notFound, success } from '@/lib/api-utils'
import { getInteractionsByContactId, createInteraction, updateInteraction, deleteInteraction, getContactById } from '@/lib/db/queries'
import { validateInteraction, safeParseBody } from '@/lib/validation'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return unauthorized()
  const { id } = await params

  const contact = await getContactById(id, session.user.id)
  if (!contact) return notFound('Contact')

  const items = await getInteractionsByContactId(id)
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
  if (validationError) return badRequest(validationError)

  const interaction = await createInteraction({
    contactId: id,
    type: type as string,
    date: new Date(date as string),
    location: (location as string) || null,
    notes: (notes as string) || null,
  })

  return success(interaction, 201)
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
  if (!interactionId) return badRequest('interactionId required')

  const updates: Record<string, unknown> = {}
  if (type !== undefined) updates.type = type
  if (date !== undefined) updates.date = new Date(date as string)
  if (location !== undefined) updates.location = (location as string) || null
  if (notes !== undefined) updates.notes = (notes as string) || null

  if (updates.type || updates.date) {
    const validationError = validateInteraction({ ...updates, date: date || new Date().toISOString() })
    if (validationError) return badRequest(validationError)
  }

  const interaction = await updateInteraction(interactionId as string, id, updates)
  if (!interaction) return notFound('Interaction')
  return success(interaction)
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
