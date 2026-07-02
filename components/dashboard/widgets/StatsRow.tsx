'use client'

import { useMemo, memo } from 'react'
import { Users, Globe, Heart, TrendingUp } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
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
    },
    {
      label: 'Visited',
      value: String(visitedCount),
      sub: `${pct(visitedCount)} of ${TOTAL_COUNTRIES}`,
      icon: Globe,
    },
    {
      label: 'Wishlist',
      value: String(wishlistCount),
      sub: wishlistCount > 0 ? `${wishlistCount} to explore` : undefined,
      icon: Heart,
    },
    {
      label: 'With wishlist',
      value: String(potential),
      sub: potential > visitedCount ? pct(potential) : undefined,
      icon: TrendingUp,
    },
  ]

  if (loading) {
    return (
      <div className="grid grid-cols-2 border-y border-border divide-x divide-border">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className={`p-3 space-y-1.5 ${i >= 2 ? 'border-t border-border' : ''}`}>
            <Skeleton className="h-7 w-12" />
            <Skeleton className="h-3 w-16" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 border-y border-border divide-x divide-border">
      {cards.map((card, i) => (
        <div
          key={card.label}
          className={`p-3 text-left min-w-0 ${i >= 2 ? 'border-t border-border' : ''}`}
        >
          <p className="stat-figure text-[1.65rem] leading-none text-foreground">{card.value}</p>
          <p className="meta-label text-[9px] mt-1.5 flex items-center gap-1 truncate">
            <card.icon className="h-3 w-3 shrink-0 text-primary/70" />
            <span className="truncate">{card.label}</span>
          </p>
          {card.sub && (
            <p className="text-[10px] text-muted-foreground/60 mt-0.5 truncate tabular-nums">{card.sub}</p>
          )}
        </div>
      ))}
    </div>
  )
})
