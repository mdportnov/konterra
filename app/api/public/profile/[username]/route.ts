import { NextResponse } from 'next/server'
import { getUserByUsername, getPublicProfileData } from '@/lib/db/queries'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ username: string }> }
) {
  const { username } = await params
  const user = await getUserByUsername(username)

  if (!user) {
    return NextResponse.json({ status: 'not_found' })
  }

  if (user.profileVisibility !== 'public') {
    return NextResponse.json({ status: 'private' })
  }

  const { countries, trips } = await getPublicProfileData(user.id, user.profilePrivacyLevel)

  return NextResponse.json({
    status: 'public',
    user: {
      name: user.name,
      image: user.image,
      username: user.username,
      createdAt: user.createdAt,
    },
    privacyLevel: user.profilePrivacyLevel,
    countries,
    trips,
  })
}
