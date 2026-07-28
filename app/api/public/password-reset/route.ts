import { badRequest, success, serverError, tooManyRequests } from '@/lib/api-utils'
import { safeParseBody } from '@/lib/validation'
import { getUserByEmail, countRecentPasswordResets } from '@/lib/db/queries'
import { rateLimitShared, getClientIp } from '@/lib/rate-limit'
import { sendPasswordResetEmail } from '@/lib/email/send'

const MAX_RESETS_PER_HOUR = 3

/**
 * Always answers the same regardless of whether the address exists — the endpoint is
 * unauthenticated, so a differing response would turn it into an account oracle.
 */
export async function POST(req: Request) {
  try {
    const ip = getClientIp(req)
    const rl = await rateLimitShared(`pwreset:ip:${ip}`, { windowMs: 60 * 60 * 1000, max: 10 })
    if (!rl.ok) return tooManyRequests(rl.resetAt)

    const body = await safeParseBody(req)
    if (!body) return badRequest('Invalid JSON body')

    const { email } = body as { email?: string }
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return badRequest('Valid email is required')
    }

    const normalized = email.toLowerCase().trim()

    const emailRl = await rateLimitShared(`pwreset:email:${normalized}`, {
      windowMs: 60 * 60 * 1000,
      max: MAX_RESETS_PER_HOUR,
    })

    if (emailRl.ok) {
      const user = await getUserByEmail(normalized)
      if (user) {
        const recent = await countRecentPasswordResets(user.id, 60 * 60 * 1000).catch(() => 0)
        if (recent < MAX_RESETS_PER_HOUR) {
          await sendPasswordResetEmail({ id: user.id, email: user.email, name: user.name }, ip)
        }
      }
    }

    return success({ ok: true })
  } catch (err) {
    console.error('[POST /api/public/password-reset]', err)
    return serverError('Could not process the request')
  }
}
