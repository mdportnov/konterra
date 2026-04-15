import { NextResponse } from 'next/server'
import { badRequest, notFound, success, serverError } from '@/lib/api-utils'
import { requireRole } from '@/lib/require-role'
import {
  getUserByEmail, createUser,
  getWaitlistEntries, getWaitlistEntryById, updateWaitlistStatus, deleteWaitlistEntry, writeAuditLog,
} from '@/lib/db/queries'
import { hash } from 'bcryptjs'
import { safeParseBody } from '@/lib/validation'

export async function GET(req: Request) {
  const r = await requireRole(['admin', 'moderator'])
  if (r.error) return r.error

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
  const r = await requireRole(['admin', 'moderator'])
  if (r.error) return r.error

  try {
    const body = await safeParseBody(req)
    if (!body) return badRequest('Invalid JSON body')
    const { id, action, adminNote, password } = body as Record<string, unknown>

    if (!id || typeof id !== 'string') return badRequest('id is required')
    if (!action || typeof action !== 'string' || !['approve', 'reject'].includes(action)) {
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

      const userPassword = password && typeof password === 'string' && password.length >= 8
        ? password
        : crypto.randomUUID().slice(0, 12)

      const hashedPassword = await hash(userPassword, 12)
      const newUser = await createUser({
        email: entry.email,
        name: entry.name,
        password: hashedPassword,
        role: 'user',
      })

      const note = typeof adminNote === 'string' ? adminNote : undefined
      await updateWaitlistStatus(id, 'approved', r.userId, note)
      writeAuditLog({ userId: r.userId, action: 'waitlist_approve', targetId: id, targetType: 'waitlist', detail: `Approved ${entry.email}` })
      writeAuditLog({ userId: r.userId, action: 'user_create', targetId: newUser.id, targetType: 'user', detail: `Created from waitlist: ${entry.email}` })

      return success({
        entry: { ...entry, status: 'approved' },
        user: newUser,
        generatedPassword: userPassword,
      })
    }

    const note = typeof adminNote === 'string' ? adminNote : undefined
    const updated = await updateWaitlistStatus(id, 'rejected', r.userId, note)
    writeAuditLog({ userId: r.userId, action: 'waitlist_reject', targetId: id, targetType: 'waitlist', detail: `Rejected ${entry.email}` })
    return success(updated)
  } catch {
    return serverError('Failed to process waitlist action')
  }
}

export async function DELETE(req: Request) {
  const r = await requireRole(['admin'])
  if (r.error) return r.error

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')

  if (!id) return badRequest('id is required')

  const deleted = await deleteWaitlistEntry(id)
  if (!deleted) return notFound('Waitlist entry')

  return success({ success: true })
}
