import { auth } from '@/auth'
import { unauthorized, badRequest, notFound, success, serverError, tooManyRequests } from '@/lib/api-utils'
import { geocode } from '@/lib/geocoding'
import { rateLimitShared } from '@/lib/rate-limit'
import { MAX_SHORT_TEXT_LENGTH } from '@/lib/validation'

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return unauthorized()

  try {
    const rl = await rateLimitShared(`geocode:${session.user.id}`, { windowMs: 60 * 1000, max: 60 })
    if (!rl.ok) return tooManyRequests(rl.resetAt)

    const { searchParams } = new URL(req.url)
    const query = searchParams.get('q')

    if (!query) return badRequest('Query required')
    if (query.length > MAX_SHORT_TEXT_LENGTH) return badRequest('Query too long')

    const result = await geocode(query)

    if (!result) return notFound('Location')

    return success(result)
  } catch (err) {
    console.error(err)
    return serverError()
  }
}
