import { auth } from '@/auth'
import { unauthorized, badRequest, notFound, success } from '@/lib/api-utils'
import { deleteTag, renameTag } from '@/lib/db/queries'

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return unauthorized()

  const { id } = await params
  const tag = await deleteTag(id, session.user.id)
  if (!tag) return notFound('Tag')

  return success({ success: true, deletedTag: tag.name })
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return unauthorized()

  let body: { name?: string }
  try {
    body = await req.json()
  } catch {
    return badRequest('Invalid JSON body')
  }

  const name = typeof body.name === 'string' ? body.name.trim() : ''
  if (!name) return badRequest('Tag name is required')

  const { id } = await params
  const tag = await renameTag(id, session.user.id, name)
  if (!tag) return notFound('Tag')

  return success(tag)
}
