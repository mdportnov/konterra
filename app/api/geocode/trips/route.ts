import { auth } from '@/auth'
import { db } from '@/lib/db/index'
import { trips, geocodeCache } from '@/lib/db/schema'
import { eq, and, isNull, sql, notExists } from 'drizzle-orm'
import { geocode } from '@/lib/geocoding'
import { unauthorized, success, tooManyRequests } from '@/lib/api-utils'
import { rateLimitShared } from '@/lib/rate-limit'

const BATCH_SIZE = 25

const notKnownUnresolvable = notExists(
  db
    .select({ one: sql`1` })
    .from(geocodeCache)
    .where(
      and(
        sql`${geocodeCache.query} = lower(trim(regexp_replace(concat_ws(', ', ${trips.city}, ${trips.country}), '\\s+', ' ', 'g')))`,
        isNull(geocodeCache.lat),
      ),
    ),
)

const pendingFilter = (userId: string) =>
  and(eq(trips.userId, userId), isNull(trips.lat), notKnownUnresolvable)

export async function POST() {
  const session = await auth()
  if (!session?.user?.id) return unauthorized()

  const userId = session.user.id

  const rl = await rateLimitShared(`geocode:trips:${userId}`, { windowMs: 60 * 1000, max: 30 })
  if (!rl.ok) return tooManyRequests(rl.resetAt)

  const rows = await db
    .select({ id: trips.id, city: trips.city, country: trips.country })
    .from(trips)
    .where(pendingFilter(userId))
    .limit(BATCH_SIZE)

  if (rows.length === 0) return success({ geocoded: 0, remaining: 0 })

  let geocoded = 0

  for (const row of rows) {
    const query = [row.city, row.country].filter(Boolean).join(', ')
    if (!query) continue

    try {
      const result = await geocode(query)
      if (result) {
        await db
          .update(trips)
          .set({ lat: result.lat, lng: result.lng })
          .where(and(eq(trips.id, row.id), eq(trips.userId, userId)))
        geocoded++
      }
    } catch (err) {
      console.error('[geocode/trips]', err)
    }
  }

  const [{ count }] = await db
    .select({ count: sql<number>`cast(count(*) as int)` })
    .from(trips)
    .where(pendingFilter(userId))

  return success({ geocoded, remaining: count })
}
