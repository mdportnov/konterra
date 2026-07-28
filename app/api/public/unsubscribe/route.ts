import { badRequest, success, serverError, tooManyRequests } from '@/lib/api-utils'
import { safeParseBody } from '@/lib/validation'
import { unsubscribeByToken } from '@/lib/db/queries'
import { rateLimitShared, getClientIp } from '@/lib/rate-limit'

async function handle(token: unknown) {
  if (!token || typeof token !== 'string') return badRequest('Unsubscribe token is required')
  const user = await unsubscribeByToken(token)
  if (!user) return badRequest('This unsubscribe link is not valid.')
  return success({ ok: true })
}

export async function POST(req: Request) {
  try {
    const rl = await rateLimitShared(`unsubscribe:${getClientIp(req)}`, { windowMs: 60 * 1000, max: 30 })
    if (!rl.ok) return tooManyRequests(rl.resetAt)

    // One-click unsubscribe (RFC 8058) posts a form body, not JSON, so accept both.
    const contentType = req.headers.get('content-type') ?? ''
    if (contentType.includes('application/json')) {
      const body = await safeParseBody(req)
      if (!body) return badRequest('Invalid JSON body')
      return handle(body.token)
    }

    const url = new URL(req.url)
    return handle(url.searchParams.get('token'))
  } catch (err) {
    console.error('[POST /api/public/unsubscribe]', err)
    return serverError('Could not unsubscribe')
  }
}
