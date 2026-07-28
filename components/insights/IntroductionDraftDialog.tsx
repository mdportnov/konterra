'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Separator } from '@/components/ui/separator'
import { Sparkles, Copy, Check, Loader2, Send } from 'lucide-react'
import { toast } from 'sonner'
import { Z } from '@/lib/constants/ui'
import type { Contact } from '@/lib/db/schema'

type Tone = 'warm' | 'concise' | 'formal'

const TONES: { value: Tone; label: string }[] = [
  { value: 'warm', label: 'Warm' },
  { value: 'concise', label: 'Concise' },
  { value: 'formal', label: 'Formal' },
]

const OUTCOMES = [
  { value: 'introduced', label: 'Sent it' },
  { value: 'connected', label: 'They connected' },
  { value: 'failed', label: 'Went nowhere' },
] as const

interface IntroductionDraftDialogProps {
  open: boolean
  contactA: Contact | null
  contactB: Contact | null
  introductionId?: string | null
  onClose: () => void
  onStatusChange?: () => void
}

export default function IntroductionDraftDialog({
  open,
  contactA,
  contactB,
  introductionId,
  onClose,
  onStatusChange,
}: IntroductionDraftDialogProps) {
  const [reason, setReason] = useState('')
  const [tone, setTone] = useState<Tone>('warm')
  const [draft, setDraft] = useState('')
  const [generating, setGenerating] = useState(false)
  const [copied, setCopied] = useState(false)
  const [savingStatus, setSavingStatus] = useState<string | null>(null)

  useEffect(() => {
    if (!open) {
      setDraft('')
      setReason('')
      setCopied(false)
    }
  }, [open])

  const handleGenerate = useCallback(async () => {
    if (!contactA || !contactB) return
    setGenerating(true)
    try {
      const res = await fetch('/api/introductions/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactAId: contactA.id,
          contactBId: contactB.id,
          reason: reason.trim() || null,
          tone,
          introductionId: introductionId ?? undefined,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Failed to draft')
      setDraft(data.draft)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to draft the introduction')
    } finally {
      setGenerating(false)
    }
  }, [contactA, contactB, reason, tone, introductionId])

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(draft)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Could not copy to clipboard')
    }
  }, [draft])

  const handleOutcome = useCallback(async (status: string) => {
    if (!introductionId) {
      toast.error('Plan the introduction first to track its outcome')
      return
    }
    setSavingStatus(status)
    try {
      const res = await fetch('/api/introductions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: introductionId, status, date: new Date().toISOString() }),
      })
      if (!res.ok) throw new Error()
      toast.success('Introduction updated')
      onStatusChange?.()
    } catch {
      toast.error('Failed to update the introduction')
    } finally {
      setSavingStatus(null)
    }
  }, [introductionId, onStatusChange])

  if (!contactA || !contactB) return null

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="sm:max-w-lg max-h-[90dvh] overflow-y-auto" style={{ zIndex: Z.modal }}>
        <DialogHeader>
          <DialogTitle className="k-serif italic text-[1.4rem] font-normal">
            Introduce {contactA.name} to {contactB.name}
          </DialogTitle>
          <DialogDescription>
            Konterra drafts from what you already recorded about them. It will not invent details.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-1">
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Why should they meet? (optional, but makes the draft much better)"
            className="min-h-[64px] text-sm"
            maxLength={2000}
          />

          <div className="flex items-center gap-2">
            <ToggleGroup type="single" value={tone} onValueChange={(v) => v && setTone(v as Tone)} className="flex-1">
              {TONES.map((t) => (
                <ToggleGroupItem key={t.value} value={t.value} className="flex-1 text-xs">
                  {t.label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
            <Button size="sm" onClick={handleGenerate} disabled={generating}>
              {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              {draft ? 'Redraft' : 'Draft'}
            </Button>
          </div>

          {draft && (
            <>
              <Textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                className="min-h-[200px] text-sm leading-relaxed"
              />
              <Button variant="outline" size="sm" className="w-full" onClick={handleCopy}>
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? 'Copied' : 'Copy to clipboard'}
              </Button>

              <Separator />

              <div>
                <p className="meta-label text-[10px] mb-1.5">Then what happened?</p>
                <div className="flex gap-1.5">
                  {OUTCOMES.map((o) => (
                    <Button
                      key={o.value}
                      variant="outline"
                      size="sm"
                      className="flex-1 text-[11px]"
                      onClick={() => handleOutcome(o.value)}
                      disabled={savingStatus !== null}
                    >
                      {savingStatus === o.value ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : o.value === 'introduced' ? (
                        <Send className="h-3 w-3" />
                      ) : null}
                      {o.label}
                    </Button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
