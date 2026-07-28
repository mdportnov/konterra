import { db } from '@/lib/db'
import { rateLimitBuckets } from '@/lib/db/schema'
import { lte, sql } from 'drizzle-orm'

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

/**
 * Process-local limiter. On serverless every instance keeps its own counters, so the
 * effective ceiling is `max × instances` — only use this as a cheap pre-filter or for
 * limits that are advisory. Anything protecting credentials, cost or abuse surface must
 * use `rateLimitShared`.
 */
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

/**
 * Cross-instance limiter backed by Postgres. The counter is incremented and the window
 * rolled in a single atomic upsert, so concurrent lambdas cannot each start their own
 * window. Falls back to the in-memory limiter if the database is unreachable — degraded
 * but never fail-open to unlimited.
 */
export async function rateLimitShared(key: string, opts: RateLimitOptions): Promise<RateLimitResult> {
  const memory = rateLimit(`local:${key}`, { windowMs: opts.windowMs, max: opts.max })
  if (!memory.ok) return memory

  const windowSeconds = Math.ceil(opts.windowMs / 1000)

  try {
    const rows = await db
      .insert(rateLimitBuckets)
      .values({
        key,
        count: 1,
        resetAt: sql`now() + make_interval(secs => ${windowSeconds})`,
      })
      .onConflictDoUpdate({
        target: rateLimitBuckets.key,
        set: {
          count: sql`case when ${rateLimitBuckets.resetAt} <= now() then 1 else ${rateLimitBuckets.count} + 1 end`,
          resetAt: sql`case when ${rateLimitBuckets.resetAt} <= now() then now() + make_interval(secs => ${windowSeconds}) else ${rateLimitBuckets.resetAt} end`,
        },
      })
      .returning({ count: rateLimitBuckets.count, resetAt: rateLimitBuckets.resetAt })

    const row = rows[0]
    if (!row) return memory

    const resetAt = row.resetAt.getTime()
    if (Math.random() < 0.01) pruneSharedExpired()

    return {
      ok: row.count <= opts.max,
      remaining: Math.max(0, opts.max - row.count),
      resetAt,
    }
  } catch (e) {
    console.error('[rate-limit] shared store unavailable, falling back to memory:', e)
    return memory
  }
}

function pruneSharedExpired() {
  db.delete(rateLimitBuckets)
    .where(lte(rateLimitBuckets.resetAt, sql`now() - interval '1 hour'`))
    .catch(() => {})
}

export function getClientIp(req: Request): string {
  const xff = req.headers.get('x-forwarded-for')
  if (xff) return xff.split(',')[0].trim()
  const real = req.headers.get('x-real-ip')
  if (real) return real.trim()
  return 'unknown'
}
