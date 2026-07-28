'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Check, UserPlus, MessageSquare, Tag, Home, Plane, Share2, X, Zap, Globe } from 'lucide-react'
import { GLASS } from '@/lib/constants/ui'

export interface OnboardingStatusResponse {
  onboardedAt: string | null
  dismissedAt: string | null
  steps: {
    profile: boolean
    contact: boolean
    trip: boolean
    interaction: boolean
    tag: boolean
    atlas: boolean
  }
  counts: { contacts: number; trips: number; visitedCountries: number }
}

interface GettingStartedCardProps {
  onAddContact: () => void
  onOpenProfile: () => void
  onAddTrip?: () => void
  onQuickLog?: () => void
  onOpenSettings?: () => void
  onSwitchToGlobe?: () => void
  isMobile?: boolean
  /** Change to refetch after the user does something that could tick a step off. */
  refreshKey?: string | number
  /** Called once every step is done, so the host can retire the card. */
  onAllDone?: () => void
}

interface StepDef {
  key: keyof OnboardingStatusResponse['steps']
  label: string
  hint: string
  icon: typeof Check
  actionLabel: string
  onAction?: () => void
}

export default function GettingStartedCard({
  onAddContact,
  onOpenProfile,
  onAddTrip,
  onQuickLog,
  onOpenSettings,
  onSwitchToGlobe,
  isMobile,
  refreshKey = 0,
  onAllDone,
}: GettingStartedCardProps) {
  const [status, setStatus] = useState<OnboardingStatusResponse | null>(null)
  const [dismissing, setDismissing] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    fetch('/api/me/onboarding', { signal: controller.signal, cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: OnboardingStatusResponse | null) => { if (data) setStatus(data) })
      .catch(() => {})
    return () => controller.abort()
  }, [refreshKey])

  const handleDismiss = useCallback(async () => {
    setDismissing(true)
    // Dismissal lives on the server, so it follows the user to every device instead of
    // reappearing on each new browser the way localStorage did.
    try {
      await fetch('/api/me/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ complete: true }),
      })
    } catch {
      // Non-fatal: the card simply comes back next load.
    }
    onAllDone?.()
  }, [onAllDone])

  const steps = useMemo<StepDef[]>(() => [
    {
      key: 'profile',
      label: 'Put yourself on the map',
      hint: 'Sets the centre of your globe',
      icon: Home,
      actionLabel: 'Set up',
      onAction: onOpenProfile,
    },
    {
      key: 'contact',
      label: 'Add your first person',
      hint: 'Import a file or add one by hand',
      icon: UserPlus,
      actionLabel: 'Add',
      onAction: onAddContact,
    },
    {
      key: 'trip',
      label: 'Log where you have been',
      hint: 'Unlocks days per country and crossing paths',
      icon: Plane,
      actionLabel: 'Add trip',
      onAction: onAddTrip,
    },
    {
      key: 'interaction',
      label: 'Log a meeting',
      hint: 'Keeps reconnect reminders honest',
      icon: MessageSquare,
      actionLabel: 'Log it',
      onAction: onQuickLog,
    },
    {
      key: 'tag',
      label: 'Tag someone',
      hint: 'Tags drive filters and segments',
      icon: Tag,
      actionLabel: 'Open',
      onAction: onAddContact,
    },
    {
      key: 'atlas',
      label: 'Claim your username',
      hint: 'Reserves konterra.space/u/you — publishing stays optional',
      icon: Share2,
      actionLabel: 'Claim',
      onAction: onOpenProfile,
    },
  ], [onAddContact, onOpenProfile, onAddTrip, onQuickLog])

  const completed = status ? steps.filter((s) => status.steps[s.key]).length : 0
  const total = steps.length
  const allDone = Boolean(status) && completed === total

  // A checklist that keeps showing 100% is just noise; retire it once there is nothing
  // left to do rather than waiting to be dismissed by hand.
  useEffect(() => {
    if (allDone) onAllDone?.()
  }, [allDone, onAllDone])

  if (!status) {
    return (
      <div className={`${GLASS.control} rounded-xl p-4 space-y-2`}>
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-1.5 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    )
  }

  if (allDone) return null

  const pct = Math.round((completed / total) * 100)
  const nextStep = steps.find((s) => !status.steps[s.key])

  return (
    <div className={`${GLASS.control} rounded-xl p-4 space-y-3`}>
      <div className="flex items-center justify-between">
        <span className="meta-label text-[10px]">Getting Started</span>
        <div className="flex items-center gap-1.5">
          <Badge className="bg-primary/15 text-primary border-primary/25 text-[10px] px-1.5 py-0 h-4">
            {completed}/{total}
          </Badge>
          <button
            onClick={handleDismiss}
            disabled={dismissing}
            aria-label="Hide getting started"
            className="text-muted-foreground/50 hover:text-foreground transition-colors p-0.5"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      </div>

      <div className="space-y-1">
        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
          <div className="h-full rounded-full bg-primary transition-[width] duration-500" style={{ width: `${pct}%` }} />
        </div>
        {nextStep ? (
          <p className="text-[10px] text-muted-foreground">Next: {nextStep.hint.toLowerCase()}</p>
        ) : (
          <p className="text-[10px] text-muted-foreground">All set — nice work.</p>
        )}
      </div>

      <div className="space-y-1">
        {steps.map((step) => {
          const done = status.steps[step.key]
          const Icon = step.icon
          return (
            <div
              key={step.key}
              className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 transition-colors ${done ? 'opacity-60' : 'bg-muted/30'}`}
            >
              {done ? (
                <div className="h-5 w-5 rounded-full bg-green-500/15 flex items-center justify-center shrink-0">
                  <Check className="h-3 w-3 text-green-500" />
                </div>
              ) : (
                <div className="h-5 w-5 rounded-full border border-border flex items-center justify-center shrink-0">
                  <Icon className="h-3 w-3 text-muted-foreground" />
                </div>
              )}
              <span className={`text-[11px] flex-1 min-w-0 ${done ? 'text-muted-foreground line-through truncate' : 'text-foreground'}`}>
                {step.label}
              </span>
              {/* Every open step gets a way to act on it — a checklist item you cannot
                  action from where you read it is just a nag. */}
              {!done && step.onAction && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={step.onAction}
                  className="h-6 px-2 text-[10px] text-primary hover:text-primary hover:bg-primary/10 shrink-0"
                >
                  {step.actionLabel}
                </Button>
              )}
            </div>
          )
        })}
      </div>

      {/* On a phone the globe lives behind a view switch, so a first-time user can miss
          that it exists at all. */}
      {isMobile && onSwitchToGlobe && (
        <button
          onClick={onSwitchToGlobe}
          className="flex w-full items-center gap-2 rounded-lg bg-primary/5 border border-primary/10 px-3 py-2 text-left transition-colors active:scale-[0.98]"
        >
          <Globe className="h-3 w-3 text-primary shrink-0" />
          <span className="text-[11px] text-foreground">See everyone on the globe</span>
        </button>
      )}

      {onOpenSettings && (
        <button
          onClick={onOpenSettings}
          className="flex w-full items-center gap-2 rounded-lg bg-primary/5 border border-primary/10 px-3 py-2 text-left transition-colors hover:bg-primary/10"
        >
          <Zap className="h-3 w-3 text-primary shrink-0" />
          <span className="text-[11px] text-foreground">Connect Claude or ChatGPT over MCP</span>
        </button>
      )}
    </div>
  )
}
