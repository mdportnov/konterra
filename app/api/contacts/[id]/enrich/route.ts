import { type NextRequest } from 'next/server'
import { auth } from '@/auth'
import { getContactById, upsertSocialPreview } from '@/lib/db/queries'
import { unauthorized, notFound, badRequest, success, serverError } from '@/lib/api-utils'
import { safeParseBody } from '@/lib/validation'
import { scrapeAllProfiles } from '@/lib/social/scraper'
import type { SocialPlatform } from '@/lib/social/types'
import { SOCIAL_PLATFORMS } from '@/lib/social/types'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session?.user?.id) return unauthorized()

    const { id } = await params
    const contact = await getContactById(id, session.user.id)
    if (!contact) return notFound('Contact')

    const body = await safeParseBody(req)
    let platforms: SocialPlatform[] | undefined

    if (body?.platforms) {
      if (!Array.isArray(body.platforms)) return badRequest('platforms must be an array')
      const invalid = (body.platforms as string[]).find((p) => !SOCIAL_PLATFORMS.includes(p as SocialPlatform))
      if (invalid) return badRequest(`Invalid platform: ${invalid}`)
      platforms = body.platforms as SocialPlatform[]
    }

    const results = await scrapeAllProfiles(contact, platforms)

    const saved = await Promise.all(
      results.map((r) =>
        upsertSocialPreview({
          contactId: id,
          platform: r.platform,
          url: r.url,
          title: r.title,
          description: r.description,
          imageUrl: r.imageUrl,
          avatarUrl: r.avatarUrl,
          followers: r.followers,
          bio: r.bio,
          extra: r.extra,
          status: r.status,
          fetchedAt: new Date(),
        })
      )
    )

    return success(saved)
  } catch (e) {
    console.error('Enrich error:', e)
    return serverError()
  }
}
