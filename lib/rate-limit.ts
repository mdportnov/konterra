type Bucket = { count: number; resetAt: number }

const buckets = new Map<string, Bucket>()

export interface RateLimitOptions {
  windowMs: number
  max: number
}

export interface RateLimitResult {
  ok: boolean
  remaining: number
  resetAt: number
}

export function rateLimit(key: string, opts: RateLimitOptions): RateLimitResult {
  const now = Date.now()
  const existing = buckets.get(key)

  if (!existing || existing.resetAt <= now) {
    const resetAt = now + opts.windowMs
    buckets.set(key, { count: 1, resetAt })
    if (buckets.size > 10_000 || Math.random() < 0.01) pruneExpired(now)
    return { ok: true, remaining: opts.max - 1, resetAt }
  }

  existing.count += 1
  const ok = existing.count <= opts.max
  return { ok, remaining: Math.max(0, opts.max - existing.count), resetAt: existing.resetAt }
}

function pruneExpired(now: number) {
  for (const [k, b] of buckets) {
    if (b.resetAt <= now) buckets.delete(k)
  }
}

export function getClientIp(req: Request): string {
  const xff = req.headers.get('x-forwarded-for')
  if (xff) return xff.split(',')[0].trim()
  const real = req.headers.get('x-real-ip')
  if (real) return real.trim()
  return 'unknown'
}
