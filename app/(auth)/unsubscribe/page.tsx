'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import AtlasBackground from '@/components/branding/AtlasBackground'
import Wordmark from '@/components/branding/Wordmark'

type State = 'idle' | 'working' | 'done' | 'failed'

export default function UnsubscribePage() {
  return (
    <Suspense>
      <UnsubscribeContent />
    </Suspense>
  )
}

function UnsubscribeContent() {
  const token = useSearchParams().get('token')
  const [state, setState] = useState<State>('idle')
  const [message, setMessage] = useState('')

  const confirm = async () => {
    setState('working')
    try {
      const res = await fetch('/api/public/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        setState('done')
      } else {
        setState('failed')
        setMessage(data.error || 'This unsubscribe link is not valid.')
      }
    } catch {
      setState('failed')
      setMessage('Could not reach the server. Try again.')
    }
  }

  return (
    <div className="k-page min-h-dvh flex items-center justify-center relative">
      <AtlasBackground />

      <div
        className="k-card k-corners relative z-10 w-full max-w-md mx-4 p-6 sm:p-10 rounded-2xl text-center"
        style={{ background: 'oklch(0.13 0.009 80 / 85%)', backdropFilter: 'blur(16px)' }}
      >
        <div className="flex justify-center mb-3">
          <Link href="/" aria-label="Konterra">
            <Wordmark />
          </Link>
        </div>
        <p className="k-meta normal-case tracking-[0.14em] mb-8">email preferences</p>

        {!token ? (
          <p className="text-sm" style={{ color: 'var(--bone-70)' }}>
            This link is missing its token. You can change digest settings inside the app.
          </p>
        ) : state === 'done' ? (
          <div className="space-y-5">
            <p className="text-sm" style={{ color: 'var(--bone-70)' }}>
              Done — no more digests. You can turn them back on any time in Settings.
            </p>
            <Link href="/app" className="k-btn w-full inline-block text-center">Open Konterra</Link>
          </div>
        ) : state === 'failed' ? (
          <div className="space-y-5">
            <p className="text-sm" style={{ color: 'var(--bone-70)' }}>{message}</p>
            <Link href="/app" className="k-btn w-full inline-block text-center">Open Konterra</Link>
          </div>
        ) : (
          <div className="space-y-5">
            <p className="text-sm" style={{ color: 'var(--bone-70)' }}>
              Stop receiving the Konterra digest? Everything else about your account stays untouched.
            </p>
            <button onClick={confirm} disabled={state === 'working'} className="k-btn w-full">
              {state === 'working' ? 'Unsubscribing...' : 'Unsubscribe'}
            </button>
            <Link
              href="/app"
              className="block font-mono text-[11px] transition-colors hover:text-[var(--bone-70)]"
              style={{ color: 'var(--bone-45)' }}
            >
              Keep them coming
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
