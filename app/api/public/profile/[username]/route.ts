import { NextResponse } from 'next/server'
import { getUserByUsername, getPublicProfileData } from '@/lib/db/queries'
import { rateLimitShared, getClientIp } from '@/lib/rate-limit'
import { tooManyRequests } from '@/lib/api-utils'

const NOT_FOUND = { status: 'not_found' } as const

export async function GET(
  req: Request,
  { params }: { params: Promise<{ username: string }> }
) {
  const rl = await rateLimitShared(`public-profile:${getClientIp(req)}`, { windowMs: 60 * 1000, max: 60 })
  if (!rl.ok) return tooManyRequests(rl.resetAt)

  const { username } = await params
  if (!username || username.length > 30) return NextResponse.json(NOT_FOUND)

  const user = await getUserByUsername(username)

  // A private profile and a nonexistent one must be indistinguishable, otherwise the
  // endpoint becomes a username-enumeration oracle.
  if (!user || user.profileVisibility !== 'public') {
    return NextResponse.json(NOT_FOUND)
  }

  const { countries, trips } = await getPublicProfileData(user.id, user.profilePrivacyLevel)

  return NextResponse.json(
    {
      status: 'public',
      user: {
        name: user.name,
        image: user.image,
        username: user.username,
        bio: user.bio,
      },
      privacyLevel: user.profilePrivacyLevel,
      indexable: user.publicProfileIndexable,
      countries,
      trips,
    },
    { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=3600' } },
  )
}
