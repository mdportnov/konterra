import { createHash, randomBytes } from 'crypto'

export const TOKEN_PREFIX = 'ktr_'

export function generateApiToken(): { token: string; hash: string; prefix: string } {
  const token = TOKEN_PREFIX + randomBytes(32).toString('base64url')
  return { token, hash: hashApiToken(token), prefix: token.slice(0, TOKEN_PREFIX.length + 8) }
}

export function hashApiToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}
