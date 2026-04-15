import { NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
import { badRequest, notFound, success, serverError, forbidden } from '@/lib/api-utils'
import { requireRole } from '@/lib/require-role'
import { getAllUsers, createUser, updateUserRole, updateUser, deleteUser, writeAuditLog } from '@/lib/db/queries'
import { hash } from 'bcryptjs'
import { safeParseBody } from '@/lib/validation'

export async function GET() {
  const r = await requireRole(['admin', 'moderator'])
  if (r.error) return r.error
  return success(await getAllUsers())
}

export async function POST(req: Request) {
  const r = await requireRole(['admin', 'moderator'])
  if (r.error) return r.error

  const body = await safeParseBody(req)
  if (!body) return badRequest('Invalid JSON body')
  const { email, name, password, role } = body as Record<string, unknown>

  if (!email || typeof email !== 'string' || !name || typeof name !== 'string' || !password || typeof password !== 'string') {
    return badRequest('Email, name, and password are required')
  }

  if (password.length < 8) {
    return badRequest('Password must be at least 8 characters')
  }

  const validRoles = ['user', 'moderator', 'admin'] as const
  const userRole = (typeof role === 'string' && (validRoles as readonly string[]).includes(role)) ? role as typeof validRoles[number] : 'user'

  if (userRole === 'admin' && r.role !== 'admin') {
    return forbidden('Only admins can create admin users')
  }

  try {
    const hashedPassword = await hash(password, 12)
    const newUser = await createUser({
      email,
      name,
      password: hashedPassword,
      role: userRole,
    })
    writeAuditLog({ userId: r.userId, action: 'user_create', targetId: newUser.id, targetType: 'user', detail: `Created user ${email} with role ${userRole}` })
    return success(newUser, 201)
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    if (message.includes('unique') || message.includes('duplicate')) {
      return NextResponse.json({ error: 'A user with this email already exists' }, { status: 409 })
    }
    return serverError('Failed to create user')
  }
}

export async function PATCH(req: Request) {
  const r = await requireRole(['admin'])
  if (r.error) return r.error

  const body = await safeParseBody(req)
  if (!body) return badRequest('Invalid JSON body')
  const { userId, role, name, email, password, maxInvites } = body as Record<string, unknown>

  if (!userId || typeof userId !== 'string') return badRequest('userId is required')

  const validRoles = ['user', 'moderator', 'admin'] as const

  if (role && !name && !email && !password && maxInvites === undefined) {
    if (typeof role !== 'string' || !(validRoles as readonly string[]).includes(role)) return badRequest('Invalid role')
    const updated = await updateUserRole(userId, role as typeof validRoles[number])
    if (!updated) return notFound('User')
    writeAuditLog({ userId: r.userId, action: 'role_change', targetId: userId, targetType: 'user', detail: `Role changed to ${role}` })
    return success(updated)
  }

  const updates: { name?: string; email?: string; role?: 'user' | 'moderator' | 'admin'; password?: string; maxInvites?: number | null } = {}
  if (name !== undefined && typeof name === 'string') updates.name = name
  if (email !== undefined && typeof email === 'string') updates.email = email
  if (role !== undefined) {
    if (typeof role !== 'string' || !(validRoles as readonly string[]).includes(role)) return badRequest('Invalid role')
    updates.role = role as typeof validRoles[number]
  }
  if (password !== undefined && typeof password === 'string') {
    if (password.length < 8) return badRequest('Password must be at least 8 characters')
    updates.password = await hash(password, 12)
  }
  if (maxInvites !== undefined) {
    if (maxInvites === null) {
      updates.maxInvites = null
    } else {
      const num = typeof maxInvites === 'number' ? maxInvites : parseInt(String(maxInvites), 10)
      if (isNaN(num) || num < 0 || num > 1000) return badRequest('Invalid invite limit (0-1000)')
      updates.maxInvites = num
    }
  }

  try {
    const updated = await updateUser(userId, updates)
    if (!updated) return notFound('User')
    if (updates.role) writeAuditLog({ userId: r.userId, action: 'role_change', targetId: userId, targetType: 'user', detail: `Role changed to ${updates.role}` })
    writeAuditLog({ userId: r.userId, action: 'user_update', targetId: userId, targetType: 'user', detail: `Updated fields: ${Object.keys(updates).join(', ')}` })
    return success(updated)
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    if (message.includes('unique') || message.includes('duplicate')) {
      return NextResponse.json({ error: 'A user with this email already exists' }, { status: 409 })
    }
    return serverError('Failed to update user')
  }
}

export async function DELETE(req: Request) {
  const r = await requireRole(['admin'])
  if (r.error) return r.error

  const { searchParams } = new URL(req.url)
  const userId = searchParams.get('id')

  if (!userId) return badRequest('User ID is required')
  if (userId === r.userId) return badRequest('Cannot delete your own account')

  const deleted = await deleteUser(userId)
  if (!deleted) return notFound('User')
  writeAuditLog({ userId: r.userId, action: 'user_delete', targetId: userId, targetType: 'user' })

  return success({ success: true })
}
