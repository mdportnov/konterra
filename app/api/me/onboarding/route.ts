import { auth } from '@/auth'
import { unauthorized, notFound, success, serverError } from '@/lib/api-utils'
import { markUserOnboarded } from '@/lib/db/queries'

export async function POST() {
  const session = await auth()
  if (!session?.user?.id) return unauthorized()

  try {
    const updated = await markUserOnboarded(session.user.id)
    if (!updated) return notFound('User')
    return success(updated)
  } catch (err) {
    console.error('[POST /api/me/onboarding]', err instanceof Error ? err.message : err)
    return serverError('Failed to complete onboarding')
  }
}
