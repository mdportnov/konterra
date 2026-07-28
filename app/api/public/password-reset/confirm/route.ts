import { badRequest, success, serverError, tooManyRequests } from '@/lib/api-utils'
import { safeParseBody, PASSWORD_MIN_LENGTH, PASSWORD_MAX_LENGTH } from '@/lib/validation'
import { consumePasswordResetToken, setUserPassword, writeAuditLog } from '@/lib/db/queries'
import { rateLimitShared, getClientIp } from '@/lib/rate-limit'
import { hashToken } from '@/lib/email/tokens'
import { hash } from 'bcryptjs'

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req)
    const rl = await rateLimitShared(`pwreset-confirm:${ip}`, { windowMs: 15 * 60 * 1000, max: 20 })
    if (!rl.ok) return tooManyRequests(rl.resetAt)

    const body = await safeParseBody(req)
    if (!body) return badRequest('Invalid JSON body')

    const { token, password } = body as { token?: string; password?: string }
    if (!token || typeof token !== 'string') return badRequest('Reset token is required')
    if (!password || typeof password !== 'string' || password.length < PASSWORD_MIN_LENGTH) {
      return badRequest(`Password must be at least ${PASSWORD_MIN_LENGTH} characters`)
    }
    if (password.length > PASSWORD_MAX_LENGTH) {
      return badRequest(`Password must be at most ${PASSWORD_MAX_LENGTH} characters`)
    }

    const claimed = await consumePasswordResetToken(hashToken(token))
    if (!claimed) return badRequest('This reset link is invalid or has expired. Request a new one.')

    const hashed = await hash(password, 12)
    const user = await setUserPassword(claimed.userId, hashed)
    if (!user) return badRequest('This reset link is no longer valid.')

    writeAuditLog({
      userId: user.id,
      action: 'password_reset_complete',
      targetId: user.email,
      targetType: 'email',
      ip,
    })

    return success({ ok: true, email: user.email })
  } catch (err) {
    console.error('[POST /api/public/password-reset/confirm]', err)
    return serverError('Could not reset the password')
  }
}
