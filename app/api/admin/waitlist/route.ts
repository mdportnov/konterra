import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { unauthorized, badRequest, notFound, success, serverError } from '@/lib/api-utils'
import {
  getUserById, getUserByEmail, createUser,
  getWaitlistEntries, getWaitlistEntryById, updateWaitlistStatus, deleteWaitlistEntry,
} from '@/lib/db/queries'
import { hash } from 'bcryptjs'

function forbidden(msg = 'Forbidden') {
  return NextResponse.json({ error: msg }, { status: 403 })
}

async function requireAdmin() {
  const session = await auth()
  if (!session?.user?.id) return { error: unauthorized() }
  const user = await getUserById(session.user.id)
  if (!user || (user.role !== 'admin' && user.role !== 'moderator')) {
    return { error: forbidden() }
  }
  return { user, session }
}

export async function GET(req: Request) {
  const result = await requireAdmin()
  if ('error' in result && result.error) return result.error

  try {
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status') as 'pending' | 'approved' | 'rejected' | null

    const validStatuses = ['pending', 'approved', 'rejected']
    const filter = status && validStatuses.includes(status) ? status : undefined

    const entries = await getWaitlistEntries(filter)
    return success(entries)
  } catch (e) {
    console.error('Waitlist GET error:', e)
    return serverError('Failed to fetch waitlist entries')
  }
}

export async function PATCH(req: Request) {
  const result = await requireAdmin()
  if ('error' in result && result.error) return result.error
  const { user: currentUser } = result

  try {
    const body = await req.json()
    const { id, action, adminNote, password } = body

    if (!id || typeof id !== 'string') return badRequest('id is required')
    if (!action || !['approve', 'reject'].includes(action)) {
      return badRequest('action must be "approve" or "reject"')
    }

    const entry = await getWaitlistEntryById(id)
    if (!entry) return notFound('Waitlist entry')

    if (entry.status !== 'pending') {
      return badRequest(`Entry already ${entry.status}`)
    }

    if (action === 'approve') {
      const existingUser = await getUserByEmail(entry.email)
      if (existingUser) {
        return NextResponse.json(
          { error: 'A user with this email already exists' },
          { status: 409 },
        )
      }

      const userPassword = password && typeof password === 'string' && password.length >= 6
        ? password
        : crypto.randomUUID().slice(0, 12)

      const hashedPassword = await hash(userPassword, 12)
      const newUser = await createUser({
        email: entry.email,
        name: entry.name,
        password: hashedPassword,
        role: 'user',
      })

      await updateWaitlistStatus(id, 'approved', currentUser!.id, adminNote)

      return success({
        entry: { ...entry, status: 'approved' },
        user: newUser,
        generatedPassword: userPassword,
      })
    }

    const updated = await updateWaitlistStatus(id, 'rejected', currentUser!.id, adminNote)
    return success(updated)
  } catch {
    return serverError('Failed to process waitlist action')
  }
}

export async function DELETE(req: Request) {
  const result = await requireAdmin()
  if ('error' in result && result.error) return result.error
  const { user: currentUser } = result

  if (currentUser!.role !== 'admin') {
    return forbidden('Only admins can delete waitlist entries')
  }

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')

  if (!id) return badRequest('id is required')

  const deleted = await deleteWaitlistEntry(id)
  if (!deleted) return notFound('Waitlist entry')

  return success({ success: true })
}
