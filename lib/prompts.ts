import type { Contact } from '@/lib/db/schema'

export const INSIGHT_TYPES = [
  'networking_strategy',
  'mutual_value',
  'conversation_starters',
  'follow_up_plan',
] as const

export type InsightType = (typeof INSIGHT_TYPES)[number]

export const INSIGHT_LABELS: Record<InsightType, string> = {
  networking_strategy: 'Networking Strategy',
  mutual_value: 'Mutual Value Exchange',
  conversation_starters: 'Conversation Starters',
  follow_up_plan: 'Follow-up Plan',
}

export const INSIGHT_DESCRIPTIONS: Record<InsightType, string> = {
  networking_strategy: 'How to approach and build a relationship with this person',
  mutual_value: 'What you can offer each other and how to create win-win situations',
  conversation_starters: 'Specific topics and questions to bring up in your next interaction',
  follow_up_plan: 'Concrete steps to maintain and deepen this connection over time',
}

function formatContactProfile(contact: Contact): string {
  const parts: string[] = []
  parts.push(`Name: ${contact.name}`)
  if (contact.company) parts.push(`Company: ${contact.company}`)
  if (contact.role) parts.push(`Role: ${contact.role}`)
  if (contact.city || contact.country) parts.push(`Location: ${[contact.city, contact.country].filter(Boolean).join(', ')}`)
  if (contact.relationshipType) parts.push(`Relationship type: ${contact.relationshipType}`)
  if (contact.metAt) parts.push(`Met at: ${contact.metAt}`)
  if (contact.personalInterests?.length) parts.push(`Personal interests: ${contact.personalInterests.join(', ')}`)
  if (contact.professionalGoals?.length) parts.push(`Professional goals: ${contact.professionalGoals.join(', ')}`)
  if (contact.painPoints?.length) parts.push(`Pain points: ${contact.painPoints.join(', ')}`)
  if (contact.motivations?.length) parts.push(`Motivations: ${contact.motivations.join(', ')}`)
  if (contact.communicationStyle) parts.push(`Communication style: ${contact.communicationStyle}`)
  if (contact.preferredChannel) parts.push(`Preferred channel: ${contact.preferredChannel}`)
  if (contact.influenceLevel) parts.push(`Influence level: ${contact.influenceLevel}/10`)
  if (contact.networkReach) parts.push(`Network reach: ${contact.networkReach}/10`)
  if (contact.trustLevel) parts.push(`Trust level: ${contact.trustLevel}/5`)
  if (contact.loyaltyIndicator) parts.push(`Loyalty: ${contact.loyaltyIndicator}`)
  if (contact.financialCapacity) parts.push(`Financial capacity: ${contact.financialCapacity}`)
  if (contact.tags?.length) parts.push(`Tags: ${contact.tags.join(', ')}`)
  if (contact.notes) parts.push(`Notes: ${contact.notes}`)
  return parts.join('\n')
}

const SYSTEM_PROMPT = `You are a strategic networking advisor. You help people build meaningful professional and personal relationships. You provide specific, actionable advice based on available information about both parties. Be concise, practical, and culturally aware. Respond in the same language that the user's notes and profile are written in. If the information is in Russian, respond in Russian. If in English, respond in English.`

const INSIGHT_PROMPTS: Record<InsightType, string> = {
  networking_strategy: `Analyze the relationship between me and this contact. Suggest a concrete networking strategy:
- What approach would work best given their communication style and our relationship type?
- What are the key opportunities to strengthen this connection?
- What should I avoid?
Provide 3-5 specific, actionable recommendations.`,

  mutual_value: `Based on what you know about me and this contact, identify mutual value exchange opportunities:
- What can I offer this person based on my background and their needs/pain points?
- What can they offer me based on their background and my goals?
- What collaborative projects or introductions could benefit both of us?
Provide specific, concrete suggestions, not generic advice.`,

  conversation_starters: `Generate 5-7 conversation starters or topics for my next interaction with this person:
- Reference their interests, goals, or recent context where possible
- Include both professional and personal topics
- Vary the depth: some light, some deeper
- Consider their communication style
Make them natural and specific, not generic small talk.`,

  follow_up_plan: `Create a concrete follow-up plan for maintaining and deepening my relationship with this contact:
- Suggest specific touchpoints with timing (next week, next month, quarterly)
- Recommend what to share or discuss at each point
- Consider their preferred communication channel
- Include both value-giving and relationship-building actions
Make it realistic and actionable.`,
}

export function buildInsightMessages(
  insightType: InsightType,
  selfContact: Contact,
  targetContact: Contact,
  extraContext?: string,
): { role: 'system' | 'user'; content: string }[] {
  const userMessage = [
    '## About me:',
    formatContactProfile(selfContact),
    '',
    '## About this contact:',
    formatContactProfile(targetContact),
  ]

  if (extraContext) {
    userMessage.push('', '## Additional context:', extraContext)
  }

  userMessage.push('', '## Task:', INSIGHT_PROMPTS[insightType])

  return [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: userMessage.join('\n') },
  ]
}
