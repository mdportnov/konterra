import { auth } from '@/auth'
import { unauthorized, badRequest, success, serverError } from '@/lib/api-utils'
import { safeParseBody } from '@/lib/validation'
import { getDigestPreference, updateDigestPreference } from '@/lib/db/queries'
import { isEmailConfigured } from '@/lib/email/client'

const FREQUENCIES = ['off', 'weekly', 'monthly'] as const

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return unauthorized()

  const pref = await getDigestPreference(session.user.id)
  return success({
    frequency: pref?.digestFrequency ?? 'weekly',
    lastSentAt: pref?.digestLastSentAt ?? null,
    deliveryConfigured: isEmailConfigured(),
  })
}

export async function PATCH(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return unauthorized()

  try {
    const body = await safeParseBody(req)
    if (!body) return badRequest('Invalid JSON body')

    const { frequency } = body as { frequency?: string }
    if (!frequency || !(FREQUENCIES as readonly string[]).includes(frequency)) {
      return badRequest(`frequency must be one of: ${FREQUENCIES.join(', ')}`)
    }

    const updated = await updateDigestPreference(session.user.id, frequency as (typeof FREQUENCIES)[number])
    return success({ frequency: updated?.digestFrequency ?? frequency })
  } catch (err) {
    console.error('[PATCH /api/me/digest]', err)
    return serverError('Failed to update digest preference')
  }
}
