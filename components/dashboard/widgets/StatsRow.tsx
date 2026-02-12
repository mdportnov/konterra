'use client'

import { useMemo } from 'react'
import { Users, Globe, MapPin, Star } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { GLASS } from '@/lib/constants/ui'
import type { Contact } from '@/lib/db/schema'

interface StatsRowProps {
  contacts: Contact[]
  loading?: boolean
}

export default function StatsRow({ contacts, loading }: StatsRowProps) {
  const stats = useMemo(() => {
    const countries = new Set<string>()
    const cities = new Set<string>()
    let ratingSum = 0
    let ratingCount = 0

    for (const c of contacts) {
      if (c.country) countries.add(c.country)
      if (c.city) cities.add(c.city)
      if (c.rating) {
        ratingSum += c.rating
        ratingCount++
      }
    }

    return {
      total: contacts.length,
      countries: countries.size,
      cities: cities.size,
      avgRating: ratingCount > 0 ? (ratingSum / ratingCount).toFixed(1) : '-',
    }
  }, [contacts])

  const cards = [
    { label: 'Contacts', value: stats.total, icon: Users },
    { label: 'Countries', value: stats.countries, icon: Globe },
    { label: 'Cities', value: stats.cities, icon: MapPin },
    { label: 'Avg Rating', value: stats.avgRating, icon: Star },
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
          <div className="rounded-lg bg-orange-500/10 p-2">
            <card.icon className="h-4 w-4 text-orange-400" />
          </div>
          <div>
            <p className="text-lg font-semibold text-foreground leading-tight">{card.value}</p>
            <p className="text-[11px] text-muted-foreground">{card.label}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
