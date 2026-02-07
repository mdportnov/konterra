import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getTagsByUserId, createTag } from '@/lib/db/queries'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const tags = await getTagsByUserId(session.user.id)
  return NextResponse.json(tags)
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { name?: string; color?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const name = typeof body.name === 'string' ? body.name.trim() : ''
  if (!name) {
    return NextResponse.json({ error: 'Tag name is required' }, { status: 400 })
  }

  if (name.length > 50) {
    return NextResponse.json({ error: 'Tag name must be 50 characters or less' }, { status: 400 })
  }

  const tag = await createTag(session.user.id, name, body.color)
  return NextResponse.json(tag, { status: 201 })
}
