import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { unauthorized, badRequest, notFound, success } from '@/lib/api-utils'
import { updateWishlistCountry, removeWishlistCountry } from '@/lib/db/queries'
import { safeParseBody } from '@/lib/validation'

const PRIORITIES = ['dream', 'high', 'medium', 'low'] as const
const STATUSES = ['idea', 'researching', 'planning', 'ready'] as const
const MAX_NOTES_LENGTH = 2000

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session?.user?.id) return unauthorized()
    const { id } = await params
    const body = await safeParseBody(req)
    if (!body) return badRequest('Invalid JSON body')

    const data: { priority?: string; status?: string; notes?: string | null } = {}
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
    if (body.notes !== undefined) {
      if (typeof body.notes === 'string') {
        if (body.notes.length > MAX_NOTES_LENGTH) return badRequest('Notes too long')
        data.notes = body.notes
      } else {
        data.notes = null
      }
    }

    const entry = await updateWishlistCountry(id, session.user.id, data)
    if (!entry) return notFound('Wishlist entry')
    return success(entry)
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session?.user?.id) return unauthorized()
    const { id } = await params
    await removeWishlistCountry(id, session.user.id)
    return success({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
