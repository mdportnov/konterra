import { auth } from '@/auth'
import { unauthorized, success, serverError } from '@/lib/api-utils'
import { getActiveInvitesByUserId, createInvite, getAllInvitedUsers, getUsedInviteCount, getInviteLimit } from '@/lib/db/queries'
import { randomBytes } from 'crypto'
import { NextResponse } from 'next/server'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return unauthorized()

  try {
    const [activeInvites, usedCount, maxInvites, invitedUsers] = await Promise.all([
      getActiveInvitesByUserId(session.user.id),
      getUsedInviteCount(session.user.id),
      getInviteLimit(session.user.id),
      getAllInvitedUsers(session.user.id),
    ])

    return success({
      activeInvites,
      invitedUsers,
      usedCount,
      maxInvites,
    })
  } catch (err) {
    console.error('[GET /api/invite]', err)
    return serverError('Failed to fetch invite')
  }
}

export async function POST() {
  const session = await auth()
  if (!session?.user?.id) return unauthorized()

  try {
    const code = randomBytes(16).toString('base64url')
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    const result = await createInvite(session.user.id, code, expiresAt)

    if ('error' in result) {
      if (result.error === 'limit_reached') {
        return NextResponse.json({ error: 'Invite limit reached' }, { status: 403 })
      }
      return NextResponse.json({ error: 'Failed to create invite' }, { status: 500 })
    }

    return success({ code: result.invite.code, expiresAt: result.invite.expiresAt, createdAt: result.invite.createdAt }, 201)
  } catch (err) {
    console.error('[POST /api/invite]', err)
    return serverError('Failed to create invite')
  }
}
