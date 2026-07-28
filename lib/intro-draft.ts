import type { Contact } from '@/lib/db/schema'
import { chatCompletion } from '@/lib/llm'

/**
 * Drafts the double opt-in introduction email the user would otherwise stall on writing.
 *
 * The prompt is strict about not inventing facts: an intro that misstates what someone
 * does is worse than no intro, and the model only sees whatever the CRM happens to hold.
 */

const SYSTEM_PROMPT = `You write short, warm, professional introduction emails connecting two people.

Rules you must follow:
- Use ONLY the facts given. Never invent employers, titles, achievements, mutual friends, or history.
- If a detail is missing, leave it out rather than guessing.
- Keep it under 150 words. Plain text, no markdown, no placeholders like [Name].
- Open with one line on why these two should meet, then one or two lines on each person.
- Close by handing the thread over to them ("I'll let you two take it from here").
- Write in the sender's voice, first person, no corporate filler.`

function describe(contact: Contact, label: string): string {
  const parts: string[] = [`${label}: ${contact.name}`]
  if (contact.role && contact.company) parts.push(`${contact.role} at ${contact.company}`)
  else if (contact.role) parts.push(contact.role)
  else if (contact.company) parts.push(contact.company)
  if (contact.city || contact.country) parts.push(`based in ${[contact.city, contact.country].filter(Boolean).join(', ')}`)
  if (contact.relationshipType) parts.push(`known to the sender as a ${contact.relationshipType} contact`)
  if (contact.metAt) parts.push(`met at ${contact.metAt}`)
  if (contact.professionalGoals?.length) parts.push(`working towards: ${contact.professionalGoals.join('; ')}`)
  if (contact.painPoints?.length) parts.push(`struggling with: ${contact.painPoints.join('; ')}`)
  if (contact.personalInterests?.length) parts.push(`interested in: ${contact.personalInterests.join('; ')}`)
  if (contact.tags?.length) parts.push(`tags: ${contact.tags.join(', ')}`)
  return parts.join('. ')
}

export interface IntroDraftInput {
  contactA: Contact
  contactB: Contact
  senderName: string
  reason?: string | null
  tone?: 'warm' | 'concise' | 'formal'
}

export function buildIntroPrompt({ contactA, contactB, senderName, reason, tone }: IntroDraftInput): string {
  const lines = [
    `Sender (the person writing): ${senderName}`,
    describe(contactA, 'Person A'),
    describe(contactB, 'Person B'),
  ]
  if (reason?.trim()) lines.push(`Why the sender wants to connect them: ${reason.trim()}`)
  lines.push(`Preferred tone: ${tone ?? 'warm'}`)
  lines.push('Write the introduction email body only. No subject line.')
  return lines.join('\n')
}

export async function draftIntroduction(input: IntroDraftInput): Promise<string> {
  const { content } = await chatCompletion(
    [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: buildIntroPrompt(input) },
    ],
    { temperature: 0.6, maxTokens: 500 },
  )
  return content.trim()
}
