import { auth } from '@/auth'
import { db } from '@/lib/db/index'
import { contacts } from '@/lib/db/schema'
import { eq, and, isNull, sql, or } from 'drizzle-orm'
import { geocode } from '@/lib/geocoding'
import { unauthorized, success } from '@/lib/api-utils'

const BATCH_SIZE = 20
const DELAY_MS = 350

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

export async function POST() {
  const session = await auth()
  if (!session?.user?.id) return unauthorized()

  const userId = session.user.id

  const hasLocation = or(
    sql`${contacts.city} is not null`,
    sql`${contacts.country} is not null`
  )

  const rows = await db
    .select({ id: contacts.id, city: contacts.city, country: contacts.country })
    .from(contacts)
    .where(and(eq(contacts.userId, userId), isNull(contacts.lat), hasLocation))
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
    } catch {}

    if (rows.indexOf(row) < rows.length - 1) await delay(DELAY_MS)
  }

  const [{ count }] = await db
    .select({ count: sql<number>`cast(count(*) as int)` })
    .from(contacts)
    .where(and(eq(contacts.userId, userId), isNull(contacts.lat), hasLocation))

  return success({ geocoded, remaining: count })
}
