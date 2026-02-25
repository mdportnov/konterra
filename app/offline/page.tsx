'use client'

import { WifiOff } from 'lucide-react'

export default function OfflinePage() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-6">
      <div className="text-center space-y-4 max-w-sm">
        <WifiOff className="mx-auto size-12 text-muted-foreground" />
        <h1 className="text-2xl font-semibold text-foreground">You&#39;re offline</h1>
        <p className="text-muted-foreground text-sm">
          Konterra needs an internet connection. Check your network and try again.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Retry
        </button>
      </div>
    </div>
  )
}
