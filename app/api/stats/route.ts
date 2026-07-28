import { auth } from '@/auth'
import { unauthorized, success, serverError } from '@/lib/api-utils'
import { getNetworkStats } from '@/lib/db/queries'

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return unauthorized()

  try {
    const { searchParams } = new URL(req.url)
    const staleDays = Math.min(730, Math.max(1, parseInt(searchParams.get('staleDays') || '90', 10) || 90))
    return success(await getNetworkStats(session.user.id, staleDays))
  } catch (err) {
    console.error('[GET /api/stats]', err)
    return serverError('Failed to compute stats')
  }
}
