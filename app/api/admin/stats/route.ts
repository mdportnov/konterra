import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { unauthorized, success } from '@/lib/api-utils'
import { getUserById, getAdminStats } from '@/lib/db/queries'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return unauthorized()

  const user = await getUserById(session.user.id)
  if (!user || (user.role !== 'admin' && user.role !== 'moderator')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const stats = await getAdminStats()
  return success(stats)
}
