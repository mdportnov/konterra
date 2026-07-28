import { auth } from '@/auth'
import { db } from '@/lib/db/index'
import { contacts, geocodeCache } from '@/lib/db/schema'
import { eq, and, isNull, sql, or, notExists } from 'drizzle-orm'
import { geocode } from '@/lib/geocoding'
import { unauthorized, success, tooManyRequests } from '@/lib/api-utils'
import { rateLimitShared } from '@/lib/rate-limit'

const BATCH_SIZE = 20

const hasLocation = or(
  sql`${contacts.city} is not null`,
  sql`${contacts.country} is not null`
)

/**
 * A place the provider could not resolve is cached as a negative result. Excluding those
 * rows keeps `remaining` truthful — otherwise it never reaches zero and the client keeps
 * re-running the whole batch loop on every page load.
 */
const notKnownUnresolvable = notExists(
  db
    .select({ one: sql`1` })
    .from(geocodeCache)
    .where(
      and(
        sql`${geocodeCache.query} = lower(trim(regexp_replace(concat_ws(', ', ${contacts.city}, ${contacts.country}), '\\s+', ' ', 'g')))`,
        isNull(geocodeCache.lat),
      ),
    ),
)

const pendingFilter = (userId: string) =>
  and(eq(contacts.userId, userId), isNull(contacts.lat), hasLocation, notKnownUnresolvable)

export async function POST() {
  const session = await auth()
  if (!session?.user?.id) return unauthorized()

  const userId = session.user.id

  const rl = await rateLimitShared(`geocode:batch:${userId}`, { windowMs: 60 * 1000, max: 30 })
  if (!rl.ok) return tooManyRequests(rl.resetAt)

  const rows = await db
    .select({ id: contacts.id, city: contacts.city, country: contacts.country })
    .from(contacts)
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
          .update(contacts)
          .set({ lat: result.lat, lng: result.lng })
          .where(and(eq(contacts.id, row.id), eq(contacts.userId, userId)))
        geocoded++
      }
    } catch (err) {
      console.error('[geocode/batch]', err)
    }
  }

  const [{ count }] = await db
    .select({ count: sql<number>`cast(count(*) as int)` })
    .from(contacts)
    .where(pendingFilter(userId))

  return success({ geocoded, remaining: count })
}
