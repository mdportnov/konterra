'use client'

import { useMemo, memo } from 'react'
import { networkHealthScore, overdueFollowUps } from '@/lib/metrics'
import { Skeleton } from '@/components/ui/skeleton'
import { GLASS } from '@/lib/constants/ui'
import type { Contact, Interaction } from '@/lib/db/schema'

interface NetworkHealthProps {
  contacts: Contact[]
  interactions: Interaction[]
  loading?: boolean
}

function arcPath(score: number, radius: number, cx: number, cy: number): string {
  const pct = Math.max(0, Math.min(score / 100, 1))
  const startAngle = -210
  const endAngle = startAngle + pct * 240
  const start = polarToCartesian(cx, cy, radius, endAngle)
  const end = polarToCartesian(cx, cy, radius, startAngle)
  const largeArc = endAngle - startAngle > 180 ? 1 : 0
  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc} 0 ${end.x} ${end.y}`
}

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}

function scoreColor(score: number): string {
  if (score >= 70) return '#22c55e'
  if (score >= 40) return '#f59e0b'
  return '#ef4444'
}

function scoreLabel(score: number): string {
  if (score >= 80) return 'Excellent'
  if (score >= 60) return 'Good'
  if (score >= 40) return 'Fair'
  return 'Needs work'
}

const NOW = typeof window !== 'undefined' ? Date.now() : Date.now()

export default memo(function NetworkHealth({ contacts, interactions, loading }: NetworkHealthProps) {
  const score = useMemo(() => networkHealthScore(contacts, interactions), [contacts, interactions])
  const activeIn90 = useMemo(() => {
    const cutoff = NOW - 90 * 86400000
    return contacts.filter((c) => {
      const last = c.lastContactedAt ? new Date(c.lastContactedAt).getTime() : 0
      return last > cutoff
    }).length
  }, [contacts])
  const overdueCount = useMemo(() => overdueFollowUps(contacts).length, [contacts])
  const countriesCount = useMemo(
    () => new Set(contacts.map((c) => c.country).filter(Boolean)).size,
    [contacts]
  )
  const color = scoreColor(score)

  if (loading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-3.5 w-28" />
        <div className={`${GLASS.control} rounded-xl p-4`}>
          <div className="flex items-center gap-5">
            <Skeleton className="h-[88px] w-[96px] rounded-xl shrink-0" />
            <div className="space-y-3 flex-1">
              <div className="flex items-center justify-between">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-3 w-12" />
              </div>
              <Skeleton className="h-1 w-full rounded-full" />
              <div className="flex items-center justify-between">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-3 w-6" />
              </div>
              <div className="flex items-center justify-between">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-3 w-6" />
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <span className="text-xs font-medium text-muted-foreground/60 uppercase tracking-wider">Network Health</span>
      <div className={`${GLASS.control} rounded-xl p-4`}>
        <div className="flex items-center gap-5">
          <div className="shrink-0">
            <svg width="96" height="88" viewBox="0 0 120 100" className="text-foreground">
              <path
                d={arcPath(100, 40, 60, 48)}
                fill="none"
                className="stroke-border"
                strokeWidth="7"
                strokeLinecap="round"
              />
              <path
                d={arcPath(score, 40, 60, 48)}
                fill="none"
                stroke={color}
                strokeWidth="7"
                strokeLinecap="round"
              />
              <text x="60" y="46" textAnchor="middle" fill="currentColor" fontSize="22" fontWeight="700">
                {score}
              </text>
              <text x="60" y="60" textAnchor="middle" className="fill-muted-foreground" fontSize="9">
                / 100
              </text>
              <text x="60" y="76" textAnchor="middle" fill={color} fontSize="8" fontWeight="500">
                {scoreLabel(score)}
              </text>
            </svg>
          </div>
          <div className="space-y-2 flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-muted-foreground">Active (90d)</span>
              <span className="text-xs font-medium text-foreground">{activeIn90} / {contacts.length}</span>
            </div>
            <div className="w-full h-1 rounded-full bg-border overflow-hidden">
              <div
                className="h-full rounded-full bg-green-500 transition-all"
                style={{ width: `${contacts.length > 0 ? (activeIn90 / contacts.length) * 100 : 0}%` }}
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-muted-foreground">Overdue follow-ups</span>
              <span className={`text-xs font-medium ${overdueCount > 0 ? 'text-amber-500' : 'text-foreground'}`}>{overdueCount}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-muted-foreground">Countries</span>
              <span className="text-xs font-medium text-foreground">{countriesCount}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
})
