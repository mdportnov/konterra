'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { X, Plus } from 'lucide-react'
import type { Tag as DbTag } from '@/lib/db/schema'

export function TagSelector({
  value,
  onChange,
  availableTags,
  onTagCreated,
}: {
  value: string
  onChange: (v: string) => void
  availableTags: DbTag[]
  onTagCreated?: (tag: DbTag) => void
}) {
  const [newTagInput, setNewTagInput] = useState('')
  const [creating, setCreating] = useState(false)

  const selected = value ? value.split(',').map((s) => s.trim()).filter(Boolean) : []
  const selectedSet = new Set(selected)

  const toggle = (tagName: string) => {
    const next = new Set(selectedSet)
    if (next.has(tagName)) next.delete(tagName)
    else next.add(tagName)
    onChange(Array.from(next).join(', '))
  }

  const handleCreateTag = async () => {
    const name = newTagInput.trim()
    if (!name) return
    setCreating(true)
    try {
      const res = await fetch('/api/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      if (res.ok) {
        const tag = await res.json()
        onTagCreated?.(tag)
        const next = new Set(selectedSet)
        next.add(name)
        onChange(Array.from(next).join(', '))
        setNewTagInput('')
      }
    } catch {
      // silent
    } finally {
      setCreating(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleCreateTag()
    }
  }

  const unselectedTags = availableTags.filter((t) => !selectedSet.has(t.name))

  return (
    <div className="space-y-2">
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selected.map((tag) => (
            <Badge
              key={tag}
              className="cursor-pointer text-[10px] bg-orange-500/20 text-orange-600 dark:text-orange-300 border-orange-500/30 hover:bg-orange-500/30 gap-1"
              onClick={() => toggle(tag)}
            >
              {tag}
              <X className="h-2.5 w-2.5" />
            </Badge>
          ))}
        </div>
      )}
      {unselectedTags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {unselectedTags.map((tag) => (
            <Badge
              key={tag.id}
              variant="outline"
              className="cursor-pointer text-[10px] border-border text-muted-foreground/50 hover:bg-muted hover:text-muted-foreground"
              onClick={() => toggle(tag.name)}
            >
              {tag.name}
            </Badge>
          ))}
        </div>
      )}
      <div className="flex gap-1.5">
        <Input
          value={newTagInput}
          onChange={(e) => setNewTagInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="New tag..."
          className="bg-muted/50 border-input text-foreground placeholder:text-muted-foreground/40 h-7 text-xs focus-visible:ring-orange-500/30 focus-visible:border-orange-500/50 flex-1"
        />
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-7 px-2 text-[10px] text-muted-foreground hover:text-foreground"
          disabled={!newTagInput.trim() || creating}
          onClick={handleCreateTag}
        >
          <Plus className="h-3 w-3" />
        </Button>
      </div>
    </div>
  )
}
