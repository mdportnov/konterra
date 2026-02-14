import { auth } from '@/auth'
import { unauthorized, badRequest, notFound, success } from '@/lib/api-utils'
import { getCountryConnectionsByContactId, createCountryConnection, updateCountryConnection, deleteCountryConnection, getContactById } from '@/lib/db/queries'
import { safeParseBody } from '@/lib/validation'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return unauthorized()
  const { id } = await params

  const contact = await getContactById(id, session.user.id)
  if (!contact) return notFound('Contact')

  const items = await getCountryConnectionsByContactId(id, session.user.id)
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

  const { country, notes, tags } = body as Record<string, unknown>
  if (!country || typeof country !== 'string') return badRequest('country is required')

  const contact = await getContactById(id, session.user.id)
  if (!contact) return notFound('Contact')

  const conn = await createCountryConnection({
    userId: session.user.id,
    contactId: id,
    country: country.trim(),
    notes: (notes as string) || null,
    tags: Array.isArray(tags) ? tags.filter((t): t is string => typeof t === 'string') : null,
  })

  return success(conn, 201)
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
  if (!body.connectionId) return badRequest('connectionId required')
  const updates: { notes?: string | null; tags?: string[] | null } = {}
  if (body.notes !== undefined) updates.notes = (body.notes as string) || null
  if (body.tags !== undefined) updates.tags = Array.isArray(body.tags) ? body.tags.filter((t): t is string => typeof t === 'string') : null
  const conn = await updateCountryConnection(body.connectionId as string, id, session.user.id, updates)
  if (!conn) return notFound('Connection')
  return success(conn)
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
  if (!body.connectionId) return badRequest('connectionId required')
  await deleteCountryConnection(body.connectionId as string, id, session.user.id)
  return success({ success: true })
}
