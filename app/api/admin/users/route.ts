import { NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
import { auth } from '@/auth'
import { unauthorized, badRequest, notFound, success, serverError } from '@/lib/api-utils'
import { getUserById, getAllUsers, createUser, updateUserRole, updateUser, deleteUser } from '@/lib/db/queries'
import { hash } from 'bcryptjs'
import { safeParseBody } from '@/lib/validation'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return unauthorized()

  const user = await getUserById(session.user.id)
  if (!user || (user.role !== 'admin' && user.role !== 'moderator')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const users = await getAllUsers()
  return success(users)
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return unauthorized()

  const currentUser = await getUserById(session.user.id)
  if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'moderator')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

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

  if (userRole === 'admin' && currentUser.role !== 'admin') {
    return NextResponse.json({ error: 'Only admins can create admin users' }, { status: 403 })
  }

  try {
    const hashedPassword = await hash(password, 12)
    const newUser = await createUser({
      email,
      name,
      password: hashedPassword,
      role: userRole,
    })
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
  const session = await auth()
  if (!session?.user?.id) return unauthorized()

  const currentUser = await getUserById(session.user.id)
  if (!currentUser || currentUser.role !== 'admin') {
    return NextResponse.json({ error: 'Only admins can update users' }, { status: 403 })
  }

  const body = await safeParseBody(req)
  if (!body) return badRequest('Invalid JSON body')
  const { userId, role, name, email, password, maxInvites } = body as Record<string, unknown>

  if (!userId || typeof userId !== 'string') return badRequest('userId is required')

  const validRoles = ['user', 'moderator', 'admin'] as const

  if (role && !name && !email && !password && maxInvites === undefined) {
    if (typeof role !== 'string' || !(validRoles as readonly string[]).includes(role)) return badRequest('Invalid role')
    const updated = await updateUserRole(userId, role as typeof validRoles[number])
    if (!updated) return notFound('User')
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
  const session = await auth()
  if (!session?.user?.id) return unauthorized()

  const currentUser = await getUserById(session.user.id)
  if (!currentUser || currentUser.role !== 'admin') {
    return NextResponse.json({ error: 'Only admins can delete users' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const userId = searchParams.get('id')

  if (!userId) return badRequest('User ID is required')

  if (userId === session.user.id) {
    return badRequest('Cannot delete your own account')
  }

  const deleted = await deleteUser(userId)
  if (!deleted) return notFound('User')

  return success({ success: true })
}
