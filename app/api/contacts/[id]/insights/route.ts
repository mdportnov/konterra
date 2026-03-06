import { type NextRequest } from 'next/server'
import { auth } from '@/auth'
import { unauthorized, badRequest, notFound, success, serverError } from '@/lib/api-utils'
import { safeParseBody } from '@/lib/validation'
import { db } from '@/lib/db'
import { contacts } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { chatCompletion } from '@/lib/llm'
import { buildInsightMessages, INSIGHT_TYPES, type InsightType } from '@/lib/prompts'
import { getInteractionsByContactId, getFavorsByContactId } from '@/lib/db/queries'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session?.user?.id) return unauthorized()

    const { id } = await params
    const body = await safeParseBody(req)
    if (!body) return badRequest('Invalid JSON body')

    const insightType = body.type as InsightType
    if (!insightType || !INSIGHT_TYPES.includes(insightType)) {
      return badRequest(`Invalid insight type. Must be one of: ${INSIGHT_TYPES.join(', ')}`)
    }

    const extraContext = typeof body.context === 'string' ? body.context : undefined

    const [targetContact, selfContact, interactions, favors] = await Promise.all([
      db.query.contacts.findFirst({
        where: and(eq(contacts.id, id), eq(contacts.userId, session.user.id)),
      }),
      db.query.contacts.findFirst({
        where: and(eq(contacts.userId, session.user.id), eq(contacts.isSelf, true)),
      }),
      getInteractionsByContactId(id),
      getFavorsByContactId(id, session.user.id),
    ])

    if (!targetContact) return notFound('Contact')
    if (!selfContact) return badRequest('Please fill in your own profile first (self contact)')

    const messages = buildInsightMessages(insightType, selfContact, targetContact, {
      interactions,
      favors,
      extraContext,
    })
    const response = await chatCompletion(messages)

    return success({ type: insightType, content: response.content, model: response.model })
  } catch (error) {
    if (error instanceof Error && error.message.includes('OPENROUTER_API_KEY')) {
      return badRequest('LLM integration is not configured. Please add OPENROUTER_API_KEY to your environment.')
    }
    console.error('Insights error:', error)
    return serverError('Failed to generate insights')
  }
}
