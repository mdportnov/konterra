import { auth } from '@/auth'
import { unauthorized, badRequest, success } from '@/lib/api-utils'
import { getTagsByUserId, createTag } from '@/lib/db/queries'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return unauthorized()

  const tags = await getTagsByUserId(session.user.id)
  return success(tags)
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return unauthorized()

  let body: { name?: string; color?: string }
  try {
    body = await req.json()
  } catch {
    return badRequest('Invalid JSON body')
  }

  const name = typeof body.name === 'string' ? body.name.trim() : ''
  if (!name) return badRequest('Tag name is required')

  if (name.length > 50) return badRequest('Tag name must be 50 characters or less')

  const tag = await createTag(session.user.id, name, body.color)
  return success(tag, 201)
}
