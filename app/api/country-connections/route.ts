import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getAllCountryConnections } from '@/lib/db/queries'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const items = await getAllCountryConnections(session.user.id)
  return NextResponse.json(items)
}
