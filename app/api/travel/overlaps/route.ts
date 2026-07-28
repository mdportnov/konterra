import { auth } from '@/auth'
import { unauthorized, success, serverError } from '@/lib/api-utils'
import {
  getAllContactsByUserId,
  getTripsByUserId,
  getLocationHistoryByUserId,
  getInteractionDatesByUserId,
} from '@/lib/db/queries'
import { computeOverlaps } from '@/lib/travel/overlaps'

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return unauthorized()

  try {
    const { searchParams } = new URL(req.url)
    const horizonDays = Math.min(730, Math.max(1, parseInt(searchParams.get('horizon') || '365', 10) || 365))

    const [trips, contacts, locationHistory, interactionDatesByContact] = await Promise.all([
      getTripsByUserId(session.user.id),
      getAllContactsByUserId(session.user.id),
      getLocationHistoryByUserId(session.user.id),
      getInteractionDatesByUserId(session.user.id),
    ])

    return success(
      computeOverlaps({ trips, contacts, locationHistory, interactionDatesByContact, horizonDays }),
    )
  } catch (err) {
    console.error('[GET /api/travel/overlaps]', err)
    return serverError('Failed to compute overlaps')
  }
}
