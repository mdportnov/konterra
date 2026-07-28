import { auth } from '@/auth'
import { unauthorized, badRequest, notFound, success, serverError, tooManyRequests } from '@/lib/api-utils'
import { safeParseBody, validateMaxLength, MAX_DESCRIPTION_LENGTH } from '@/lib/validation'
import { getContactById, updateIntroduction, getUserProfile } from '@/lib/db/queries'
import { draftIntroduction } from '@/lib/intro-draft'
import { rateLimitShared } from '@/lib/rate-limit'

const TONES = ['warm', 'concise', 'formal'] as const

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return unauthorized()

  try {
    // Each draft is a paid model call, so the ceiling is low and per-user.
    const rl = await rateLimitShared(`intro-draft:${session.user.id}`, { windowMs: 60 * 60 * 1000, max: 30 })
    if (!rl.ok) return tooManyRequests(rl.resetAt)

    const body = await safeParseBody(req)
    if (!body) return badRequest('Invalid JSON body')

    const { contactAId, contactBId, reason, tone, introductionId } = body as Record<string, unknown>
    if (typeof contactAId !== 'string' || typeof contactBId !== 'string') {
      return badRequest('contactAId and contactBId are required')
    }
    if (contactAId === contactBId) return badRequest('Pick two different contacts')

    const lengthError = validateMaxLength(reason, MAX_DESCRIPTION_LENGTH, 'reason')
    if (lengthError) return badRequest(lengthError)

    if (tone !== undefined && (typeof tone !== 'string' || !(TONES as readonly string[]).includes(tone))) {
      return badRequest(`tone must be one of: ${TONES.join(', ')}`)
    }

    const [contactA, contactB, profile] = await Promise.all([
      getContactById(contactAId, session.user.id),
      getContactById(contactBId, session.user.id),
      getUserProfile(session.user.id),
    ])
    if (!contactA || !contactB) return notFound('Contact')

    const draft = await draftIntroduction({
      contactA,
      contactB,
      senderName: profile?.name ?? session.user.name ?? 'I',
      reason: typeof reason === 'string' ? reason : null,
      tone: tone as (typeof TONES)[number] | undefined,
    })

    // Persist onto the introduction record when one already exists, so the draft survives
    // a page reload and can be edited later.
    if (typeof introductionId === 'string') {
      await updateIntroduction(introductionId, session.user.id, {
        draftText: draft,
        draftGeneratedAt: new Date(),
      })
    }

    return success({ draft })
  } catch (err) {
    if (err instanceof Error && err.message.includes('OPENROUTER_API_KEY')) {
      return badRequest('AI drafting is not configured on this deployment.')
    }
    console.error('[POST /api/introductions/draft]', err)
    return serverError('Failed to draft the introduction')
  }
}
