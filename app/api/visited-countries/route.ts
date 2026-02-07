import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getVisitedCountries, addVisitedCountry, removeVisitedCountry, setVisitedCountries } from '@/lib/db/queries'
import { safeParseBody } from '@/lib/validation'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return NextResponse.json(await getVisitedCountries(session.user.id))
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const body = await safeParseBody(req)
  if (!body) {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }
  if (typeof body.country !== 'string') {
    return NextResponse.json({ error: 'Invalid country' }, { status: 400 })
  }
  return NextResponse.json(await addVisitedCountry(session.user.id, body.country))
}

export async function DELETE(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const body = await safeParseBody(req)
  if (!body) {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }
  if (typeof body.country !== 'string') {
    return NextResponse.json({ error: 'Invalid country' }, { status: 400 })
  }
  return NextResponse.json(await removeVisitedCountry(session.user.id, body.country))
}

export async function PUT(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const body = await safeParseBody(req)
  if (!body) {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }
  if (!Array.isArray(body.countries)) {
    return NextResponse.json({ error: 'Invalid countries' }, { status: 400 })
  }
  return NextResponse.json(await setVisitedCountries(session.user.id, body.countries))
}
