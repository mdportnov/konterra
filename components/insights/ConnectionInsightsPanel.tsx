'use client'

import { useState, useMemo, useCallback } from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { GLASS } from '@/lib/constants/ui'
import { toast } from 'sonner'
import {
  Users, ShieldAlert, Lightbulb, ChevronDown, MapPin,
  ArrowRightLeft, Link2, Unlink, TrendingUp, TrendingDown, Minus,
  Crown, Triangle, Handshake, Globe as GlobeIcon, Star,
  MessageSquare, X, AlarmClockOff,
} from 'lucide-react'
import {
  computeNetworkMetrics,
  connectionTypeBreakdown,
  strengthDistribution,
  findHubs,
  detectClusters,
  findIsolatedContacts,
  findBridgeContacts,
  suggestIntroductions,
  findWeakConnections,
  computeRiskAlerts,
  networkReachAnalysis,
  geographicConnectionDensity,
} from '@/lib/connection-insights'
import type {
  Cluster, IntroductionSuggestion, RiskAlert,
  WeakConnectionAlert,
} from '@/lib/connection-insights'
import type { Contact, ContactConnection, Interaction, Favor } from '@/lib/db/schema'

interface ConnectionInsightsPanelProps {
  contacts: Contact[]
  connections: ContactConnection[]
  interactions: Interaction[]
  favors: Favor[]
  onContactClick: (contact: Contact) => void
  loading?: boolean
}

const CONNECTION_TYPE_COLORS: Record<string, string> = {
  knows: 'rgba(251,146,60,0.7)',
  introduced_by: 'rgba(168,85,247,0.7)',
  works_with: 'rgba(59,130,246,0.7)',
  reports_to: 'rgba(239,68,68,0.7)',
  invested_in: 'rgba(34,197,94,0.7)',
  referred_by: 'rgba(236,72,153,0.7)',
}

const CONNECTION_TYPE_LABELS: Record<string, string> = {
  knows: 'Knows',
  introduced_by: 'Introduced by',
  works_with: 'Works with',
  reports_to: 'Reports to',
  invested_in: 'Invested in',
  referred_by: 'Referred by',
}

const SEVERITY_STYLES: Record<string, { border: string; bg: string; text: string; dot: string }> = {
  high: { border: 'border-red-500/30', bg: 'bg-red-500/5', text: 'text-red-400', dot: 'bg-red-400' },
  medium: { border: 'border-amber-500/30', bg: 'bg-amber-500/5', text: 'text-amber-400', dot: 'bg-amber-400' },
  low: { border: 'border-border', bg: 'bg-muted/50', text: 'text-muted-foreground', dot: 'bg-muted-foreground/30' },
}

function initials(name: string): string {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
}

function Section({ title, icon: Icon, badge, children, defaultOpen = true }: {
  title: string
  icon: React.ComponentType<{ className?: string }>
  badge?: number | string
  children: React.ReactNode
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="space-y-2">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 group rounded-md focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      >
        <Icon className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
        <span className="text-xs font-medium text-muted-foreground/60 uppercase tracking-wider group-hover:text-muted-foreground transition-colors">
          {title}
        </span>
        {badge !== undefined && (
          <Badge className="bg-orange-500/20 text-orange-600 dark:text-orange-300 border-orange-500/30 text-[10px] px-1.5 py-0">
            {badge}
          </Badge>
        )}
        <ChevronDown className={`h-3 w-3 ml-auto text-muted-foreground/40 transition-transform duration-200 ${open ? '' : '-rotate-90'}`} />
      </button>
      <div
        className="grid transition-[grid-template-rows,opacity] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]"
        style={{
          gridTemplateRows: open ? '1fr' : '0fr',
          opacity: open ? 1 : 0,
        }}
      >
        <div className="overflow-hidden">
          {children}
        </div>
      </div>
    </div>
  )
}

function MetricCard({ label, value, subtext, trend }: {
  label: string
  value: string | number
  subtext?: string
  trend?: 'up' | 'down' | 'neutral'
}) {
  return (
    <div className={`${GLASS.control} rounded-lg p-3 space-y-1`}>
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</span>
        {trend && (
          trend === 'up' ? <TrendingUp className="h-3 w-3 text-green-500" /> :
          trend === 'down' ? <TrendingDown className="h-3 w-3 text-red-400" /> :
          <Minus className="h-3 w-3 text-muted-foreground" />
        )}
      </div>
      <p className="text-lg font-semibold text-foreground tabular-nums">{value}</p>
      {subtext && <p className="text-[10px] text-muted-foreground/60">{subtext}</p>}
    </div>
  )
}

