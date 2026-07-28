'use client'

import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { BadgeCheck, MailWarning, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

const CARD = 'rounded-lg border border-border bg-muted/20 p-4'
const SECTION_LABEL = 'meta-label text-[10px]'

interface VerificationState {
  email: string
  verified: boolean
  deliveryConfigured: boolean
}

/**
 * Konterra sends no newsletters or digests — the only mail it ever sends is a link the
 * user asked for. This card exists solely so account recovery can be set up.
 */
export default function EmailPreferencesCard() {
  const [verification, setVerification] = useState<VerificationState | null>(null)
  const [sending, setSending] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    fetch('/api/me/verify-email', { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: VerificationState | null) => { if (data) setVerification(data) })
      .catch(() => {})
    return () => controller.abort()
  }, [])

  const handleResend = useCallback(async () => {
    setSending(true)
    try {
      const res = await fetch('/api/me/verify-email', { method: 'POST' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Failed to send')
      toast.success('Confirmation email sent')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to send confirmation email')
    } finally {
      setSending(false)
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
              onClick={handleResend}
              disabled={sending || !verification.deliveryConfigured}
            >
              {sending && <Loader2 className="h-3 w-3 animate-spin" />}
              {verification.deliveryConfigured ? 'Send confirmation link' : 'Email delivery not configured'}
            </Button>
          </div>
        )}

        <p className="text-[10px] text-muted-foreground/60">
          Konterra never sends newsletters or digests. The only email you will get is one you asked
          for: a password reset or this confirmation link.
        </p>
      </div>
    </div>
  )
}
