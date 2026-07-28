'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import AtlasBackground from '@/components/branding/AtlasBackground'
import Wordmark from '@/components/branding/Wordmark'

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordContent />
    </Suspense>
  )
}

function ResetPasswordContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get('token')

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }
    if (password.length < 8) {
      toast.error('Password must be at least 8 characters')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/public/password-reset/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data.error || 'Could not reset the password')
      } else {
        setDone(true)
        setTimeout(() => router.push('/login'), 2500)
      }
    } catch {
      toast.error('Could not reset the password. Try again.')
    }
    setLoading(false)
  }

  return (
    <div className="k-page min-h-dvh flex items-center justify-center relative">
      <AtlasBackground />

      <div
        className="k-card k-corners relative z-10 w-full max-w-md mx-4 p-6 sm:p-10 rounded-2xl"
        style={{ background: 'oklch(0.13 0.009 80 / 85%)', backdropFilter: 'blur(16px)' }}
      >
        <div className="text-center mb-9">
          <div className="flex justify-center mb-3">
            <Link href="/" aria-label="Konterra">
              <Wordmark />
            </Link>
          </div>
          <p className="k-meta normal-case tracking-[0.14em]">choose a new password</p>
        </div>

        {!token ? (
          <div className="space-y-4 text-center">
            <p className="text-sm" style={{ color: 'var(--bone-70)' }}>
              This link is missing its reset token. Request a new one from the sign-in page.
            </p>
            <Link href="/login" className="k-btn w-full inline-block text-center">
              Back to sign in
            </Link>
          </div>
        ) : done ? (
          <div className="space-y-4 text-center">
            <p className="text-sm" style={{ color: 'var(--bone-70)' }}>
              Your password has been updated. Redirecting you to sign in…
            </p>
            <Link href="/login" className="k-btn w-full inline-block text-center">
              Sign in now
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="New password (min 8 characters)"
              required
              minLength={8}
              autoComplete="new-password"
              className="k-input"
            />
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              required
              minLength={8}
              autoComplete="new-password"
              className="k-input"
            />
            <button type="submit" disabled={loading} className="k-btn w-full">
              {loading ? 'Updating...' : 'Update password'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
