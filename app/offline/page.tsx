'use client'

import { WifiOff } from 'lucide-react'
import AtlasBackground from '@/components/branding/AtlasBackground'
import Wordmark from '@/components/branding/Wordmark'

export default function OfflinePage() {
  return (
    <div className="k-page relative flex min-h-dvh items-center justify-center px-6">
      <AtlasBackground />
      <div className="relative z-10 text-center max-w-sm">
        <div className="flex justify-center mb-8">
          <Wordmark />
        </div>
        <div
          className="mx-auto mb-6 flex size-14 items-center justify-center rounded-full border"
          style={{ borderColor: 'var(--hairline-strong)' }}
        >
          <WifiOff className="size-5" style={{ color: 'var(--bone-45)' }} />
        </div>
        <p className="k-meta mb-3">No signal</p>
        <h1 className="text-2xl font-medium tracking-tight">You&#39;re offline</h1>
        <p className="mt-3 text-sm leading-relaxed" style={{ color: 'var(--bone-70)' }}>
          Konterra needs an internet connection. Check your network and try again.
        </p>
        <button onClick={() => window.location.reload()} className="k-btn mt-8">
          Retry
        </button>
      </div>
    </div>
  )
}
