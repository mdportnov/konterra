'use client'

import { useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Check, Circle, UserPlus, MessageSquare, Link2, Tag, Home } from 'lucide-react'
import { GLASS } from '@/lib/constants/ui'
import type { Contact, ContactConnection } from '@/lib/db/schema'

interface GettingStartedCardProps {
  contacts: Contact[]
  connections: ContactConnection[]
  recentInteractions: { contactName: string }[]
  onAddContact: () => void
  onOpenSettings: () => void
}

interface Step {
  key: string
  label: string
  done: boolean
  icon: typeof Check
  action?: { label: string; onClick: () => void }
}

export default function GettingStartedCard({
  contacts,
  connections,
  recentInteractions,
  onAddContact,
  onOpenSettings,
}: GettingStartedCardProps) {
  const steps = useMemo<Step[]>(() => {
    const hasProfile = contacts.some((c) => c.isSelf)
    const nonSelfContacts = contacts.filter((c) => !c.isSelf)
    const hasContact = nonSelfContacts.length > 0
    const hasInteraction = recentInteractions.length > 0
    const hasConnection = connections.length > 0
    const hasTag = contacts.some((c) => c.tags && c.tags.length > 0)

    return [
      {
        key: 'profile',
        label: 'Set up your profile',
        done: hasProfile,
        icon: Home,
        action: hasProfile ? undefined : { label: 'Set up', onClick: onOpenSettings },
      },
      {
        key: 'contact',
        label: 'Add your first contact',
        done: hasContact,
        icon: UserPlus,
        action: hasContact ? undefined : { label: 'Add', onClick: onAddContact },
      },
      {
        key: 'interaction',
        label: 'Log your first interaction',
        done: hasInteraction,
        icon: MessageSquare,
      },
      {
        key: 'connection',
        label: 'Create a connection between contacts',
        done: hasConnection,
        icon: Link2,
      },
      {
        key: 'tag',
        label: 'Add a tag to a contact',
        done: hasTag,
        icon: Tag,
      },
    ]
  }, [contacts, connections, recentInteractions, onAddContact, onOpenSettings])

  const completed = steps.filter((s) => s.done).length
  const total = steps.length
  const pct = Math.round((completed / total) * 100)

  return (
    <div className={`${GLASS.control} rounded-xl p-4 space-y-3`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-foreground">Getting Started</span>
        <Badge className="bg-orange-500/15 text-orange-500 border-orange-500/25 text-[10px] px-1.5 py-0 h-4">
          {completed}/{total}
        </Badge>
      </div>

      <div className="space-y-1">
        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-orange-500 transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="text-[10px] text-muted-foreground">{pct}% complete</p>
      </div>

      <div className="space-y-1">
        {steps.map((step) => {
          const Icon = step.icon
          return (
            <div
              key={step.key}
              className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 transition-colors ${
                step.done ? 'opacity-60' : 'bg-muted/30'
              }`}
            >
              {step.done ? (
                <div className="h-5 w-5 rounded-full bg-green-500/15 flex items-center justify-center shrink-0">
                  <Check className="h-3 w-3 text-green-500" />
                </div>
              ) : (
                <div className="h-5 w-5 rounded-full border border-border flex items-center justify-center shrink-0">
                  <Icon className="h-3 w-3 text-muted-foreground" />
                </div>
              )}
              <span className={`text-[11px] flex-1 ${step.done ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                {step.label}
              </span>
              {!step.done && step.action && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={step.action.onClick}
                  className="h-6 px-2 text-[10px] text-orange-500 hover:text-orange-600 hover:bg-orange-500/10"
                >
                  {step.action.label}
                </Button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
