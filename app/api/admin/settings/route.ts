import { badRequest, success, serverError } from '@/lib/api-utils'
import { requireRole } from '@/lib/require-role'
import { safeParseBody } from '@/lib/validation'
import { getAllSettings, upsertSetting } from '@/lib/db/queries'
import { LLM_MODELS, SETTING_KEY_LLM_MODEL } from '@/lib/constants/llm-models'
import { SETTING_KEY_MAX_INVITES } from '@/lib/constants/invites'

export async function GET() {
  try {
    const r = await requireRole(['admin', 'moderator'])
    if (r.error) return r.error
    return success(await getAllSettings())
  } catch (error) {
    console.error('Settings GET error:', error)
    return serverError('Failed to load settings')
  }
}

export async function PATCH(req: Request) {
  try {
    const r = await requireRole(['admin'])
    if (r.error) return r.error

    const body = await safeParseBody(req)
    if (!body) return badRequest('Invalid JSON body')

    const { key, value } = body as { key: string; value: string }
    if (!key || typeof value !== 'string') return badRequest('Missing key or value')

    if (key === SETTING_KEY_LLM_MODEL) {
      const valid = LLM_MODELS.some((m) => m.id === value)
      if (!valid) return badRequest('Invalid model ID')
    }

    if (key === SETTING_KEY_MAX_INVITES) {
      const num = parseInt(value, 10)
      if (isNaN(num) || num < 0 || num > 1000) return badRequest('Invalid invite limit (0-1000)')
    }

    await upsertSetting(key, value)
    return success({ key, value })
  } catch (error) {
    console.error('Settings PATCH error:', error)
    return serverError('Failed to update setting')
  }
}
