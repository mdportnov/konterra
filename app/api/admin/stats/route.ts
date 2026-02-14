import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getUserById, getAdminStats } from '@/lib/db/queries'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = await getUserById(session.user.id)
  if (!user || (user.role !== 'admin' && user.role !== 'moderator')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const stats = await getAdminStats()
  return NextResponse.json(stats)
}
