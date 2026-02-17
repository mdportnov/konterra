import { NextResponse } from 'next/server'
import { badRequest, success, serverError } from '@/lib/api-utils'
import { createWaitlistEntry, getUserByEmail, getWaitlistEntryByEmail } from '@/lib/db/queries'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { email, name, message } = body

    if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return badRequest('Valid email is required')
    }

    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return badRequest('Name must be at least 2 characters')
    }

    if (message && (typeof message !== 'string' || message.length > 500)) {
      return badRequest('Message must be under 500 characters')
    }

    const normalizedEmail = email.toLowerCase().trim()

    const existingUser = await getUserByEmail(normalizedEmail)
    if (existingUser) {
      return NextResponse.json(
        { error: 'This email is already registered' },
        { status: 409 },
      )
    }

    const existingEntry = await getWaitlistEntryByEmail(normalizedEmail)
    if (existingEntry) {
      if (existingEntry.status === 'pending') {
        return NextResponse.json(
          { error: 'A request with this email is already pending' },
          { status: 409 },
        )
      }
      if (existingEntry.status === 'rejected') {
        return NextResponse.json(
          { error: 'This email has been reviewed previously' },
          { status: 409 },
        )
      }
    }

    await createWaitlistEntry({
      email: normalizedEmail,
      name: name.trim(),
      message: message?.trim() || undefined,
    })

    return success({ ok: true }, 201)
  } catch {
    return serverError('Something went wrong')
  }
}
