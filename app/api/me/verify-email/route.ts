import { auth } from '@/auth'
import { unauthorized, badRequest, success, serverError, tooManyRequests } from '@/lib/api-utils'
import { getUserAuthState } from '@/lib/db/queries'
import { rateLimitShared } from '@/lib/rate-limit'
import { sendVerificationEmail } from '@/lib/email/send'
import { isEmailConfigured } from '@/lib/email/client'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return unauthorized()

  const user = await getUserAuthState(session.user.id)
  if (!user) return unauthorized()

  return success({
    email: user.email,
    verified: Boolean(user.emailVerified),
    verifiedAt: user.emailVerified,
    deliveryConfigured: isEmailConfigured(),
  })
}

export async function POST() {
  const session = await auth()
  if (!session?.user?.id) return unauthorized()

  try {
    const rl = await rateLimitShared(`verify-email-send:${session.user.id}`, {
      windowMs: 60 * 60 * 1000,
      max: 5,
    })
    if (!rl.ok) return tooManyRequests(rl.resetAt)

    const user = await getUserAuthState(session.user.id)
    if (!user) return unauthorized()
    if (user.emailVerified) return success({ ok: true, alreadyVerified: true })

    const result = await sendVerificationEmail(user.id, user.email)
    if (!result.sent && result.error === 'email_not_configured') {
      return badRequest('Email delivery is not configured on this deployment yet.')
    }

    return success({ ok: true, sent: result.sent })
  } catch (err) {
    console.error('[POST /api/me/verify-email]', err)
    return serverError('Could not send the confirmation email')
  }
}
