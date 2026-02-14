import { badRequest, success, serverError } from '@/lib/api-utils'
import { createWaitlistEntry } from '@/lib/db/queries'

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

    await createWaitlistEntry({
      email: email.toLowerCase().trim(),
      name: name.trim(),
      message: message?.trim() || undefined,
    })

    return success({ ok: true }, 201)
  } catch {
    return serverError('Something went wrong')
  }
}
