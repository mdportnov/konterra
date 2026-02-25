'use client'

import { useMemo, memo } from 'react'
import { Users, Globe, Heart, TrendingUp } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { GLASS } from '@/lib/constants/ui'
import { countryNames } from '@/components/globe/data/country-centroids'
import type { Contact } from '@/lib/db/schema'

const TOTAL_COUNTRIES = new Set(Object.values(countryNames)).size

interface StatsRowProps {
  contacts: Contact[]
  loading?: boolean
  visitedCount?: number
  wishlistCount?: number
}

function pct(n: number): string {
  const p = (n / TOTAL_COUNTRIES) * 100
  if (p === 0) return '0%'
  if (p < 1) return '<1%'
  return `${Math.round(p)}%`
}

export default memo(function StatsRow({ contacts, loading, visitedCount = 0, wishlistCount = 0 }: StatsRowProps) {
  const contactCount = useMemo(() => contacts.length, [contacts])
  const potential = visitedCount + wishlistCount

  const cards = [
    {
      label: 'Contacts',
      value: String(contactCount),
      icon: Users,
      accent: 'bg-orange-500/10 text-orange-400',
    },
    {
      label: 'Visited',
      value: String(visitedCount),
      sub: `${pct(visitedCount)} of ${TOTAL_COUNTRIES}`,
      icon: Globe,
      accent: 'bg-teal-500/10 text-teal-400',
    },
    {
      label: 'Wishlist',
      value: String(wishlistCount),
      sub: wishlistCount > 0 ? `${wishlistCount} to explore` : undefined,
      icon: Heart,
      accent: 'bg-rose-500/10 text-rose-400',
    },
    {
      label: 'With wishlist',
      value: String(potential),
      sub: potential > visitedCount ? pct(potential) : undefined,
      icon: TrendingUp,
      accent: potential > visitedCount ? 'bg-amber-500/10 text-amber-400' : 'bg-muted text-muted-foreground/40',
    },
  ]

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className={`${GLASS.control} rounded-xl p-3 flex items-center gap-3`}>
            <Skeleton className="h-8 w-8 rounded-lg" />
            <div className="space-y-1.5">
              <Skeleton className="h-5 w-10" />
              <Skeleton className="h-3 w-14" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-2">
      {cards.map((card) => (
        <div
          key={card.label}
          className={`${GLASS.control} rounded-xl p-3 flex items-center gap-3 text-left`}
        >
          <div className={`rounded-lg p-2 ${card.accent}`}>
            <card.icon className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-lg font-semibold text-foreground leading-tight">{card.value}</p>
            <p className="text-[11px] text-muted-foreground truncate">
              {card.sub ? (
                <><span>{card.label}</span> <span className="text-muted-foreground/50">{card.sub}</span></>
              ) : (
                card.label
              )}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
})
