import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getUser, updateUser } from '@/lib/store'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const stored = getUser(session.user.id)
  return NextResponse.json({
    name: stored?.name ?? session.user.name ?? '',
    image: stored?.image ?? session.user.image ?? null,
  })
}

export async function PATCH(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const data: { name?: string; image?: string | null } = {}

  if (typeof body.name === 'string') {
    data.name = body.name.trim()
  }
  if (body.image !== undefined) {
    data.image = typeof body.image === 'string' ? body.image : null
  }

  const updated = updateUser(session.user.id, data)
  return NextResponse.json(updated)
}
