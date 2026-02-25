'use client'

import { useMemo, useState, useEffect, useRef } from 'react'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { GLASS } from '@/lib/constants/ui'
import { Network, ChevronRight, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { computeInsightsSummary } from '@/lib/connection-insights'
import type { Contact, ContactConnection, Interaction, Favor } from '@/lib/db/schema'
import type { InsightsSummary } from '@/lib/connection-insights'

interface ConnectionInsightsSummaryProps {
  contacts: Contact[]
  connections: ContactConnection[]
  interactions: Interaction[]
  favors: Favor[]
  onOpenInsights: () => void
  loading?: boolean
}

const DEFAULT_SUMMARY: InsightsSummary = {
  metrics: { totalConnections: 0, networkDensity: 0, averageStrength: 0, bidirectionalRatio: 0, connectedContactsRatio: 0 },
  topInsight: 'Analyzing your network...',
  actionableCount: 0,
  healthTrend: 'stable',
}

export default function ConnectionInsightsSummary({
  contacts,
  connections,
  interactions,
  favors,
  onOpenInsights,
  loading,
}: ConnectionInsightsSummaryProps) {
  const [summary, setSummary] = useState<InsightsSummary>(DEFAULT_SUMMARY)
  const [computed, setComputed] = useState(false)
  const depsKey = useMemo(() => `${contacts.length}:${connections.length}:${interactions.length}:${favors.length}`, [contacts.length, connections.length, interactions.length, favors.length])
  const prevKey = useRef('')

  useEffect(() => {
    if (depsKey === prevKey.current) return
    prevKey.current = depsKey
    const timer = setTimeout(() => {
      setSummary(computeInsightsSummary(contacts, connections, interactions, favors))
      setComputed(true)
    }, 1500)
    return () => clearTimeout(timer)
  }, [depsKey, contacts, connections, interactions, favors])

  if (loading || !computed) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Network className="h-3.5 w-3.5 text-orange-400" />
          <Skeleton className="h-3.5 w-32" />
        </div>
        <div className={`${GLASS.control} rounded-xl p-3 space-y-2`}>
          <Skeleton className="h-3 w-full" />
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-8 flex-1" />
          </div>
        </div>
      </div>
    )
  }

  const TrendIcon = summary.healthTrend === 'improving'
    ? TrendingUp
    : summary.healthTrend === 'declining'
      ? TrendingDown
      : Minus

  const trendColor = summary.healthTrend === 'improving'
    ? 'text-green-500'
    : summary.healthTrend === 'declining'
      ? 'text-red-400'
      : 'text-muted-foreground'

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Network className="h-3.5 w-3.5 text-orange-400" />
        <span className="text-xs font-medium text-muted-foreground/60 uppercase tracking-wider">
          Connection Insights
        </span>
        {summary.actionableCount > 0 && (
          <Badge className="bg-orange-500/20 text-orange-600 dark:text-orange-300 border-orange-500/30 text-[10px] px-1.5 py-0">
            {summary.actionableCount}
          </Badge>
        )}
      </div>
      <button
        onClick={onOpenInsights}
        className={`${GLASS.control} rounded-xl p-3 space-y-2 w-full text-left hover:bg-accent/50 transition-colors group focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring`}
      >
        <div className="flex items-start justify-between gap-2">
          <p className="text-[11px] text-muted-foreground leading-relaxed flex-1">
            {summary.topInsight}
          </p>
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-foreground/60 transition-colors shrink-0 mt-0.5" />
        </div>
        <div className="flex items-center gap-3 text-[10px]">
          <div className="flex items-center gap-1">
            <span className="text-muted-foreground/60">Connections</span>
            <span className="font-medium text-foreground tabular-nums">{summary.metrics.totalConnections}</span>
          </div>
          <div className="w-px h-3 bg-border" />
          <div className="flex items-center gap-1">
            <span className="text-muted-foreground/60">Strength</span>
            <span className="font-medium text-foreground tabular-nums">{summary.metrics.averageStrength.toFixed(1)}</span>
          </div>
          <div className="w-px h-3 bg-border" />
          <div className="flex items-center gap-1">
            <TrendIcon className={`h-3 w-3 ${trendColor}`} />
            <span className={`${trendColor} capitalize`}>{summary.healthTrend}</span>
          </div>
        </div>
      </button>
    </div>
  )
}
