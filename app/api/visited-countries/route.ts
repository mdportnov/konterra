import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getVisitedCountries, addVisitedCountry, removeVisitedCountry, setVisitedCountries } from '@/lib/store'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return NextResponse.json(getVisitedCountries(session.user.id))
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { country } = await req.json()
  if (typeof country !== 'string') {
    return NextResponse.json({ error: 'Invalid country' }, { status: 400 })
  }
  return NextResponse.json(addVisitedCountry(session.user.id, country))
}

export async function DELETE(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { country } = await req.json()
  if (typeof country !== 'string') {
    return NextResponse.json({ error: 'Invalid country' }, { status: 400 })
  }
  return NextResponse.json(removeVisitedCountry(session.user.id, country))
}

export async function PUT(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { countries } = await req.json()
  if (!Array.isArray(countries)) {
    return NextResponse.json({ error: 'Invalid countries' }, { status: 400 })
  }
  return NextResponse.json(setVisitedCountries(session.user.id, countries))
}
