import { auth } from '@/auth'
import { getContactById, updateContact, deleteContact } from '@/lib/db/queries'
import { geocode } from '@/lib/geocoding'
import { validateContact, safeParseBody } from '@/lib/validation'
import { toStringOrNull, toDateOrNull, unauthorized, badRequest, notFound, success } from '@/lib/api-utils'

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return unauthorized()

  const { id } = await params
  const contact = await getContactById(id, session.user.id)

  if (!contact) return notFound('Contact')

  return success(contact)
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return unauthorized()

  const { id } = await params
  const body = await safeParseBody(req)
  if (!body) return badRequest('Invalid JSON body')

  const validationError = validateContact(body, false)
  if (validationError) return badRequest(validationError)

  let { lat, lng } = body as { lat?: number; lng?: number }

  if ((body.city || body.country) && (!lat || !lng)) {
    const locationQuery = [body.city, body.country].filter(Boolean).join(', ')
    if (locationQuery) {
      try {
        const result = await geocode(locationQuery)
        if (result) {
          lat = result.lat
          lng = result.lng
        }
      } catch (e) {
        console.error('Geocoding failed:', e)
      }
    }
  }

  const updates: Record<string, unknown> = {}
  if (body.name !== undefined) updates.name = body.name
  if (body.photo !== undefined) updates.photo = toStringOrNull(body.photo)
  if (body.company !== undefined) updates.company = toStringOrNull(body.company)
  if (body.role !== undefined) updates.role = toStringOrNull(body.role)
  if (body.city !== undefined) updates.city = toStringOrNull(body.city)
  if (body.country !== undefined) updates.country = toStringOrNull(body.country)
  if (body.address !== undefined) updates.address = toStringOrNull(body.address)
  if (body.email !== undefined) updates.email = toStringOrNull(body.email)
  if (body.phone !== undefined) updates.phone = toStringOrNull(body.phone)
  if (body.linkedin !== undefined) updates.linkedin = toStringOrNull(body.linkedin)
  if (body.twitter !== undefined) updates.twitter = toStringOrNull(body.twitter)
  if (body.telegram !== undefined) updates.telegram = toStringOrNull(body.telegram)
  if (body.instagram !== undefined) updates.instagram = toStringOrNull(body.instagram)
  if (body.github !== undefined) updates.github = toStringOrNull(body.github)
  if (body.website !== undefined) updates.website = toStringOrNull(body.website)
  if (body.tags !== undefined) updates.tags = Array.isArray(body.tags) ? body.tags : null
  if (body.notes !== undefined) updates.notes = toStringOrNull(body.notes)
  if (body.rating !== undefined) updates.rating = typeof body.rating === 'number' ? body.rating : null
  if (body.gender !== undefined) updates.gender = toStringOrNull(body.gender)
  if (body.relationshipType !== undefined) updates.relationshipType = toStringOrNull(body.relationshipType)
  if (body.metAt !== undefined) updates.metAt = toStringOrNull(body.metAt)
  if (body.metDate !== undefined) updates.metDate = toDateOrNull(body.metDate)
  if (body.nextFollowUp !== undefined) updates.nextFollowUp = toDateOrNull(body.nextFollowUp)
  if (body.lastContactedAt !== undefined) updates.lastContactedAt = toDateOrNull(body.lastContactedAt)
  if (body.communicationStyle !== undefined) updates.communicationStyle = toStringOrNull(body.communicationStyle)
  if (body.preferredChannel !== undefined) updates.preferredChannel = toStringOrNull(body.preferredChannel)
  if (body.responseSpeed !== undefined) updates.responseSpeed = toStringOrNull(body.responseSpeed)
  if (body.timezone !== undefined) updates.timezone = toStringOrNull(body.timezone)
  if (body.language !== undefined) updates.language = toStringOrNull(body.language)
  if (body.birthday !== undefined) updates.birthday = toDateOrNull(body.birthday)
  if (body.personalInterests !== undefined) updates.personalInterests = Array.isArray(body.personalInterests) ? body.personalInterests : null
  if (body.professionalGoals !== undefined) updates.professionalGoals = Array.isArray(body.professionalGoals) ? body.professionalGoals : null
  if (body.painPoints !== undefined) updates.painPoints = Array.isArray(body.painPoints) ? body.painPoints : null
  if (body.influenceLevel !== undefined) updates.influenceLevel = typeof body.influenceLevel === 'number' ? body.influenceLevel : null
  if (body.networkReach !== undefined) updates.networkReach = typeof body.networkReach === 'number' ? body.networkReach : null
  if (body.trustLevel !== undefined) updates.trustLevel = typeof body.trustLevel === 'number' ? body.trustLevel : null
  if (body.loyaltyIndicator !== undefined) updates.loyaltyIndicator = toStringOrNull(body.loyaltyIndicator)
  if (body.financialCapacity !== undefined) updates.financialCapacity = toStringOrNull(body.financialCapacity)
  if (body.motivations !== undefined) updates.motivations = Array.isArray(body.motivations) ? body.motivations : null
  updates.lat = lat ?? null
  updates.lng = lng ?? null

  const contact = await updateContact(id, session.user.id, updates)

  if (!contact) return notFound('Contact')

  return success(contact)
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return unauthorized()

  const { id } = await params
  await deleteContact(id, session.user.id)
  return success({ success: true })
}
