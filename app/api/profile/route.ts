import { auth } from '@/auth'
import { unauthorized, badRequest, notFound, success, serverError } from '@/lib/api-utils'
import { getUserById, updateUserProfile } from '@/lib/db/queries'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return unauthorized()

  try {
    const user = await getUserById(session.user.id)
    return success({
      name: user?.name ?? session.user.name ?? '',
      email: user?.email ?? session.user.email ?? '',
      image: user?.image ?? null,
      role: user?.role ?? 'user',
      createdAt: user?.createdAt ?? null,
    })
  } catch (err) {
    console.error('[GET /api/profile]', err instanceof Error ? err.message : err)
    return success({
      name: session.user.name ?? '',
      email: session.user.email ?? '',
      image: null,
      role: (session.user as { role?: string }).role ?? 'user',
      createdAt: null,
    })
  }
}

export async function PATCH(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return unauthorized()

  try {
    const body = await req.json()
    const data: { name?: string; image?: string | null } = {}

    if (typeof body.name === 'string') {
      data.name = body.name.trim()
    }
    if (body.image !== undefined) {
      data.image = typeof body.image === 'string' ? body.image : null
    }

    if (Object.keys(data).length === 0) {
      return badRequest('No valid fields to update')
    }

    const updated = await updateUserProfile(session.user.id, data)
    if (!updated) return notFound('User')

    return success({ name: updated.name, image: updated.image })
  } catch (err) {
    console.error('[PATCH /api/profile]', err)
    return serverError('Failed to update profile')
  }
}
