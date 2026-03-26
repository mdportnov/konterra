import { NextResponse } from 'next/server'
import { badRequest, success, serverError } from '@/lib/api-utils'
import { safeParseBody } from '@/lib/validation'
import { createWaitlistEntry, getUserByEmail, getWaitlistEntryByEmail } from '@/lib/db/queries'

export async function POST(req: Request) {
  try {
    const body = await safeParseBody(req)
    if (!body) return badRequest('Invalid JSON body')

    const { email, name, message } = body

    if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return badRequest('Valid email is required')
    }

    if (!name || typeof name !== 'string' || (name as string).trim().length < 2) {
      return badRequest('Name must be at least 2 characters')
    }

    if (message && (typeof message !== 'string' || (message as string).length > 500)) {
      return badRequest('Message must be under 500 characters')
    }

    const normalizedEmail = (email as string).toLowerCase().trim()

    const existingUser = await getUserByEmail(normalizedEmail)
    if (existingUser) {
      return success({ ok: true }, 201)
    }

    const existingEntry = await getWaitlistEntryByEmail(normalizedEmail)
    if (existingEntry) {
      return success({ ok: true }, 201)
    }

    const inserted = await createWaitlistEntry({
      email: normalizedEmail,
      name: (name as string).trim(),
      message: typeof message === 'string' && message.trim() ? message.trim() : null,
    })

    if (!inserted) {
      return NextResponse.json(
        { error: 'A request with this email is already pending' },
        { status: 409 },
      )
    }

    return success({ ok: true }, 201)
  } catch {
    return serverError('Something went wrong')
  }
}
