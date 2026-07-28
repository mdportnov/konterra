import { auth } from '@/auth'
import { unauthorized, success, serverError } from '@/lib/api-utils'
import { getTripsByUserId } from '@/lib/db/queries'
import { computeTravelDays } from '@/lib/travel/days'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return unauthorized()

  try {
    const trips = await getTripsByUserId(session.user.id)
    return success(computeTravelDays(trips))
  } catch (err) {
    console.error('[GET /api/travel/days]', err)
    return serverError('Failed to compute travel days')
  }
}
