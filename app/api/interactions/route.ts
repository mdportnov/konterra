import { auth } from '@/auth'
import { unauthorized, success } from '@/lib/api-utils'
import { getRecentInteractions } from '@/lib/db/queries'

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return unauthorized()

  const { searchParams } = new URL(req.url)
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '15', 10) || 15))
  const offset = Math.max(0, parseInt(searchParams.get('offset') || '0', 10) || 0)

  const result = await getRecentInteractions(session.user.id, limit, offset)
  return success(result)
}
