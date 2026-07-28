import { auth } from '@/auth'
import { unauthorized, badRequest, notFound, success, serverError } from '@/lib/api-utils'
import { safeParseBody } from '@/lib/validation'
import { getOnboardingStatus, markUserOnboarded, saveOnboardingProgress } from '@/lib/db/queries'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return unauthorized()

  try {
    return success(await getOnboardingStatus(session.user.id))
  } catch (err) {
    console.error('[GET /api/me/onboarding]', err instanceof Error ? err.message : err)
    return serverError('Failed to load onboarding status')
  }
}

/**
 * Marks the wizard finished, and optionally records the step reached so a user who closes
 * the tab mid-setup resumes where they were instead of starting over.
 */
export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return unauthorized()

  try {
    const body = await safeParseBody(req)
    const wizardStep = body?.wizardStep
    const complete = body?.complete !== false

    if (wizardStep !== undefined && (typeof wizardStep !== 'number' || !Number.isInteger(wizardStep) || wizardStep < 0 || wizardStep > 20)) {
      return badRequest('wizardStep must be an integer between 0 and 20')
    }

    await saveOnboardingProgress(session.user.id, {
      wizardStep: typeof wizardStep === 'number' ? wizardStep : undefined,
      dismissed: complete ? true : undefined,
    })

    if (complete) {
      const updated = await markUserOnboarded(session.user.id)
      if (!updated) return notFound('User')
    }

    return success(await getOnboardingStatus(session.user.id))
  } catch (err) {
    console.error('[POST /api/me/onboarding]', err instanceof Error ? err.message : err)
    return serverError('Failed to save onboarding progress')
  }
}
