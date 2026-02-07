import { NextResponse } from 'next/server'
import { createWaitlistEntry } from '@/lib/db/queries'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { email, name, message } = body

    if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Valid email is required' }, { status: 400 })
    }

    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return NextResponse.json({ error: 'Name must be at least 2 characters' }, { status: 400 })
    }

    if (message && (typeof message !== 'string' || message.length > 500)) {
      return NextResponse.json({ error: 'Message must be under 500 characters' }, { status: 400 })
    }

    await createWaitlistEntry({
      email: email.toLowerCase().trim(),
      name: name.trim(),
      message: message?.trim() || undefined,
    })

    return NextResponse.json({ ok: true }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
