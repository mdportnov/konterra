import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getAllConnections } from '@/lib/db/queries'

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1)
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10) || 50))

  const result = await getAllConnections(session.user.id, page, limit)
  return NextResponse.json(result)
}
