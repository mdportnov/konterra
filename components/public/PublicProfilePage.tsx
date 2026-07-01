'use client'

import { useMemo } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Globe, MapPin, Calendar } from 'lucide-react'
import { normalizeToGlobeName } from '@/components/globe/data/country-centroids'
import { countryFlag } from '@/lib/country-flags'
import type { Trip } from '@/lib/db/schema'
import type { DisplayOptions } from '@/types/display'

const GlobeCanvas = dynamic(() => import('@/components/globe/GlobeCanvas'), { ssr: false })

interface PublicProfilePageProps {
  user: {
    name: string | null
    image: string | null
    username: string | null
    bio: string | null
    createdAt?: string | null
  }
  privacyLevel: 'countries_only' | 'full_travel'
  countries: string[]
  trips?: Trip[]
  globeAutoRotate?: boolean
}

export default function PublicProfilePage({ user, privacyLevel, countries, trips = [], globeAutoRotate }: PublicProfilePageProps) {
  const visitedCountries = useMemo(() => new Set(countries.map(normalizeToGlobeName)), [countries])

  const display: DisplayOptions = useMemo(() => ({
    arcMode: 'off',
    showNetwork: false,
    showTravel: privacyLevel === 'full_travel' && trips.length > 0,
    autoRotate: globeAutoRotate ?? true,
    showHeatmap: false,
    showHexBins: false,
    showGraticules: false,
  }), [privacyLevel, trips.length, globeAutoRotate])

  const initials = user.name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || '?'

  const memberSince = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : null

  return (
    <div className="relative w-full h-[calc(100vh-56px)]">
      <GlobeCanvas
        contacts={[]}
        selectedContact={null}
        flyTarget={null}
        onContactClick={() => {}}
        display={display}
        visitedCountries={visitedCountries}
        trips={trips}
        readOnly
      />

      <div className="absolute bottom-0 left-0 right-0 sm:bottom-auto sm:right-auto sm:top-5 sm:left-5 sm:max-w-xs w-full">
        <div className="rounded-t-2xl sm:rounded-2xl border border-border bg-card/85 backdrop-blur-xl p-6 space-y-5 max-h-[38dvh] sm:max-h-none overflow-y-auto">
          <div className="flex items-center gap-3.5">
            <Avatar className="h-14 w-14 border border-border shrink-0">
              <AvatarImage src={user.image || undefined} />
              <AvatarFallback className="text-lg" style={{ background: 'oklch(0.7 0.16 45 / 15%)', color: 'var(--terra)' }}>
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="font-medium text-foreground truncate">{user.name || 'User'}</p>
              <p className="font-mono text-[11px] text-muted-foreground truncate">@{user.username}</p>
            </div>
          </div>

          {user.bio && (
            <p className="text-xs text-muted-foreground leading-relaxed">{user.bio}</p>
          )}

          <div className={`grid ${privacyLevel === 'full_travel' ? 'grid-cols-2' : 'grid-cols-1'} border-y border-border divide-x divide-border`}>
            <div className="py-3.5 pr-4">
              <p className="text-2xl font-light tracking-tight tabular-nums text-foreground">{countries.length}</p>
              <p className="mt-0.5 flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
                <Globe className="size-3 opacity-60" /> Countries
              </p>
            </div>
            {privacyLevel === 'full_travel' && (
              <div className="py-3.5 pl-4">
                <p className="text-2xl font-light tracking-tight tabular-nums text-foreground">{trips.length}</p>
                <p className="mt-0.5 flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
                  <MapPin className="size-3 opacity-60" /> Trips
                </p>
              </div>
            )}
          </div>

          {countries.length > 0 && (
            <div className="space-y-2">
              <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground/70">Visited Countries</p>
              <div className="flex flex-wrap gap-1">
                {countries.slice(0, 20).map((c) => (
                  <span key={c} className="inline-block rounded-full border border-border px-2 py-0.5 text-[10px] text-muted-foreground">
                    {countryFlag(c)} {c}
                  </span>
                ))}
                {countries.length > 20 && (
                  <span className="inline-block rounded-full border border-border px-2 py-0.5 text-[10px]" style={{ color: 'var(--terra)' }}>
                    +{countries.length - 20} more
                  </span>
                )}
              </div>
            </div>
          )}

          {memberSince && (
            <div className="flex items-center gap-1.5 font-mono text-[10px] text-muted-foreground/70">
              <Calendar className="size-3" />
              <span>Member since {memberSince}</span>
            </div>
          )}

          <Link
            href="/login"
            className="block w-full text-center rounded-full text-xs font-medium py-2.5 transition-opacity hover:opacity-90"
            style={{ background: 'var(--terra)', color: 'var(--terra-ink)' }}
          >
            Join Konterra to track your travels
          </Link>
        </div>
      </div>
    </div>
  )
}
