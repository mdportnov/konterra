import { auth } from '@/auth'
import { mergeContacts } from '@/lib/db/queries'
import { unauthorized, badRequest, success } from '@/lib/api-utils'
import { safeParseBody } from '@/lib/validation'

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return unauthorized()

  const body = await safeParseBody(req)
  if (!body) return badRequest('Invalid request body')

  const { winnerId, loserId, fieldOverrides } = body as {
    winnerId?: string
    loserId?: string
    fieldOverrides?: Record<string, unknown>
  }

  if (!winnerId || !loserId) return badRequest('winnerId and loserId are required')
  if (winnerId === loserId) return badRequest('winnerId and loserId must be different')

  try {
    const winner = await mergeContacts(winnerId, loserId, session.user.id, fieldOverrides || {})
    if (!winner) return badRequest('Contacts not found or not owned by user')
    return success({ winner, deletedId: loserId })
  } catch (e) {
    console.error('Merge error:', e)
    return badRequest(e instanceof Error ? e.message : 'Merge failed')
  }
}
