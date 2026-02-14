import { auth } from '@/auth'
import { unauthorized, badRequest, success } from '@/lib/api-utils'
import { getVisitedCountries, addVisitedCountry, removeVisitedCountry, setVisitedCountries } from '@/lib/db/queries'
import { safeParseBody } from '@/lib/validation'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return unauthorized()
  return success(await getVisitedCountries(session.user.id))
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return unauthorized()
  const body = await safeParseBody(req)
  if (!body) return badRequest('Invalid JSON body')
  if (typeof body.country !== 'string') return badRequest('Invalid country')
  return success(await addVisitedCountry(session.user.id, body.country))
}

export async function DELETE(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return unauthorized()
  const body = await safeParseBody(req)
  if (!body) return badRequest('Invalid JSON body')
  if (typeof body.country !== 'string') return badRequest('Invalid country')
  return success(await removeVisitedCountry(session.user.id, body.country))
}

export async function PUT(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return unauthorized()
  const body = await safeParseBody(req)
  if (!body) return badRequest('Invalid JSON body')
  if (!Array.isArray(body.countries)) return badRequest('Invalid countries')
  return success(await setVisitedCountries(session.user.id, body.countries))
}
