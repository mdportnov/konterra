'use client'

import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Skeleton } from '@/components/ui/skeleton'
import { BadgeCheck, MailWarning, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

type Frequency = 'off' | 'weekly' | 'monthly'

const FREQUENCIES: { value: Frequency; label: string }[] = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'off', label: 'Off' },
]

const CARD = 'rounded-lg border border-border bg-muted/20 p-4'
const SECTION_LABEL = 'meta-label text-[10px]'

interface VerificationState {
  email: string
  verified: boolean
  deliveryConfigured: boolean
}

export default function EmailPreferencesCard() {
  const [frequency, setFrequency] = useState<Frequency | null>(null)
  const [saving, setSaving] = useState(false)
  const [verification, setVerification] = useState<VerificationState | null>(null)
  const [sendingVerification, setSendingVerification] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    Promise.all([
      fetch('/api/me/digest', { signal: controller.signal }).then((r) => (r.ok ? r.json() : null)),
      fetch('/api/me/verify-email', { signal: controller.signal }).then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([digest, verify]) => {
        if (digest) setFrequency(digest.frequency)
        if (verify) setVerification(verify)
      })
      .catch(() => {})
    return () => controller.abort()
  }, [])

  const handleChange = useCallback(async (value: string) => {
    if (!value) return
    const next = value as Frequency
    const previous = frequency
    setFrequency(next)
    setSaving(true)
    try {
      const res = await fetch('/api/me/digest', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ frequency: next }),
      })
      if (!res.ok) throw new Error()
      toast.success(next === 'off' ? 'Digest turned off' : `Digest set to ${next}`)
    } catch {
      setFrequency(previous)
      toast.error('Failed to update digest preference')
    } finally {
      setSaving(false)
    }
  }, [frequency])

  const handleResendVerification = useCallback(async () => {
    setSendingVerification(true)
    try {
      const res = await fetch('/api/me/verify-email', { method: 'POST' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Failed to send')
      toast.success('Confirmation email sent')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to send confirmation email')
    } finally {
      setSendingVerification(false)
    }
  }, [])

  return (
    <div className={CARD}>
      <div className="space-y-3">
        <span className={SECTION_LABEL}>Email</span>

        {verification === null ? (
          <Skeleton className="h-5 w-40" />
        ) : verification.verified ? (
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <BadgeCheck className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
            <span className="truncate">{verification.email} confirmed</span>
          </p>
        ) : (
          <div className="rounded-md border border-amber-500/25 bg-amber-500/5 p-2.5 space-y-2">
            <p className="flex items-start gap-2 text-[11px] text-muted-foreground">
              <MailWarning className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
              <span>
                {verification.email} is not confirmed. Confirm it so you can recover your account if you
                lose your password.
              </span>
            </p>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-[11px]"
              onClick={handleResendVerification}
              disabled={sendingVerification || !verification.deliveryConfigured}
            >
              {sendingVerification && <Loader2 className="h-3 w-3 animate-spin" />}
              {verification.deliveryConfigured ? 'Send confirmation link' : 'Email delivery not configured'}
            </Button>
          </div>
        )}

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Digest</span>
            {saving && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
          </div>
          {frequency === null ? (
            <Skeleton className="h-8 w-full" />
          ) : (
            <ToggleGroup
              type="single"
              value={frequency}
              onValueChange={handleChange}
              className="w-full"
            >
              {FREQUENCIES.map((f) => (
                <ToggleGroupItem key={f.value} value={f.value} className="flex-1 text-xs">
                  {f.label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          )}
          <p className="text-[10px] text-muted-foreground/60">
            Birthdays, follow-ups going past due, relationships going quiet, unsettled favors, and who
            you can catch on upcoming trips. Sent only when there is something to say.
          </p>
        </div>
      </div>
    </div>
  )
}
