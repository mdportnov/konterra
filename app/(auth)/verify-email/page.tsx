'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import AtlasBackground from '@/components/branding/AtlasBackground'
import Wordmark from '@/components/branding/Wordmark'

type State = 'pending' | 'confirmed' | 'failed'

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyEmailContent />
    </Suspense>
  )
}

function VerifyEmailContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  // A missing token is knowable during render, so it does not need an effect round trip.
  const [state, setState] = useState<State>(() => (token ? 'pending' : 'failed'))
  const [message, setMessage] = useState(() =>
    token ? '' : 'This link is missing its confirmation token.',
  )
  const requested = useRef(false)

  useEffect(() => {
    if (!token) return
    // React strict mode mounts effects twice in development; the token is single-use, so a
    // second call would always report failure.
    if (requested.current) return
    requested.current = true

    fetch('/api/public/verify-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}))
        if (res.ok) {
          setState('confirmed')
          setMessage(data.email ? `${data.email} is confirmed.` : 'Your email is confirmed.')
        } else {
          setState('failed')
          setMessage(data.error || 'This confirmation link is invalid or has expired.')
        }
      })
      .catch(() => {
        setState('failed')
        setMessage('Could not reach the server. Try the link again.')
      })
  }, [token])

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
        <p className="k-meta normal-case tracking-[0.14em] mb-8">email confirmation</p>

        {state === 'pending' && (
          <div className="flex flex-col items-center py-6">
            <div
              className="h-5 w-5 border-2 rounded-full animate-spin"
              style={{ borderColor: 'var(--hairline-strong)', borderTopColor: 'var(--terra)' }}
            />
            <p className="font-mono text-xs mt-4" style={{ color: 'var(--bone-45)' }}>
              Confirming...
            </p>
          </div>
        )}

        {state !== 'pending' && (
          <div className="space-y-5">
            <p className="text-sm" style={{ color: 'var(--bone-70)' }}>{message}</p>
            <Link href={state === 'confirmed' ? '/app' : '/login'} className="k-btn w-full inline-block text-center">
              {state === 'confirmed' ? 'Open Konterra' : 'Back to sign in'}
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
