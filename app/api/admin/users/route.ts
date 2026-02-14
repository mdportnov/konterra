import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { unauthorized, badRequest, notFound, success, serverError } from '@/lib/api-utils'
import { getUserById, getAllUsers, createUser, updateUserRole, deleteUser } from '@/lib/db/queries'
import { hash } from 'bcryptjs'

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

  const body = await req.json()
  const { email, name, password, role } = body

  if (!email || !name || !password) {
    return badRequest('Email, name, and password are required')
  }

  if (password.length < 6) {
    return badRequest('Password must be at least 6 characters')
  }

  const validRoles = ['user', 'moderator', 'admin']
  const userRole = validRoles.includes(role) ? role : 'user'

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
    return NextResponse.json({ error: 'Only admins can change roles' }, { status: 403 })
  }

  const body = await req.json()
  const { userId, role } = body

  const validRoles = ['user', 'moderator', 'admin'] as const
  if (!userId || !validRoles.includes(role)) {
    return badRequest('Valid userId and role are required')
  }

  const updated = await updateUserRole(userId, role)
  if (!updated) return notFound('User')

  return success(updated)
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
