import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getUserById, getAllUsers, createUser, updateUserRole, deleteUser } from '@/lib/db/queries'
import { hash } from 'bcryptjs'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = await getUserById(session.user.id)
  if (!user || (user.role !== 'admin' && user.role !== 'moderator')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const users = await getAllUsers()
  return NextResponse.json(users)
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const currentUser = await getUserById(session.user.id)
  if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'moderator')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const { email, name, password, role } = body

  if (!email || !name || !password) {
    return NextResponse.json({ error: 'Email, name, and password are required' }, { status: 400 })
  }

  if (password.length < 6) {
    return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })
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
    return NextResponse.json(newUser, { status: 201 })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    if (message.includes('unique') || message.includes('duplicate')) {
      return NextResponse.json({ error: 'A user with this email already exists' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const currentUser = await getUserById(session.user.id)
  if (!currentUser || currentUser.role !== 'admin') {
    return NextResponse.json({ error: 'Only admins can change roles' }, { status: 403 })
  }

  const body = await req.json()
  const { userId, role } = body

  const validRoles = ['user', 'moderator', 'admin'] as const
  if (!userId || !validRoles.includes(role)) {
    return NextResponse.json({ error: 'Valid userId and role are required' }, { status: 400 })
  }

  const updated = await updateUserRole(userId, role)
  if (!updated) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  return NextResponse.json(updated)
}

export async function DELETE(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const currentUser = await getUserById(session.user.id)
  if (!currentUser || currentUser.role !== 'admin') {
    return NextResponse.json({ error: 'Only admins can delete users' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const userId = searchParams.get('id')

  if (!userId) {
    return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
  }

  if (userId === session.user.id) {
    return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 })
  }

  const deleted = await deleteUser(userId)
  if (!deleted) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  return NextResponse.json({ success: true })
}
