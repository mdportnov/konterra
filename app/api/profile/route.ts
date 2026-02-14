import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getUserById, updateUserProfile } from '@/lib/db/queries'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const user = await getUserById(session.user.id)
    return NextResponse.json({
      name: user?.name ?? session.user.name ?? '',
      email: user?.email ?? session.user.email ?? '',
      image: user?.image ?? null,
      role: user?.role ?? 'user',
      createdAt: user?.createdAt ?? null,
    })
  } catch (err) {
    console.error('[GET /api/profile]', err instanceof Error ? err.message : err)
    return NextResponse.json({
      name: session.user.name ?? '',
      email: session.user.email ?? '',
      image: null,
      role: (session.user as { role?: string }).role ?? 'user',
      createdAt: null,
    })
  }
}

export async function PATCH(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const data: { name?: string; image?: string | null } = {}

    if (typeof body.name === 'string') {
      data.name = body.name.trim()
    }
    if (body.image !== undefined) {
      data.image = typeof body.image === 'string' ? body.image : null
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    const updated = await updateUserProfile(session.user.id, data)
    if (!updated) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json({ name: updated.name, image: updated.image })
  } catch (err) {
    console.error('[PATCH /api/profile]', err)
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
  }
}
