import { getUserByUsername, getPublicProfileData } from '@/lib/db/queries'
import ProfileStub from '@/components/public/ProfileStub'
import PublicProfilePage from '@/components/public/PublicProfilePage'

export default async function PublicProfilePageRoute({
  params,
}: {
  params: Promise<{ username: string }>
}) {
  const { username } = await params
  const user = await getUserByUsername(username)

  if (!user) {
    return <ProfileStub type="not_found" />
  }

  if (user.profileVisibility !== 'public') {
    return <ProfileStub type="private" />
  }

  const { countries, trips } = await getPublicProfileData(user.id, user.profilePrivacyLevel)

  return (
    <PublicProfilePage
      user={{
        name: user.name,
        image: user.image,
        username: user.username,
        createdAt: user.createdAt?.toISOString() ?? null,
      }}
      privacyLevel={user.profilePrivacyLevel}
      countries={countries}
      trips={trips}
    />
  )
}
