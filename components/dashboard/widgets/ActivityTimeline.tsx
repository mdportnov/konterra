'use client'

import {
  Phone,
  Mail,
  MessageSquare,
  Calendar,
  Users,
  Handshake,
  StickyNote,
  Video,
} from 'lucide-react'
import type { Interaction } from '@/lib/db/schema'

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  meeting: Calendar,
  call: Phone,
  message: MessageSquare,
  email: Mail,
  event: Users,
  introduction: Handshake,
  deal: Handshake,
  note: StickyNote,
  video: Video,
}

const COLORS: Record<string, string> = {
  meeting: 'bg-blue-500/20 text-blue-400',
  call: 'bg-green-500/20 text-green-400',
  message: 'bg-purple-500/20 text-purple-400',
  email: 'bg-orange-500/20 text-orange-400',
  event: 'bg-cyan-500/20 text-cyan-400',
  introduction: 'bg-pink-500/20 text-pink-400',
  deal: 'bg-amber-500/20 text-amber-400',
  note: 'bg-muted text-muted-foreground',
}

function relativeDate(date: Date | string): string {
  const d = date instanceof Date ? date : new Date(date)
  const diff = Date.now() - d.getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days}d ago`
  if (days < 30) return `${Math.floor(days / 7)}w ago`
  if (days < 365) return `${Math.floor(days / 30)}mo ago`
  return `${Math.floor(days / 365)}y ago`
}

interface ActivityTimelineProps {
  interactions: (Interaction & { contactName: string })[]
  onContactClick?: (contactId: string) => void
}

export default function ActivityTimeline({ interactions, onContactClick }: ActivityTimelineProps) {
  if (interactions.length === 0) return null

  return (
    <div className="space-y-2">
      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Recent Activity</span>
      <div className="space-y-1">
        {interactions.map((item) => {
          const Icon = ICONS[item.type] || StickyNote
          const colorClass = COLORS[item.type] || COLORS.note

          return (
            <div key={item.id} className="flex items-start gap-2.5 py-1.5">
              <div className={`rounded-md p-1.5 shrink-0 ${colorClass}`}>
                <Icon className="h-3 w-3" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => onContactClick?.(item.contactId)}
                    className="text-xs font-medium text-foreground hover:text-orange-500 dark:hover:text-orange-300 transition-colors truncate"
                  >
                    {item.contactName}
                  </button>
                  <span className="text-[10px] text-muted-foreground/60 shrink-0">{relativeDate(item.date)}</span>
                </div>
                {item.notes && (
                  <p className="text-[11px] text-muted-foreground truncate mt-0.5">{item.notes}</p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
