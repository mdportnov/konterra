import { auth } from '@/auth'
import { unauthorized, badRequest, notFound, success } from '@/lib/api-utils'
import { getConnectionsByContactId, createConnection, deleteConnection, getContactById } from '@/lib/db/queries'
import { validateConnection, safeParseBody } from '@/lib/validation'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return unauthorized()
  const { id } = await params

  const contact = await getContactById(id, session.user.id)
  if (!contact) return notFound('Contact')

  const items = await getConnectionsByContactId(id, session.user.id)
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
  const { targetContactId, connectionType, strength, bidirectional, notes } = body as Record<string, unknown>

  if (!targetContactId || !connectionType) {
    return badRequest('targetContactId and connectionType are required')
  }

  const validationError = validateConnection(body)
  if (validationError) return badRequest(validationError)

  const source = await getContactById(id, session.user.id)
  const target = await getContactById(targetContactId as string, session.user.id)
  if (!source || !target) return notFound('Contact')

  const conn = await createConnection({
    userId: session.user.id,
    sourceContactId: id,
    targetContactId: targetContactId as string,
    connectionType: connectionType as typeof import('@/lib/db/schema').contactConnections.$inferInsert.connectionType,
    strength: (strength as number) ?? 3,
    bidirectional: (bidirectional as boolean) ?? true,
    notes: (notes as string) || null,
  })

  return success(conn, 201)
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return unauthorized()
  await params
  const body = await safeParseBody(req)
  if (!body) return badRequest('Invalid JSON body')
  if (!body.connectionId) return badRequest('connectionId required')
  await deleteConnection(body.connectionId as string, session.user.id)
  return success({ success: true })
}
