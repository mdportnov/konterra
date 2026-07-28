'use client'

import { useCallback, useState, useSyncExternalStore } from 'react'
import { Share2, Check, Link2 } from 'lucide-react'
import { ANALYTICS_EVENTS, track } from '@/lib/analytics'

interface ShareAtlasButtonProps {
  username: string
  name: string | null
  countriesCount: number
}

const neverChanges = () => () => {}
const hasNativeShare = () => typeof navigator !== 'undefined' && typeof navigator.share === 'function'
const noNativeShareOnServer = () => false

export default function ShareAtlasButton({ username, name, countriesCount }: ShareAtlasButtonProps) {
  const [copied, setCopied] = useState(false)
  // Server-rendered as false and corrected during hydration, without an extra render pass.
  const canUseNativeShare = useSyncExternalStore(neverChanges, hasNativeShare, noNativeShareOnServer)

  const handleShare = useCallback(async () => {
    const url = typeof window !== 'undefined' ? window.location.href : `https://konterra.space/u/${username}`
    const title = `${name || `@${username}`} — ${countriesCount} countries`
    const text = `${title} on Konterra`

    // The native sheet is the whole point on mobile; clipboard is the desktop fallback.
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title, text, url })
        track(ANALYTICS_EVENTS.atlasShared, { method: 'native' })
        return
      } catch {
        // Dismissing the sheet rejects; fall through to copying rather than erroring.
      }
    }

    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      track(ANALYTICS_EVENTS.atlasShared, { method: 'clipboard' })
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // No clipboard permission: the URL is already in the address bar, so stay silent.
    }
  }, [username, name, countriesCount])

  return (
    <button
      onClick={handleShare}
      aria-label="Share this atlas"
      className="flex w-full items-center justify-center gap-1.5 rounded-full border border-border py-2 text-xs text-muted-foreground transition-colors hover:text-foreground"
    >
      {copied ? <Check className="size-3.5" /> : canUseNativeShare ? <Share2 className="size-3.5" /> : <Link2 className="size-3.5" />}
      {copied ? 'Link copied' : 'Share this atlas'}
    </button>
  )
}
