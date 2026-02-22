import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { unauthorized, badRequest, success } from '@/lib/api-utils'
import { getWishlistCountries, addWishlistCountry, removeWishlistCountryByName } from '@/lib/db/queries'
import { safeParseBody } from '@/lib/validation'

const PRIORITIES = ['dream', 'high', 'medium', 'low'] as const
const STATUSES = ['idea', 'researching', 'planning', 'ready'] as const
const MAX_NOTES_LENGTH = 2000

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) return unauthorized()
    return success(await getWishlistCountries(session.user.id))
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) return unauthorized()
    const body = await safeParseBody(req)
    if (!body) return badRequest('Invalid JSON body')
    if (typeof body.country !== 'string' || !body.country.trim()) return badRequest('Invalid country')

    const data: { priority?: string; status?: string; notes?: string } = {}
    if (body.priority !== undefined) {
      if (typeof body.priority !== 'string' || !PRIORITIES.includes(body.priority as typeof PRIORITIES[number])) {
        return badRequest('Invalid priority')
      }
      data.priority = body.priority
    }
    if (body.status !== undefined) {
      if (typeof body.status !== 'string' || !STATUSES.includes(body.status as typeof STATUSES[number])) {
        return badRequest('Invalid status')
      }
      data.status = body.status
    }
    if (typeof body.notes === 'string') {
      if (body.notes.length > MAX_NOTES_LENGTH) return badRequest('Notes too long')
      data.notes = body.notes
    }

    const entry = await addWishlistCountry(session.user.id, body.country.trim(), data)
    return success(entry, 201)
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) return unauthorized()
    const body = await safeParseBody(req)
    if (!body) return badRequest('Invalid JSON body')
    if (typeof body.country !== 'string' || !body.country.trim()) return badRequest('Invalid country')
    await removeWishlistCountryByName(session.user.id, body.country.trim())
    return success({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
