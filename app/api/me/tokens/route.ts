import { auth } from '@/auth'
import { unauthorized, badRequest, success, serverError } from '@/lib/api-utils'
import { safeParseBody, validateMaxLength } from '@/lib/validation'
import { createApiToken, getApiTokensByUserId } from '@/lib/db/queries'
import { generateApiToken } from '@/lib/mcp/token'
import { isValidScopes, MCP_SCOPES } from '@/lib/mcp/scopes'

const MAX_TOKENS_PER_USER = 20

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) return unauthorized()
    return success(await getApiTokensByUserId(session.user.id))
  } catch (e) {
    console.error('List tokens error:', e)
    return serverError('Failed to list tokens')
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) return unauthorized()

    const body = await safeParseBody(req)
    if (!body) return badRequest('Invalid JSON body')

    const { name, scopes, expiresInDays } = body as Record<string, unknown>

    if (!name || typeof name !== 'string' || !name.trim()) return badRequest('name is required')
    const lengthError = validateMaxLength(name, 100, 'name')
    if (lengthError) return badRequest(lengthError)

    if (!isValidScopes(scopes)) {
      return badRequest(`scopes must be a non-empty array of: ${MCP_SCOPES.join(', ')}`)
    }

    let expiresAt: Date | null = null
    if (expiresInDays !== undefined && expiresInDays !== null) {
      if (typeof expiresInDays !== 'number' || !Number.isInteger(expiresInDays) || expiresInDays < 1 || expiresInDays > 3650) {
        return badRequest('expiresInDays must be an integer between 1 and 3650')
      }
      expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
    }

    const existing = await getApiTokensByUserId(session.user.id)
    if (existing.length >= MAX_TOKENS_PER_USER) {
      return badRequest(`Token limit reached (${MAX_TOKENS_PER_USER}). Revoke an unused token first.`)
    }

    const { token, hash, prefix } = generateApiToken()
    const created = await createApiToken({
      userId: session.user.id,
      name: name.trim(),
      tokenHash: hash,
      tokenPrefix: prefix,
      scopes: [...new Set(scopes)],
      expiresAt,
    })

    return success({ ...created, token }, 201)
  } catch (e) {
    console.error('Create token error:', e)
    return serverError('Failed to create token')
  }
}
