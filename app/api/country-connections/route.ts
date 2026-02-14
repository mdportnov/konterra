import { auth } from '@/auth'
import { unauthorized, success } from '@/lib/api-utils'
import { getAllCountryConnections } from '@/lib/db/queries'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return unauthorized()

  const items = await getAllCountryConnections(session.user.id)
  return success(items)
}
