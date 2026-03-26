import { badRequest, success, serverError } from '@/lib/api-utils'
import { safeParseBody } from '@/lib/validation'
import { registerViaInvite } from '@/lib/db/queries'
import { hash } from 'bcryptjs'

export async function POST(req: Request) {
  try {
    const body = await safeParseBody(req)
    if (!body) return badRequest('Invalid JSON body')

    const { email, name, password, inviteCode } = body as {
      email?: string
      name?: string
      password?: string
      inviteCode?: string
    }

    if (!email || typeof email !== 'string' || !email.includes('@')) return badRequest('Valid email is required')
    if (!name || typeof name !== 'string' || name.trim().length < 2) return badRequest('Name is required (min 2 chars)')
    if (!password || typeof password !== 'string' || password.length < 8) return badRequest('Password must be at least 8 characters')
    if (!inviteCode || typeof inviteCode !== 'string') return badRequest('Invite code is required')

    const normalizedEmail = email.toLowerCase().trim()
    const hashed = await hash(password, 12)
    const result = await registerViaInvite(
      { email: normalizedEmail, name: name.trim(), password: hashed },
      inviteCode,
    )

    if ('error' in result) {
      return badRequest('Registration failed. Please check your invite code and try again.')
    }

    return success({ id: result.user.id, email: result.user.email, name: result.user.name }, 201)
  } catch (err) {
    console.error('[POST /api/public/register]', err)
    return serverError('Registration failed')
  }
}
