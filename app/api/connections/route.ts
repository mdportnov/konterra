import { auth } from '@/auth'
import { unauthorized, success, serverError } from '@/lib/api-utils'
import { getAllConnections } from '@/lib/db/queries'

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return unauthorized()

  try {
    const { searchParams } = new URL(req.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1)
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10) || 50))

    const result = await getAllConnections(session.user.id, page, limit)
    return success(result)
  } catch (err) {
    console.error(err)
    return serverError()
  }
}
