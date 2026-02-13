import { auth } from '@/auth'
import { db } from '@/lib/db/index'
import { trips } from '@/lib/db/schema'
import { eq, and, isNull, sql } from 'drizzle-orm'
import { geocode } from '@/lib/geocoding'
import { unauthorized, success } from '@/lib/api-utils'

const BATCH_SIZE = 25
const DELAY_MS = 300

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

export async function POST() {
  const session = await auth()
  if (!session?.user?.id) return unauthorized()

  const userId = session.user.id

  const rows = await db
    .select({ id: trips.id, city: trips.city, country: trips.country })
    .from(trips)
    .where(and(eq(trips.userId, userId), isNull(trips.lat)))
    .limit(BATCH_SIZE)

  if (rows.length === 0) return success({ geocoded: 0, remaining: 0 })

  let geocoded = 0

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
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
    } catch {}

    if (i < rows.length - 1) await delay(DELAY_MS)
  }

  const [{ count }] = await db
    .select({ count: sql<number>`cast(count(*) as int)` })
    .from(trips)
    .where(and(eq(trips.userId, userId), isNull(trips.lat)))

  return success({ geocoded, remaining: count })
}
