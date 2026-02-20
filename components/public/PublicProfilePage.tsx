'use client'

import { useMemo } from 'react'
import dynamic from 'next/dynamic'
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
    createdAt: string | null
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

      <div className="absolute bottom-0 left-0 right-0 sm:bottom-auto sm:right-auto sm:top-4 sm:left-4 sm:max-w-xs w-full">
        <div className="rounded-t-xl sm:rounded-xl border border-border bg-card/80 backdrop-blur-xl p-5 space-y-4 max-h-[35dvh] sm:max-h-none overflow-y-auto">
          <div className="flex items-center gap-3">
            <Avatar className="h-14 w-14 border-2 border-border shrink-0">
              <AvatarImage src={user.image || undefined} />
              <AvatarFallback className="bg-orange-500/20 text-orange-600 dark:text-orange-300 text-lg">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="font-semibold text-foreground truncate">{user.name || 'User'}</p>
              <p className="text-xs text-muted-foreground">@{user.username}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg border border-border bg-muted/30 p-2.5 text-center space-y-0.5">
              <Globe className="h-3.5 w-3.5 mx-auto text-muted-foreground/60" />
              <p className="text-base font-semibold text-foreground">{countries.length}</p>
              <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Countries</p>
            </div>
            {privacyLevel === 'full_travel' && (
              <div className="rounded-lg border border-border bg-muted/30 p-2.5 text-center space-y-0.5">
                <MapPin className="h-3.5 w-3.5 mx-auto text-muted-foreground/60" />
                <p className="text-base font-semibold text-foreground">{trips.length}</p>
                <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Trips</p>
              </div>
            )}
          </div>

          {countries.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[9px] text-muted-foreground/60 uppercase tracking-wider font-medium">Visited Countries</p>
              <div className="flex flex-wrap gap-1">
                {countries.slice(0, 20).map((c) => (
                  <span key={c} className="inline-block rounded-md bg-muted/50 border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground">
                    {countryFlag(c)} {c}
                  </span>
                ))}
                {countries.length > 20 && (
                  <span className="inline-block rounded-md bg-muted/50 border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground">
                    +{countries.length - 20} more
                  </span>
                )}
              </div>
            </div>
          )}

          {memberSince && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground/60">
              <Calendar className="h-3 w-3" />
              <span>Member since {memberSince}</span>
            </div>
          )}

          <a
            href="/login"
            className="block w-full text-center rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-xs font-medium py-2 transition-colors"
          >
            Join Konterra to track your travels
          </a>
        </div>
      </div>
    </div>
  )
}
