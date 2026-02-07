'use client'

import { useMemo } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import type { Contact } from '@/lib/db/schema'

interface TopCountriesChartProps {
  contacts: Contact[]
  limit?: number
  loading?: boolean
}

export default function TopCountriesChart({ contacts, limit = 8, loading }: TopCountriesChartProps) {
  const data = useMemo(() => {
    const counts = new Map<string, number>()
    for (const c of contacts) {
      if (c.country) counts.set(c.country, (counts.get(c.country) || 0) + 1)
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, limit)
      .map(([name, count]) => ({ name, count }))
  }, [contacts, limit])

  const max = data.length > 0 ? data[0].count : 1

  if (loading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-3.5 w-24" />
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
      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Top Countries</span>
      {data.length === 0 ? (
        <p className="text-[11px] text-muted-foreground/40 py-1">No countries yet</p>
      ) : (
      <div className="space-y-1.5">
        {data.map((item, i) => (
          <div key={item.name} className="flex items-center gap-2">
            <span className="text-[11px] text-muted-foreground w-20 truncate text-right shrink-0" title={item.name}>
              {item.name}
            </span>
            <div className="flex-1 h-4 rounded-sm bg-muted/50 overflow-hidden">
              <div
                className="h-full rounded-sm transition-[width] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]"
                style={{
                  width: `${(item.count / max) * 100}%`,
                  backgroundColor: `rgba(249,115,22,${0.7 - i * 0.06})`,
                }}
              />
            </div>
            <span className="text-[11px] text-muted-foreground/60 w-5 text-right tabular-nums shrink-0">
              {item.count}
            </span>
          </div>
        ))}
      </div>
      )}
    </div>
  )
}
