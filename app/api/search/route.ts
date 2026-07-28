import { auth } from '@/auth'
import { unauthorized, badRequest, success, serverError, tooManyRequests } from '@/lib/api-utils'
import { searchEverything } from '@/lib/db/queries'
import { rateLimitShared } from '@/lib/rate-limit'

const MAX_QUERY_LENGTH = 200

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return unauthorized()

  try {
    const { searchParams } = new URL(req.url)
    const query = (searchParams.get('q') ?? '').trim()

    if (query.length < 2) return success({ query, hits: [] })
    if (query.length > MAX_QUERY_LENGTH) return badRequest('Query too long')

    const rl = await rateLimitShared(`search:${session.user.id}`, { windowMs: 60 * 1000, max: 120 })
    if (!rl.ok) return tooManyRequests(rl.resetAt)

    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '25', 10) || 25))
    const hits = await searchEverything(session.user.id, query, limit)

    return success({ query, hits })
  } catch (err) {
    console.error('[GET /api/search]', err)
    return serverError('Search failed')
  }
}
