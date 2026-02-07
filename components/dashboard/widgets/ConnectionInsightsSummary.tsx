'use client'

import { useMemo } from 'react'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { GLASS } from '@/lib/constants/ui'
import { Network, ChevronRight, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { computeInsightsSummary } from '@/lib/connection-insights'
import type { Contact, ContactConnection, Interaction, Favor } from '@/lib/db/schema'

interface ConnectionInsightsSummaryProps {
  contacts: Contact[]
  connections: ContactConnection[]
  interactions: Interaction[]
  favors: Favor[]
  onOpenInsights: () => void
  loading?: boolean
}

export default function ConnectionInsightsSummary({
  contacts,
  connections,
  interactions,
  favors,
  onOpenInsights,
  loading,
}: ConnectionInsightsSummaryProps) {
  const summary = useMemo(
    () => computeInsightsSummary(contacts, connections, interactions, favors),
    [contacts, connections, interactions, favors]
  )

  if (loading) {
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
        className={`${GLASS.control} rounded-xl p-3 space-y-2 w-full text-left hover:bg-accent/50 transition-colors group`}
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
