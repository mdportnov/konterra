import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getRecentInteractions } from '@/lib/store'

export async function GET() {
  const session = await auth()
  const userId = session?.user?.email || 'demo@example.com'
  const items = getRecentInteractions(userId, 15)
  return NextResponse.json(items)
}
