import type { MetadataRoute } from 'next'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { eq, isNotNull, and } from 'drizzle-orm'

const BASE_URL = 'https://konterra.space'

// Regenerate at runtime (hourly) rather than freezing public profiles at build time,
// so the build never hard-depends on database connectivity for this route.
export const revalidate = 3600

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${BASE_URL}/ru`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/es`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/zh`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
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

  // A database hiccup must never fail the whole build/route — degrade to static pages.
  let profilePages: MetadataRoute.Sitemap = []
  try {
    const publicUsers = await db
      .select({ username: users.username })
      .from(users)
      .where(
        and(
          eq(users.profileVisibility, 'public'),
          isNotNull(users.username)
        )
      )

    profilePages = publicUsers
      .filter((u) => u.username)
      .map((u) => ({
        url: `${BASE_URL}/u/${u.username}`,
        lastModified: new Date(),
        changeFrequency: 'weekly' as const,
        priority: 0.6,
      }))
  } catch (err) {
    console.error('[sitemap] failed to load public profiles:', err)
  }

  return [...staticPages, ...profilePages]
}
