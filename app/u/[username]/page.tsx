import type { Metadata } from 'next'
import { getUserByUsername, getPublicProfileData } from '@/lib/db/queries'
import ProfileStub from '@/components/public/ProfileStub'
import PublicProfilePage from '@/components/public/PublicProfilePage'

interface Props {
  params: Promise<{ username: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params
  const user = await getUserByUsername(username)

  if (!user || user.profileVisibility !== 'public') {
    return { title: 'Profile | Konterra' }
  }

  const { countries } = await getPublicProfileData(user.id, user.profilePrivacyLevel)
  const name = user.name || username
  const title = `${name} — ${countries.length} countries | Konterra`
  const description = `${name} (@${username}) has visited ${countries.length} countries. Track your travel on Konterra.`

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'profile',
      url: `https://konterra.app/u/${username}`,
      siteName: 'Konterra',
    },
    twitter: {
      card: 'summary',
      title,
      description,
    },
  }
}

export default async function PublicProfilePageRoute({ params }: Props) {
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
