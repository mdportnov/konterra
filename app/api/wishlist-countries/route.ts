import { auth } from '@/auth'
import { unauthorized, badRequest, success } from '@/lib/api-utils'
import { getWishlistCountries, addWishlistCountry, removeWishlistCountryByName } from '@/lib/db/queries'
import { safeParseBody } from '@/lib/validation'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return unauthorized()
  return success(await getWishlistCountries(session.user.id))
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return unauthorized()
  const body = await safeParseBody(req)
  if (!body) return badRequest('Invalid JSON body')
  if (typeof body.country !== 'string' || !body.country.trim()) return badRequest('Invalid country')

  const data: { priority?: string; notes?: string } = {}
  if (typeof body.priority === 'string') data.priority = body.priority
  if (typeof body.notes === 'string') data.notes = body.notes

  const entry = await addWishlistCountry(session.user.id, body.country.trim(), data)
  return success(entry, 201)
}

export async function DELETE(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return unauthorized()
  const body = await safeParseBody(req)
  if (!body) return badRequest('Invalid JSON body')
  if (typeof body.country !== 'string') return badRequest('Invalid country')
  await removeWishlistCountryByName(session.user.id, body.country)
  return success({ ok: true })
}
