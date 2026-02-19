const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const URL_RE = /^https?:\/\/.+/
const TELEGRAM_RE = /^@?\w{3,32}$/

export const COMMUNICATION_STYLES = ['direct', 'diplomatic', 'analytical', 'expressive'] as const
export const PREFERRED_CHANNELS = ['email', 'call', 'text', 'in-person', 'linkedin'] as const
export const RESPONSE_SPEEDS = ['immediate', 'same-day', 'slow', 'unreliable'] as const
export const LOYALTY_INDICATORS = ['proven', 'likely', 'neutral', 'unreliable', 'unknown'] as const
export const FINANCIAL_CAPACITIES = ['bootstrapper', 'funded', 'wealthy', 'institutional'] as const
export const RELATIONSHIP_TYPES = ['friend', 'business', 'investor', 'conference', 'mentor', 'colleague', 'family', 'dating', 'professional', 'acquaintance'] as const
export const GENDERS = ['male', 'female'] as const
export const CONNECTION_TYPES = ['knows', 'introduced_by', 'works_with', 'reports_to', 'invested_in', 'referred_by'] as const
export const FAVOR_DIRECTIONS = ['given', 'received'] as const
export const FAVOR_TYPES = ['introduction', 'advice', 'referral', 'money', 'opportunity', 'resource', 'time'] as const
export const FAVOR_VALUES = ['low', 'medium', 'high', 'critical'] as const
export const FAVOR_STATUSES = ['active', 'resolved', 'expired', 'repaid'] as const
export const INTERACTION_TYPES = ['meeting', 'call', 'message', 'email', 'event', 'introduction', 'deal', 'note'] as const
export const INTRODUCTION_STATUSES = ['planned', 'introduced', 'connected', 'failed', 'completed', 'made'] as const

export function validateEnum(value: unknown, allowed: readonly string[], fieldName: string): string | null {
  if (!value) return null
  if (typeof value !== 'string' || !allowed.includes(value)) return `Invalid ${fieldName}`
  return null
}

export function validateMultiEnum(value: unknown, allowed: readonly string[], fieldName: string): string | null {
  if (!value) return null
  if (typeof value !== 'string') return `Invalid ${fieldName}`
  const parts = value.split(',').map((s) => s.trim()).filter(Boolean)
  for (const part of parts) {
    if (!allowed.includes(part)) return `Invalid ${fieldName}: ${part}`
  }
  return null
}

export function validateIntRange(value: unknown, min: number, max: number, fieldName: string): string | null {
  if (value === null || value === undefined) return null
  if (typeof value !== 'number' || !Number.isInteger(value) || value < min || value > max)
    return `${fieldName} must be integer ${min}-${max}`
  return null
}

function validateString(value: unknown, re: RegExp, fieldName: string): string | null {
  if (!value) return null
  if (typeof value !== 'string' || !re.test(value)) return `Invalid ${fieldName}`
  return null
}

export function validateContact(body: Record<string, unknown>, requireName = true): string | null {
  if (requireName) {
    if (!body.name || typeof body.name !== 'string' || body.name.trim() === '')
      return 'Name is required'
  }
  if (body.name !== undefined && body.name !== null) {
    if (typeof body.name !== 'string') return 'Name must be a string'
    if (body.name.trim().length > 200) return 'Name must be 200 characters or less'
  }

  let err: string | null
  err = validateString(body.email, EMAIL_RE, 'email')
  if (err) return err

  const urlFields = ['linkedin', 'twitter', 'instagram', 'github', 'website', 'photo'] as const
  for (const field of urlFields) {
    err = validateString(body[field], URL_RE, field)
    if (err) return `${field} must start with http:// or https://`
  }

  err = validateString(body.telegram, TELEGRAM_RE, 'telegram')
  if (err) return err

  err = validateIntRange(body.rating, 0, 5, 'rating')
  if (err) return err
  err = validateIntRange(body.influenceLevel, 0, 10, 'influenceLevel')
  if (err) return err
  err = validateIntRange(body.networkReach, 0, 10, 'networkReach')
  if (err) return err
  err = validateIntRange(body.trustLevel, 0, 5, 'trustLevel')
  if (err) return err

  err = validateMultiEnum(body.communicationStyle, COMMUNICATION_STYLES, 'communicationStyle')
  if (err) return err
  err = validateMultiEnum(body.preferredChannel, PREFERRED_CHANNELS, 'preferredChannel')
  if (err) return err
  err = validateMultiEnum(body.responseSpeed, RESPONSE_SPEEDS, 'responseSpeed')
  if (err) return err
  err = validateEnum(body.loyaltyIndicator, LOYALTY_INDICATORS, 'loyaltyIndicator')
  if (err) return err
  err = validateEnum(body.financialCapacity, FINANCIAL_CAPACITIES, 'financialCapacity')
  if (err) return err
  err = validateEnum(body.relationshipType, RELATIONSHIP_TYPES, 'relationshipType')
  if (err) return err
  err = validateEnum(body.gender, GENDERS, 'gender')
  if (err) return err

  return null
}

export function validateConnection(body: Record<string, unknown>): string | null {
  const err = validateEnum(body.connectionType, CONNECTION_TYPES, 'connectionType')
  if (err) return err
  return validateIntRange(body.strength, 1, 5, 'strength')
}

export function validateFavor(body: Record<string, unknown>): string | null {
  let err: string | null
  err = validateEnum(body.direction, FAVOR_DIRECTIONS, 'direction')
  if (err) return err
  err = validateEnum(body.type, FAVOR_TYPES, 'type')
  if (err) return err
  return validateEnum(body.value, FAVOR_VALUES, 'value')
}

export function validateInteraction(body: Record<string, unknown>): string | null {
  const err = validateEnum(body.type, INTERACTION_TYPES, 'type')
  if (err) return err
  if (!body.date) return null
  const d = new Date(body.date as string)
  if (isNaN(d.getTime())) return 'Invalid date'
  const now = new Date()
  now.setDate(now.getDate() + 1)
  if (d > now) return 'Date cannot be in the future'
  if (d.getFullYear() < 1970) return 'Date is too far in the past'
  return null
}

export async function safeParseBody(req: Request): Promise<Record<string, unknown> | null> {
  try {
    return await req.json()
  } catch {
    return null
  }
}
