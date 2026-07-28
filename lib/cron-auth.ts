import { createHmac, timingSafeEqual } from 'crypto'
import { env } from '@/lib/env'

/**
 * Cron endpoints need a shared secret, but requiring one more environment variable just to
 * make the deploy work invites people to skip it. When `CRON_SECRET` is unset we derive a
 * stable one from `AUTH_SECRET`, which is always present and already secret — so the
 * endpoint is protected by default rather than protected only if someone remembered.
 */
export function cronSecret(): string {
  if (env.CRON_SECRET) return env.CRON_SECRET
  return createHmac('sha256', env.AUTH_SECRET).update('konterra:cron').digest('hex')
}

function safeEquals(a: string, b: string): boolean {
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)
  if (bufA.length !== bufB.length) return false
  return timingSafeEqual(bufA, bufB)
}

export function isAuthorizedCron(req: Request): boolean {
  const header = req.headers.get('authorization')
  if (!header?.startsWith('Bearer ')) return false
  return safeEquals(header.slice('Bearer '.length).trim(), cronSecret())
}