function ContactRow({ contact, onClick, right }: {
  contact: Contact
  onClick: () => void
  right?: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left flex items-center gap-2.5 p-2 rounded-lg hover:bg-muted/50 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
    >
      <Avatar className="h-7 w-7 shrink-0">
        <AvatarImage src={contact.photo || undefined} />
        <AvatarFallback className="text-[10px] bg-muted text-muted-foreground">
          {initials(contact.name)}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-foreground truncate">{contact.name}</p>
        {(contact.company || contact.city) && (
          <p className="text-[10px] text-muted-foreground/60 truncate">
            {[contact.company, contact.city].filter(Boolean).join(' / ')}
          </p>
        )}
      </div>
      {right}
    </button>
  )
}

function LoadingSkeleton() {
  return (
    <div className="p-5 space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-48" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className={`${GLASS.control} rounded-lg p-3 space-y-2`}>
            <Skeleton className="h-2.5 w-16" />
            <Skeleton className="h-5 w-12" />
          </div>
        ))}
      </div>
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-3.5 w-24" />
          <div className="space-y-1.5">
            {Array.from({ length: 3 }).map((_, j) => (
              <Skeleton key={j} className="h-10 w-full rounded-lg" />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

export default function ConnectionInsightsPanel({
  contacts,
  connections,
  interactions,
  favors,
  onContactClick,
  loading = false,
}: ConnectionInsightsPanelProps) {
  const metrics = useMemo(
    () => computeNetworkMetrics(contacts, connections),
    [contacts, connections]
  )
  const typeBreakdown = useMemo(
    () => connectionTypeBreakdown(connections),
    [connections]
  )
  const strengthDist = useMemo(
    () => strengthDistribution(connections),
    [connections]
  )
  const hubs = useMemo(
    () => findHubs(contacts, connections, 5),
    [contacts, connections]
  )
  const clusters = useMemo(
    () => detectClusters(contacts, connections),
    [contacts, connections]
  )
  const isolated = useMemo(
    () => findIsolatedContacts(contacts, connections),
    [contacts, connections]
  )
  const bridges = useMemo(
    () => findBridgeContacts(contacts, connections),
    [contacts, connections]
  )
  const suggestions = useMemo(
    () => suggestIntroductions(contacts, connections, 8),
    [contacts, connections]
  )
  const weakConns = useMemo(
    () => findWeakConnections(contacts, connections, interactions),
    [contacts, connections, interactions]
  )
  const risks = useMemo(
    () => computeRiskAlerts(contacts, connections, interactions, favors),
    [contacts, connections, interactions, favors]
  )
  const reach = useMemo(
    () => networkReachAnalysis(contacts, connections),
    [contacts, connections]
  )
  const geoDensity = useMemo(
    () => geographicConnectionDensity(contacts, connections),
    [contacts, connections]
  )

  const [dismissed, setDismissed] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set()
    try {
      const stored = localStorage.getItem('konterra-dismissed-risks')
      return stored ? new Set(JSON.parse(stored)) : new Set()
    } catch { return new Set() }
  })

  const [snoozed, setSnoozed] = useState<Map<string, number>>(() => {
    if (typeof window === 'undefined') return new Map()
    try {
      const stored = localStorage.getItem('konterra-snoozed-risks')
      return stored ? new Map(Object.entries(JSON.parse(stored))) : new Map()
    } catch { return new Map() }
  })

  const [quickLogContact, setQuickLogContact] = useState<Contact | null>(null)
  const [quickLogForm, setQuickLogForm] = useState({ type: 'call', notes: '' })

  const handleDismissRisk = useCallback((key: string) => {
    const next = new Set(dismissed)
    next.add(key)
    setDismissed(next)
    localStorage.setItem('konterra-dismissed-risks', JSON.stringify([...next]))
  }, [dismissed])

  const handleSnoozeRisk = useCallback((key: string) => {
    const next = new Map(snoozed)
    next.set(key, Date.now() + 30 * 86400000)
    setSnoozed(next)
    localStorage.setItem('konterra-snoozed-risks', JSON.stringify(Object.fromEntries(next)))
    toast.success('Snoozed for 30 days')
  }, [snoozed])

  const handleQuickLogFromRisk = useCallback((contact: Contact) => {
    setQuickLogContact(contact)
    setQuickLogForm({ type: 'call', notes: '' })
  }, [])

  const submitQuickLog = useCallback(async () => {
    if (!quickLogContact) return
    try {
      const res = await fetch(`/api/contacts/${quickLogContact.id}/interactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: quickLogForm.type, notes: quickLogForm.notes || null, date: new Date().toISOString() }),
      })
      if (res.ok) {
        toast.success('Interaction logged')
        setQuickLogContact(null)
      }
    } catch { toast.error('Failed to log interaction') }
  }, [quickLogContact, quickLogForm])

  const handleIntroduce = useCallback(async (suggestion: IntroductionSuggestion) => {
    try {
      const res = await fetch('/api/introductions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactAId: suggestion.contactA.id,
          contactBId: suggestion.contactB.id,
          initiatedBy: 'self',
          status: 'planned',
        }),
      })
      if (res.ok) toast.success('Introduction planned')
      else {
        const body = await res.json().catch(() => ({}))
        toast.error(body.error || 'Failed to create introduction')
      }
    } catch { toast.error('Failed to create introduction') }
  }, [])

  const now = Date.now()
  const filteredRisks = useMemo(() =>
    risks.filter((r) => {
      const key = `${r.contact.id}-${r.type}`
      if (dismissed.has(key)) return false
      const snoozeUntil = snoozed.get(key)
      if (snoozeUntil && snoozeUntil > now) return false
      return true
    }), [risks, dismissed, snoozed, now])

  if (loading) return <LoadingSkeleton />

  if (contacts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <Users className="h-10 w-10 text-muted-foreground/20 mb-3" />
        <p className="text-sm font-medium text-muted-foreground">No contacts yet</p>
        <p className="text-xs text-muted-foreground/60 mt-1">
          Add contacts to start seeing network insights
        </p>
      </div>
    )
  }

  const maxTypeCount = typeBreakdown.length > 0 ? typeBreakdown[0].count : 1
  const maxStrengthCount = Math.max(...strengthDist.map((s) => s.count), 1)
  const highRisks = filteredRisks.filter((r) => r.severity === 'high').length

  return (
    <ScrollArea className="h-full">
      <div className="p-5 space-y-5">
        <div>
          <h2 className="text-base font-semibold text-foreground">Connection Insights</h2>
          <p className="text-xs text-muted-foreground/60 mt-0.5">
            Network analysis across {contacts.length} contacts and {connections.length} connections
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <MetricCard
            label="Connections"
            value={metrics.totalConnections}
            subtext={`${(metrics.networkDensity * 100).toFixed(1)}% density`}
          />
          <MetricCard
            label="Avg Strength"
            value={metrics.averageStrength.toFixed(1)}
            subtext="out of 5"
          />
          <MetricCard
            label="Connected"
            value={`${Math.round(metrics.connectedContactsRatio * 100)}%`}
            subtext={`${isolated.length} isolated`}
          />
          <MetricCard
            label="Bidirectional"
            value={`${Math.round(metrics.bidirectionalRatio * 100)}%`}
            subtext="mutual connections"
          />
        </div>

        <div className={`${GLASS.control} rounded-xl p-3 space-y-1.5`}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Network Reach</span>
            <GlobeIcon className="h-3 w-3 text-muted-foreground/40" />
          </div>
          <div className="flex items-center gap-3">
            <div className="text-center flex-1">
              <p className="text-sm font-semibold text-foreground">{reach.directReach}</p>
              <p className="text-[9px] text-muted-foreground/60">Direct</p>
            </div>
            <div className="w-px h-6 bg-border" />
            <div className="text-center flex-1">
              <p className="text-sm font-semibold text-muted-foreground">{reach.secondDegree}</p>
              <p className="text-[9px] text-muted-foreground/60">2nd degree</p>
            </div>
            <div className="w-px h-6 bg-border" />
            <div className="text-center flex-1">
              <p className="text-sm font-semibold text-muted-foreground/60">{reach.thirdDegree}</p>
              <p className="text-[9px] text-muted-foreground/60">3rd degree</p>
            </div>
          </div>
        </div>

        <Separator className="bg-border" />

        <Section title="Connection Types" icon={ArrowRightLeft}>
          {typeBreakdown.length === 0 ? (
            <p className="text-[11px] text-muted-foreground/40 py-1">No connections yet</p>
          ) : (
            <div className="space-y-1.5">
              {typeBreakdown.map((item) => (
                <div key={item.type} className="flex items-center gap-2">
                  <span className="text-[11px] text-muted-foreground w-24 truncate text-right shrink-0">
                    {CONNECTION_TYPE_LABELS[item.type] || item.type}
                  </span>
                  <div className="flex-1 h-4 rounded-sm bg-muted/50 overflow-hidden">
                    <div
                      className="h-full rounded-sm transition-[width] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]"
                      style={{
                        width: `${(item.count / maxTypeCount) * 100}%`,
                        backgroundColor: CONNECTION_TYPE_COLORS[item.type] || 'rgba(148,163,184,0.7)',
                      }}
                    />
                  </div>
                  <span className="text-[10px] text-muted-foreground/60 w-8 text-right tabular-nums shrink-0">
                    {item.count}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Section>

        <Section title="Strength Distribution" icon={Star}>
          {connections.length === 0 ? (
            <p className="text-[11px] text-muted-foreground/40 py-1">No connections yet</p>
          ) : (
            <div className="flex items-end gap-1.5 h-16">
              {strengthDist.map((item) => (
                <div key={item.strength} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full relative" style={{ height: 48 }}>
                    <div
                      className="absolute bottom-0 w-full rounded-t-sm transition-all duration-500"
                      style={{
                        height: `${maxStrengthCount > 0 ? (item.count / maxStrengthCount) * 100 : 0}%`,
                        backgroundColor: `rgba(249,115,22,${0.3 + item.strength * 0.14})`,
                        minHeight: item.count > 0 ? 4 : 0,
                      }}
                    />
                  </div>
                  <span className="text-[9px] text-muted-foreground tabular-nums">{item.strength}</span>
                </div>
              ))}
            </div>
          )}
        </Section>

        <Separator className="bg-border" />

        <Section title="Network Hubs" icon={Crown} badge={hubs.length || undefined}>
          {hubs.length === 0 ? (
            <p className="text-[11px] text-muted-foreground/40 py-1">No hubs detected</p>
          ) : (
            <div className="space-y-1">
              {hubs.map((hub, i) => (
                <ContactRow
                  key={hub.contact.id}
                  contact={hub.contact}
                  onClick={() => onContactClick(hub.contact)}
                  right={
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] text-muted-foreground tabular-nums">
                        {hub.degree} conn
                      </span>
                      <div
                        className="w-1.5 h-1.5 rounded-full"
                        style={{
                          backgroundColor: `rgba(249,115,22,${1 - i * 0.15})`,
                        }}
                      />
                    </div>
                  }
                />
              ))}
            </div>
          )}
        </Section>

        {bridges.length > 0 && (
          <Section title="Bridge Contacts" icon={Link2} badge={bridges.length} defaultOpen={false}>
            <p className="text-[10px] text-muted-foreground/60 -mt-1 mb-1">
              These contacts connect otherwise separate groups
            </p>
            <div className="space-y-1">
              {bridges.slice(0, 5).map((bridge) => (
                <ContactRow
                  key={bridge.contact.id}
                  contact={bridge.contact}
                  onClick={() => onContactClick(bridge.contact)}
                  right={
                    <span className="text-[10px] text-muted-foreground shrink-0">
                      {bridge.clustersConnected} groups
                    </span>
                  }
                />
              ))}
            </div>
          </Section>
        )}

        <Section title="Clusters" icon={Users} badge={clusters.length || undefined} defaultOpen={false}>
          {clusters.length === 0 ? (
            <p className="text-[11px] text-muted-foreground/40 py-1">No clusters detected</p>
          ) : (
            <div className="space-y-2">
              {clusters.slice(0, 6).map((cluster) => (
                <ClusterCard
                  key={cluster.id}
                  cluster={cluster}
                  onContactClick={onContactClick}
                />
              ))}
            </div>
          )}
        </Section>

        {isolated.length > 0 && (
          <Section title="Isolated Contacts" icon={Unlink} badge={isolated.length} defaultOpen={false}>
            <p className="text-[10px] text-muted-foreground/60 -mt-1 mb-1">
              No connections mapped for these contacts
            </p>
            <div className="space-y-1">
              {isolated.slice(0, 8).map((contact) => (
                <ContactRow
                  key={contact.id}
                  contact={contact}
                  onClick={() => onContactClick(contact)}
                  right={
                    contact.rating ? (
                      <div className="flex items-center gap-0.5 shrink-0">
                        <Star className="h-2.5 w-2.5 text-amber-400 fill-amber-400" />
                        <span className="text-[10px] text-muted-foreground">{contact.rating}</span>
                      </div>
                    ) : undefined
                  }
                />
              ))}
              {isolated.length > 8 && (
                <p className="text-[10px] text-muted-foreground/40 text-center py-1">
                  +{isolated.length - 8} more
                </p>
              )}
            </div>
          </Section>
        )}

        <Separator className="bg-border" />

        <Section title="Introduction Suggestions" icon={Handshake} badge={suggestions.length || undefined}>
          {suggestions.length === 0 ? (
            <p className="text-[11px] text-muted-foreground/40 py-1">No suggestions available</p>
          ) : (
            <div className="space-y-2">
              {suggestions.map((suggestion, i) => (
                <IntroductionCard
                  key={i}
                  suggestion={suggestion}
                  onContactClick={onContactClick}
                  onIntroduce={handleIntroduce}
                />
              ))}
            </div>
          )}
        </Section>

        <Separator className="bg-border" />

        {filteredRisks.length > 0 && (
          <Section title="Risk Alerts" icon={ShieldAlert} badge={highRisks > 0 ? highRisks : undefined}>
            <div className="space-y-1.5">
              {filteredRisks.slice(0, 8).map((risk, i) => (
                <RiskCard
                  key={i}
                  risk={risk}
                  onContactClick={onContactClick}
                  onDismiss={handleDismissRisk}
                  onSnooze={handleSnoozeRisk}
                  onQuickLog={handleQuickLogFromRisk}
                />
              ))}
            </div>
            {quickLogContact && (
              <div className="mt-2 p-2 rounded-lg bg-accent/50 border border-border space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium text-foreground">Log interaction with {quickLogContact.name}</span>
                  <button onClick={() => setQuickLogContact(null)} className="text-muted-foreground/40 hover:text-foreground cursor-pointer"><X className="h-3 w-3" /></button>
                </div>
                <select value={quickLogForm.type} onChange={(e) => setQuickLogForm((p) => ({ ...p, type: e.target.value }))} className="w-full h-6 text-[10px] rounded border border-input bg-muted/50 px-1 text-foreground cursor-pointer">
                  {(['meeting', 'call', 'message', 'email', 'event', 'note'] as const).map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
                <Input value={quickLogForm.notes} onChange={(e) => setQuickLogForm((p) => ({ ...p, notes: e.target.value }))} placeholder="Notes..." className="h-6 text-[10px] bg-muted/50" />
                <Button size="sm" className="h-6 text-[10px] w-full bg-orange-500 hover:bg-orange-600 text-white" onClick={submitQuickLog}>Log</Button>
              </div>
            )}
          </Section>
        )}

        {weakConns.length > 0 && (
          <Section title="Connections to Strengthen" icon={Lightbulb} badge={weakConns.length} defaultOpen={false}>
            <div className="space-y-1.5">
              {weakConns.slice(0, 8).map((alert, i) => (
                <WeakConnectionCard key={i} alert={alert} onContactClick={onContactClick} />
              ))}
            </div>
          </Section>
        )}

        {geoDensity.length > 0 && (
          <>
            <Separator className="bg-border" />
            <Section title="Geographic Density" icon={MapPin} defaultOpen={false}>
              <div className="space-y-1.5">
                {geoDensity.slice(0, 8).map((geo) => (
                  <div key={geo.country} className="flex items-center gap-2">
                    <span className="text-[11px] text-muted-foreground w-24 truncate text-right shrink-0">
                      {geo.country}
                    </span>
                    <div className="flex-1 flex items-center gap-1.5">
                      <span className="text-[10px] text-foreground tabular-nums w-6 text-right">{geo.contacts}</span>
                      <span className="text-[10px] text-muted-foreground/40">contacts</span>
                      <span className="text-[10px] text-foreground tabular-nums w-4 text-right">{geo.connections}</span>
                      <span className="text-[10px] text-muted-foreground/40">links</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground/60 tabular-nums w-10 text-right shrink-0">
                      {(geo.density * 100).toFixed(0)}%
                    </span>
                  </div>
                ))}
              </div>
            </Section>
          </>
        )}

        <div className="h-4" />
      </div>
    </ScrollArea>
  )
}

function ClusterCard({ cluster, onContactClick }: {
  cluster: Cluster
  onContactClick: (contact: Contact) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const displayContacts = expanded ? cluster.contacts : cluster.contacts.slice(0, 3)

  return (
    <div className={`${GLASS.control} rounded-lg p-2.5 space-y-1.5`}>
      <button onClick={() => setExpanded(!expanded)} className="w-full flex items-center gap-2">
        <div className="flex -space-x-1.5">
          {cluster.contacts.slice(0, 3).map((c) => (
            <Avatar key={c.id} className="h-5 w-5 border border-background">
              <AvatarImage src={c.photo || undefined} />
              <AvatarFallback className="text-[8px] bg-muted text-muted-foreground">
                {initials(c.name)}
              </AvatarFallback>
            </Avatar>
          ))}
          {cluster.contacts.length > 3 && (
            <div className="h-5 w-5 rounded-full bg-muted border border-background flex items-center justify-center">
              <span className="text-[8px] text-muted-foreground">+{cluster.contacts.length - 3}</span>
            </div>
          )}
        </div>
        <span className="text-xs text-foreground font-medium">{cluster.contacts.length} people</span>
        <span className="text-[10px] text-muted-foreground">
          {cluster.internalConnections} links
        </span>
        <div className="ml-auto flex items-center gap-1">
          {cluster.dominantType && (
            <Badge variant="outline" className="text-[9px] px-1 py-0 border-border text-muted-foreground">
              {CONNECTION_TYPE_LABELS[cluster.dominantType] || cluster.dominantType}
            </Badge>
          )}
          <ChevronDown className={`h-3 w-3 text-muted-foreground/40 transition-transform duration-200 ${expanded ? '' : '-rotate-90'}`} />
        </div>
      </button>
      {cluster.sharedTags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {cluster.sharedTags.slice(0, 4).map((tag) => (
            <Badge key={tag} variant="outline" className="text-[9px] px-1 py-0 border-orange-500/20 text-orange-500/70">
              {tag}
            </Badge>
          ))}
        </div>
      )}
      {cluster.sharedCountry && (
        <div className="flex items-center gap-1">
          <MapPin className="h-2.5 w-2.5 text-muted-foreground/40" />
          <span className="text-[10px] text-muted-foreground/60">{cluster.sharedCountry}</span>
        </div>
      )}
      <div
        className="grid transition-[grid-template-rows,opacity] duration-200 ease-[cubic-bezier(0.32,0.72,0,1)]"
        style={{
          gridTemplateRows: expanded ? '1fr' : '0fr',
          opacity: expanded ? 1 : 0,
        }}
      >
        <div className="overflow-hidden">
          <div className="space-y-0.5 pt-1">
            {displayContacts.map((c) => (
              <ContactRow key={c.id} contact={c} onClick={() => onContactClick(c)} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function IntroductionCard({ suggestion, onContactClick, onIntroduce }: {
  suggestion: IntroductionSuggestion
  onContactClick: (contact: Contact) => void
  onIntroduce?: (suggestion: IntroductionSuggestion) => void
}) {
  return (
    <div className={`${GLASS.control} rounded-lg p-2.5 space-y-1.5`}>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onContactClick(suggestion.contactA)}
          className="flex items-center gap-1.5 min-w-0 flex-1 rounded-md p-0.5 -m-0.5 hover:bg-muted/50 transition-colors"
        >
          <Avatar className="h-6 w-6 shrink-0">
            <AvatarImage src={suggestion.contactA.photo || undefined} />
            <AvatarFallback className="text-[9px] bg-muted text-muted-foreground">
              {initials(suggestion.contactA.name)}
            </AvatarFallback>
          </Avatar>
          <span className="text-xs text-foreground font-medium truncate">{suggestion.contactA.name}</span>
        </button>
        <ArrowRightLeft className="h-3 w-3 text-muted-foreground/40 shrink-0" />
        <button
          onClick={() => onContactClick(suggestion.contactB)}
          className="flex items-center gap-1.5 min-w-0 flex-1 rounded-md p-0.5 -m-0.5 hover:bg-muted/50 transition-colors"
        >
          <Avatar className="h-6 w-6 shrink-0">
            <AvatarImage src={suggestion.contactB.photo || undefined} />
            <AvatarFallback className="text-[9px] bg-muted text-muted-foreground">
              {initials(suggestion.contactB.name)}
            </AvatarFallback>
          </Avatar>
          <span className="text-xs text-foreground font-medium truncate">{suggestion.contactB.name}</span>
        </button>
      </div>
      <div className="flex items-center gap-1">
        <div className="flex flex-wrap gap-1 flex-1">
          {suggestion.reasons.map((reason, i) => (
            <Badge key={i} variant="outline" className="text-[9px] px-1.5 py-0 border-green-500/20 text-green-600 dark:text-green-400">
              {reason}
            </Badge>
          ))}
        </div>
        {onIntroduce && (
          <button
            onClick={() => onIntroduce(suggestion)}
            className="text-[9px] px-1.5 py-0.5 rounded bg-green-500/10 hover:bg-green-500/20 text-green-600 dark:text-green-400 cursor-pointer transition-colors shrink-0"
          >
            Introduce
          </button>
        )}
      </div>
    </div>
  )
}

function RiskCard({ risk, onContactClick, onDismiss, onSnooze, onQuickLog }: {
  risk: RiskAlert
  onContactClick: (contact: Contact) => void
  onDismiss?: (key: string) => void
  onSnooze?: (key: string) => void
  onQuickLog?: (contact: Contact) => void
}) {
  const style = SEVERITY_STYLES[risk.severity]
  const key = `${risk.contact.id}-${risk.type}`
  return (
    <div className={`p-2.5 rounded-lg border ${style.border} ${style.bg} transition-all`}>
      <button
        onClick={() => onContactClick(risk.contact)}
        className="w-full text-left focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      >
        <div className="flex items-start gap-2">
          <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${style.dot}`} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium text-foreground">{risk.contact.name}</span>
              <Badge variant="outline" className={`text-[9px] px-1 py-0 ${style.text} border-current/20`}>
                {risk.severity}
              </Badge>
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">{risk.description}</p>
          </div>
        </div>
      </button>
      <div className="flex gap-1 mt-1.5 ml-3.5">
        {onQuickLog && (
          <button onClick={() => onQuickLog(risk.contact)} className="text-[9px] px-1.5 py-0.5 rounded bg-orange-500/10 hover:bg-orange-500/20 text-orange-500 cursor-pointer transition-colors">Reach out</button>
        )}
        {onSnooze && (
          <button onClick={() => onSnooze(key)} className="text-[9px] px-1.5 py-0.5 rounded bg-muted hover:bg-accent text-muted-foreground cursor-pointer transition-colors">Snooze 30d</button>
        )}
        {onDismiss && (
          <button onClick={() => onDismiss(key)} className="text-[9px] px-1.5 py-0.5 rounded bg-muted hover:bg-accent text-muted-foreground cursor-pointer transition-colors">Dismiss</button>
        )}
      </div>
    </div>
  )
}

function WeakConnectionCard({ alert, onContactClick }: {
  alert: WeakConnectionAlert
  onContactClick: (contact: Contact) => void
}) {
  const issueColor: Record<string, string> = {
    no_recent_interaction: 'text-red-400',
    low_strength: 'text-amber-400',
    one_directional: 'text-blue-400',
  }
  const color = issueColor[alert.issue] || 'text-muted-foreground'

  return (
    <div className="p-2 rounded-lg hover:bg-muted/30 transition-colors space-y-1.5">
      <div className="flex items-center gap-2">
        <button onClick={() => onContactClick(alert.source)} className="flex items-center gap-1.5 min-w-0 flex-1">
          <Avatar className="h-5 w-5 shrink-0">
            <AvatarImage src={alert.source.photo || undefined} />
            <AvatarFallback className="text-[8px] bg-muted text-muted-foreground">
              {initials(alert.source.name)}
            </AvatarFallback>
          </Avatar>
          <span className="text-[11px] text-foreground truncate">{alert.source.name}</span>
        </button>
        <Triangle className={`h-2.5 w-2.5 rotate-90 shrink-0 ${color}`} />
        <button onClick={() => onContactClick(alert.target)} className="flex items-center gap-1.5 min-w-0 flex-1">
          <Avatar className="h-5 w-5 shrink-0">
            <AvatarImage src={alert.target.photo || undefined} />
            <AvatarFallback className="text-[8px] bg-muted text-muted-foreground">
              {initials(alert.target.name)}
            </AvatarFallback>
          </Avatar>
          <span className="text-[11px] text-foreground truncate">{alert.target.name}</span>
        </button>
      </div>
      <p className={`text-[9px] ${color} pl-7`}>{alert.detail}</p>
    </div>
  )
}
