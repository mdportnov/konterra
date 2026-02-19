import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { unauthorized, badRequest, notFound, success, serverError } from '@/lib/api-utils'
import { getUserById, updateUserProfile, getUserByUsername } from '@/lib/db/queries'

const USERNAME_RE = /^[a-z0-9][a-z0-9_-]{1,28}[a-z0-9]$/

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
      username: user?.username ?? null,
      profileVisibility: user?.profileVisibility ?? 'private',
      profilePrivacyLevel: user?.profilePrivacyLevel ?? 'countries_only',
      createdAt: user?.createdAt ?? null,
    })
  } catch (err) {
    console.error('[GET /api/profile]', err instanceof Error ? err.message : err)
    return success({
      name: session.user.name ?? '',
      email: session.user.email ?? '',
      image: null,
      role: (session.user as { role?: string }).role ?? 'user',
      username: null,
      profileVisibility: 'private',
      profilePrivacyLevel: 'countries_only',
      createdAt: null,
    })
  }
}

export async function PATCH(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return unauthorized()

  try {
    const body = await req.json()
    const data: {
      name?: string
      image?: string | null
      username?: string | null
      profileVisibility?: 'private' | 'public'
      profilePrivacyLevel?: 'countries_only' | 'full_travel'
    } = {}

    if (typeof body.name === 'string') {
      data.name = body.name.trim()
    }
    if (body.image !== undefined) {
      data.image = typeof body.image === 'string' ? body.image : null
    }

    if (body.username !== undefined) {
      if (body.username === null || body.username === '') {
        data.username = null
        data.profileVisibility = 'private'
      } else if (typeof body.username === 'string') {
        const u = body.username.toLowerCase().trim()
        if (!USERNAME_RE.test(u)) {
          return badRequest('Username must be 3-30 chars: lowercase letters, numbers, hyphens, underscores')
        }
        const existing = await getUserByUsername(u)
        if (existing && existing.id !== session.user.id) {
          return NextResponse.json({ error: 'Username already taken' }, { status: 409 })
        }
        data.username = u
      }
    }

    if (body.profileVisibility === 'public' || body.profileVisibility === 'private') {
      if (body.profileVisibility === 'public') {
        const user = await getUserById(session.user.id)
        const effectiveUsername = data.username !== undefined ? data.username : user?.username
        if (!effectiveUsername) {
          return badRequest('Set a username before enabling public profile')
        }
      }
      data.profileVisibility = body.profileVisibility
    }

    if (body.profilePrivacyLevel === 'countries_only' || body.profilePrivacyLevel === 'full_travel') {
      data.profilePrivacyLevel = body.profilePrivacyLevel
    }

    if (Object.keys(data).length === 0) {
      return badRequest('No valid fields to update')
    }

    const updated = await updateUserProfile(session.user.id, data)
    if (!updated) return notFound('User')

    return success({
      name: updated.name,
      image: updated.image,
      username: updated.username,
      profileVisibility: updated.profileVisibility,
      profilePrivacyLevel: updated.profilePrivacyLevel,
    })
  } catch (err) {
    console.error('[PATCH /api/profile]', err)
    return serverError('Failed to update profile')
  }
}
