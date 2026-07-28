import { badRequest, success, serverError, tooManyRequests } from '@/lib/api-utils'
import { safeParseBody, PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from '@/lib/validation'
import { registerUser, registerViaInvite, writeAuditLog } from '@/lib/db/queries'
import { rateLimitShared, getClientIp } from '@/lib/rate-limit'
import { sendVerificationEmail } from '@/lib/email/send'
import { hash } from 'bcryptjs'

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req)
    const rl = await rateLimitShared(`register:${ip}`, { windowMs: 60 * 60 * 1000, max: 5 })
    if (!rl.ok) return tooManyRequests(rl.resetAt)

    const body = await safeParseBody(req)
    if (!body) return badRequest('Invalid JSON body')

    const { email, name, password, inviteCode } = body as {
      email?: string
      name?: string
      password?: string
      inviteCode?: string | null
    }

    if (!email || typeof email !== 'string' || !email.includes('@')) return badRequest('Valid email is required')
    if (!name || typeof name !== 'string' || name.trim().length < 2) return badRequest('Name is required (min 2 chars)')
    if (!password || typeof password !== 'string' || password.length < PASSWORD_MIN_LENGTH) {
      return badRequest(`Password must be at least ${PASSWORD_MIN_LENGTH} characters`)
    }
    if (password.length > PASSWORD_MAX_LENGTH) {
      return badRequest(`Password must be at most ${PASSWORD_MAX_LENGTH} characters`)
    }
    if (name.trim().length > 200) return badRequest('Name must be 200 characters or less')
    if (inviteCode != null && typeof inviteCode !== 'string') return badRequest('Invalid invite code')

    const normalizedEmail = email.toLowerCase().trim()
    const hashed = await hash(password, 12)
    const data = { email: normalizedEmail, name: name.trim(), password: hashed }
    const result = inviteCode ? await registerViaInvite(data, inviteCode) : await registerUser(data)

    if ('error' in result) {
      if (result.error === 'email_taken') {
        return badRequest('An account with this email already exists. Sign in instead.')
      }
      return badRequest('Registration failed. Please check your invite link and try again.')
    }

    writeAuditLog({
      userId: result.user.id,
      action: 'user_create',
      targetId: result.user.id,
      targetType: 'user',
      ip,
      detail: inviteCode ? 'Self-registration via invite' : 'Self-registration',
    })

    // Verification is advisory at this point — a failed send must not block the account
    // that was already created, the user can re-request it from settings.
    sendVerificationEmail(result.user.id, result.user.email).catch((e) =>
      console.error('[register] verification email failed:', e),
    )

    return success({ id: result.user.id, email: result.user.email, name: result.user.name }, 201)
  } catch (err) {
    console.error('[POST /api/public/register]', err)
    return serverError('Registration failed')
  }
}
