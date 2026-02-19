'use client'

import { useState } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Separator } from '@/components/ui/separator'
import { Loader2, Trash2, Merge, SkipForward } from 'lucide-react'
import { toast } from 'sonner'
import ContactMergeFields from './ContactMergeFields'
import type { Contact } from '@/lib/db/schema'
import type { DuplicateGroup } from '@/lib/dedup/find-duplicate-groups'

interface DupGroupCardProps {
  group: DuplicateGroup
  index: number
  total: number
  onResolved: () => void
}

type Action = 'skip' | 'merge' | 'delete'

function initials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function getVal(contact: Contact, field: string): unknown {
  return (contact as Record<string, unknown>)[field]
}

export default function DupGroupCard({ group, index, total, onResolved }: DupGroupCardProps) {
  const [action, setAction] = useState<Action>('skip')
  const [winnerId, setWinnerId] = useState(group.contacts[0].id)
  const [deleteId, setDeleteId] = useState(group.contacts[1].id)
  const [overrides, setOverrides] = useState<Record<string, string>>({})
  const [processing, setProcessing] = useState(false)

  const handleOverrideChange = (field: string, contactId: string) => {
    setOverrides((prev) => ({ ...prev, [field]: contactId }))
  }

  const handleMerge = async () => {
    const loserId = group.contacts.find((c) => c.id !== winnerId)?.id
    if (!loserId) return
    setProcessing(true)

    const winner = group.contacts.find((c) => c.id === winnerId)!
    const loser = group.contacts.find((c) => c.id === loserId)!

    const fieldOverrides: Record<string, unknown> = {}
    for (const [field, cid] of Object.entries(overrides)) {
      if (cid === loserId) {
        fieldOverrides[field] = getVal(loser, field)
      }
    }

    for (const field of Object.keys(loser)) {
      if (field === 'id' || field === 'userId' || field === 'createdAt' || field === 'updatedAt' || field === 'tags') continue
      const wVal = getVal(winner, field)
      const lVal = getVal(loser, field)
      if ((wVal === null || wVal === undefined) && lVal !== null && lVal !== undefined && !(field in fieldOverrides)) {
        fieldOverrides[field] = lVal
      }
    }

    try {
      const res = await fetch('/api/contacts/merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ winnerId, loserId, fieldOverrides }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Merge failed')
      }
      toast.success('Contacts merged')
      onResolved()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Merge failed')
    } finally {
      setProcessing(false)
    }
  }

  const handleDelete = async () => {
    setProcessing(true)
    try {
      const res = await fetch(`/api/contacts/${deleteId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Delete failed')
      toast.success('Contact deleted')
      onResolved()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Delete failed')
    } finally {
      setProcessing(false)
    }
  }

  const confidenceColor = group.confidence === 'exact'
    ? 'bg-orange-500/15 text-orange-600 dark:text-orange-300'
    : 'bg-yellow-500/15 text-yellow-600 dark:text-yellow-300'

  return (
    <div className="rounded-xl border border-border p-4 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">{index}/{total}</span>
          <span className={`text-xs font-medium uppercase px-2 py-1 rounded-md ${confidenceColor}`}>
            {group.confidence} &middot; {group.matchField}
          </span>
        </div>
        <ToggleGroup
          type="single"
          value={action}
          onValueChange={(v) => { if (v) setAction(v as Action) }}
          className="h-8"
        >
          <ToggleGroupItem value="skip" className="text-xs h-8 px-3 gap-1.5 data-[state=on]:bg-accent">
            <SkipForward className="h-3.5 w-3.5" />
            Skip
          </ToggleGroupItem>
          <ToggleGroupItem value="merge" className="text-xs h-8 px-3 gap-1.5 data-[state=on]:bg-accent">
            <Merge className="h-3.5 w-3.5" />
            Merge
          </ToggleGroupItem>
          <ToggleGroupItem value="delete" className="text-xs h-8 px-3 gap-1.5 data-[state=on]:bg-accent">
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {group.contacts.map((c) => (
          <div key={c.id} className="flex items-center gap-3 min-w-0 rounded-lg bg-muted/40 p-3">
            <Avatar className="h-10 w-10 shrink-0">
              <AvatarImage src={c.photo || undefined} />
              <AvatarFallback className="text-xs bg-muted">{initials(c.name)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 space-y-0.5">
              <p className="text-sm font-medium truncate">{c.name}</p>
              {c.email && <p className="text-xs text-muted-foreground truncate">{c.email}</p>}
              {!c.email && c.phone && <p className="text-xs text-muted-foreground truncate">{c.phone}</p>}
              {c.company && <p className="text-xs text-muted-foreground truncate">{c.company}</p>}
            </div>
          </div>
        ))}
      </div>

      {action === 'merge' && group.contacts.length === 2 && (
        <div className="space-y-3">
          <Separator />
          <p className="text-xs text-muted-foreground uppercase font-medium tracking-wide">Keep as primary</p>
          <ToggleGroup
            type="single"
            value={winnerId}
            onValueChange={(v) => { if (v) setWinnerId(v) }}
            className="w-full"
          >
            {group.contacts.map((c) => (
              <ToggleGroupItem
                key={c.id}
                value={c.id}
                className="flex-1 text-sm h-9 data-[state=on]:bg-accent"
              >
                {c.name}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>

          <ContactMergeFields
            contactA={group.contacts[0]}
            contactB={group.contacts[1]}
            winnerId={winnerId}
            overrides={overrides}
            onOverrideChange={handleOverrideChange}
          />

          <Button
            size="default"
            className="w-full"
            onClick={handleMerge}
            disabled={processing}
          >
            {processing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Merge Contacts
          </Button>
        </div>
      )}

      {action === 'delete' && group.contacts.length === 2 && (
        <div className="space-y-3">
          <Separator />
          <p className="text-xs text-muted-foreground uppercase font-medium tracking-wide">Select contact to delete</p>
          <ToggleGroup
            type="single"
            value={deleteId}
            onValueChange={(v) => { if (v) setDeleteId(v) }}
            className="w-full"
          >
            {group.contacts.map((c) => (
              <ToggleGroupItem
                key={c.id}
                value={c.id}
                className="flex-1 text-sm h-9 data-[state=on]:bg-destructive/15 data-[state=on]:text-destructive"
              >
                {c.name}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>

          <Button
            size="default"
            variant="destructive"
            className="w-full"
            onClick={handleDelete}
            disabled={processing}
          >
            {processing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
            Delete Contact
          </Button>
        </div>
      )}
    </div>
  )
}
