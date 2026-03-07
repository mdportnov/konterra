import { auth } from '@/auth'
import { unauthorized, success, serverError } from '@/lib/api-utils'
import { getInviteByUserId, createInvite, getInvitedUser } from '@/lib/db/queries'
import { randomBytes } from 'crypto'
import { NextResponse } from 'next/server'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return unauthorized()

  try {
    const invite = await getInviteByUserId(session.user.id)
    if (!invite) return success(null)

    let status: 'active' | 'used' | 'expired' = 'active'
    if (invite.usedBy) {
      status = 'used'
    } else if (new Date(invite.expiresAt) < new Date()) {
      status = 'expired'
    }

    const invitedUser = status === 'used' ? await getInvitedUser(session.user.id) : null

    return success({
      code: invite.code,
      status,
      expiresAt: invite.expiresAt,
      createdAt: invite.createdAt,
      invitedUser,
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
    const invite = await createInvite(session.user.id, code, expiresAt)

    if (!invite) {
      return NextResponse.json({ error: 'You already have an active invite' }, { status: 409 })
    }

    return success({ code: invite.code, expiresAt: invite.expiresAt, createdAt: invite.createdAt, status: 'active' }, 201)
  } catch (err) {
    console.error('[POST /api/invite]', err)
    return serverError('Failed to create invite')
  }
}
