'use client'

import { useMemo, memo } from 'react'
import { MapPin, Star } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import type { Contact } from '@/lib/db/schema'

interface MeetingOriginsProps {
  contacts: Contact[]
  limit?: number
  loading?: boolean
}

interface VenueData {
  name: string
  count: number
  avgRating: number | null
}

export default memo(function MeetingOrigins({ contacts, limit = 8, loading }: MeetingOriginsProps) {
  const data = useMemo(() => {
    const venues = new Map<string, { count: number; ratingSum: number; ratingCount: number }>()
    for (const c of contacts) {
      if (!c.metAt) continue
      const venue = c.metAt.trim()
      if (!venue) continue
      const entry = venues.get(venue) || { count: 0, ratingSum: 0, ratingCount: 0 }
      entry.count++
      if (c.rating != null) {
        entry.ratingSum += c.rating
        entry.ratingCount++
      }
      venues.set(venue, entry)
    }
    return Array.from(venues.entries())
      .map(([name, v]): VenueData => ({
        name,
        count: v.count,
        avgRating: v.ratingCount > 0 ? v.ratingSum / v.ratingCount : null,
      }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
      .slice(0, limit)
  }, [contacts, limit])

  const max = data.length > 0 ? data[0].count : 1

  if (loading) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <MapPin className="h-3.5 w-3.5 text-teal-400" />
          <Skeleton className="h-3.5 w-28" />
        </div>
        <div className="space-y-1.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-2">
              <Skeleton className="h-3 w-20 shrink-0" />
              <Skeleton className="h-4 flex-1 rounded-sm" style={{ width: `${90 - i * 15}%` }} />
              <Skeleton className="h-3 w-5 shrink-0" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <MapPin className="h-3.5 w-3.5 text-teal-400" />
        <span className="text-xs font-medium text-muted-foreground/60 uppercase tracking-wider">Meeting Origins</span>
      </div>
      {data.length === 0 ? (
        <p className="text-[11px] text-muted-foreground/40 py-1">No meeting places recorded yet</p>
      ) : (
      <div className="space-y-1.5">
        <TooltipProvider>
          {data.map((item, i) => (
            <Tooltip key={item.name}>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-muted-foreground w-20 truncate text-right shrink-0" title={item.name}>
                    {item.name}
                  </span>
                  <div className="flex-1 h-4 rounded-sm bg-muted/50 overflow-hidden">
                    <div
                      className="h-full rounded-sm transition-[width] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]"
                      style={{
                        width: `${(item.count / max) * 100}%`,
                        backgroundColor: `rgba(20,184,166,${0.7 - i * 0.06})`,
                      }}
                    />
                  </div>
                  <span className="text-[11px] text-muted-foreground/60 w-5 text-right tabular-nums shrink-0">
                    {item.count}
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                <div className="space-y-0.5">
                  <p className="font-medium">{item.name}</p>
                  <p>{item.count} contact{item.count !== 1 ? 's' : ''} met here</p>
                  {item.avgRating != null && (
                    <p className="flex items-center gap-1">
                      <Star className="h-3 w-3 text-orange-400 fill-orange-400" />
                      {item.avgRating.toFixed(1)} avg rating
                    </p>
                  )}
                </div>
              </TooltipContent>
            </Tooltip>
          ))}
        </TooltipProvider>
      </div>
      )}
    </div>
  )
})
