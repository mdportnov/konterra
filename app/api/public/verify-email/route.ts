import { badRequest, success, serverError, tooManyRequests } from '@/lib/api-utils'
import { safeParseBody } from '@/lib/validation'
import { consumeEmailVerificationToken, writeAuditLog } from '@/lib/db/queries'
import { rateLimitShared, getClientIp } from '@/lib/rate-limit'
import { hashToken } from '@/lib/email/tokens'

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req)
    const rl = await rateLimitShared(`verify-email:${ip}`, { windowMs: 15 * 60 * 1000, max: 20 })
    if (!rl.ok) return tooManyRequests(rl.resetAt)

    const body = await safeParseBody(req)
    if (!body) return badRequest('Invalid JSON body')

    const { token } = body as { token?: string }
    if (!token || typeof token !== 'string') return badRequest('Verification token is required')

    const user = await consumeEmailVerificationToken(hashToken(token))
    if (!user) return badRequest('This confirmation link is invalid or has expired.')

    writeAuditLog({
      userId: user.id,
      action: 'email_verification_complete',
      targetId: user.email,
      targetType: 'email',
      ip,
    })

    return success({ ok: true, email: user.email })
  } catch (err) {
    console.error('[POST /api/public/verify-email]', err)
    return serverError('Could not confirm the email')
  }
}
