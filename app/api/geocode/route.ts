import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { geocode } from '@/lib/geocoding'

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const query = searchParams.get('q')

  if (!query) {
    return NextResponse.json({ error: 'Query required' }, { status: 400 })
  }

  const result = await geocode(query)

  if (!result) {
    return NextResponse.json({ error: 'Location not found' }, { status: 404 })
  }

  return NextResponse.json(result)
}
