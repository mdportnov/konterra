import { auth } from '@/auth'
import { unauthorized, success } from '@/lib/api-utils'
import { getAllFavors } from '@/lib/db/queries'

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return unauthorized()

  const { searchParams } = new URL(req.url)
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1)
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10) || 50))

  const result = await getAllFavors(session.user.id, page, limit)
  return success(result)
}
