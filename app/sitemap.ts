import type { MetadataRoute } from 'next'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { eq, isNotNull, and } from 'drizzle-orm'

const BASE_URL = 'https://konterra.space'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${BASE_URL}/login`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/privacy`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.2,
    },
  ]

  const publicUsers = await db
    .select({ username: users.username })
    .from(users)
    .where(
      and(
        eq(users.profileVisibility, 'public'),
        isNotNull(users.username)
      )
    )

  const profilePages: MetadataRoute.Sitemap = publicUsers
    .filter((u) => u.username)
    .map((u) => ({
      url: `${BASE_URL}/u/${u.username}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    }))

  return [...staticPages, ...profilePages]
}
