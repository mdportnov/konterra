import { ImageResponse } from 'next/og'
import { getUserByUsername, getPublicProfileData, getTripsByUserId } from '@/lib/db/queries'
import { computeTravelDays } from '@/lib/travel/days'

export const alt = 'Konterra atlas'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

// Regenerated hourly rather than per request: the numbers move slowly and social crawlers
// hit this far more often than the underlying data changes.
export const revalidate = 3600

const INK = '#0e0d0b'
const PANEL = '#17150f'
const BONE = '#f2ede3'
const MUTED = '#8a8175'
const TERRA = '#b0651f'

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ fontSize: 64, color: BONE, fontWeight: 600, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 20, color: MUTED, letterSpacing: 3, textTransform: 'uppercase' }}>{label}</div>
    </div>
  )
}

export default async function Image({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params
  const user = await getUserByUsername(username).catch(() => null)

  // A private or missing profile must not leak its existence through the card either.
  if (!user || user.profileVisibility !== 'public') {
    return new ImageResponse(
      (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: INK,
            color: BONE,
            fontSize: 56,
            letterSpacing: 6,
            textTransform: 'uppercase',
          }}
        >
          Konterra
        </div>
      ),
      size,
    )
  }

  // Day and city counts are derived from the trip log. A `countries_only` profile has
  // deliberately hidden that granularity, so the card must not reintroduce it.
  const showTravelDetail = user.profilePrivacyLevel === 'full_travel'

  const [{ countries }, trips] = await Promise.all([
    getPublicProfileData(user.id, user.profilePrivacyLevel),
    showTravelDetail ? getTripsByUserId(user.id).catch(() => []) : Promise.resolve([]),
  ])

  const summary = computeTravelDays(trips)
  const name = user.name || username
  const topCountries = (showTravelDetail
    ? summary.countries.map((c) => c.country)
    : [...countries].sort()
  ).slice(0, 6)

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: INK,
          padding: 72,
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ fontSize: 22, color: TERRA, letterSpacing: 8, textTransform: 'uppercase' }}>
            Konterra
          </div>
          <div style={{ fontSize: 76, color: BONE, fontWeight: 600, lineHeight: 1.05 }}>{name}</div>
          <div style={{ fontSize: 26, color: MUTED }}>@{username}</div>
          {user.bio && (
            <div style={{ fontSize: 26, color: MUTED, maxWidth: 900, lineHeight: 1.4 }}>
              {user.bio.length > 120 ? `${user.bio.slice(0, 120)}…` : user.bio}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
          {topCountries.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {topCountries.map((country) => (
                <div
                  key={country}
                  style={{
                    display: 'flex',
                    background: PANEL,
                    border: `1px solid #2b2720`,
                    borderRadius: 999,
                    padding: '8px 20px',
                    fontSize: 22,
                    color: BONE,
                  }}
                >
                  {country}
                </div>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', gap: 72 }}>
            <Stat value={String(countries.length)} label="Countries" />
            {summary.totalTrackedDays > 0 && (
              <Stat value={String(summary.totalTrackedDays)} label="Days tracked" />
            )}
            {summary.citiesVisited > 0 && <Stat value={String(summary.citiesVisited)} label="Cities" />}
          </div>
        </div>
      </div>
    ),
    size,
  )
}
