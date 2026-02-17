'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import NetworkBackground from '@/components/auth/NetworkBackground'

type Mode = 'signin' | 'waitlist'
type SignInStep = 'email' | 'password'

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>('signin')
  const [animating, setAnimating] = useState(false)
  const [visible, setVisible] = useState(true)
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [message, setMessage] = useState('')
  const [signInStep, setSignInStep] = useState<SignInStep>('email')
  const [passwordVisible, setPasswordVisible] = useState(false)
  const formRef = useRef<HTMLDivElement>(null)
  const passwordRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  const switchMode = useCallback((next: Mode) => {
    if (next === mode || animating) return
    setAnimating(true)
    setVisible(false)
    setTimeout(() => {
      setMode(next)
      if (next === 'signin') {
        setSubmitted(false)
        setSignInStep('email')
        setPasswordVisible(false)
        setPassword('')
      }
      setVisible(true)
      setAnimating(false)
    }, 200)
  }, [mode, animating])

  useEffect(() => {
    const el = formRef.current
    if (!el) return
    el.style.height = 'auto'
    const h = el.scrollHeight
    el.style.height = h + 'px'
    const id = setTimeout(() => {
      el.style.height = 'auto'
      el.style.height = el.scrollHeight + 'px'
    }, 220)
    return () => clearTimeout(id)
  }, [mode, submitted, signInStep, passwordVisible])

  useEffect(() => {
    if (passwordVisible && passwordRef.current) {
      passwordRef.current.focus()
    }
  }, [passwordVisible])

  const handleContinue = (e: React.FormEvent) => {
    e.preventDefault()
    setSignInStep('password')
    requestAnimationFrame(() => {
      setPasswordVisible(true)
    })
  }

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const result = await signIn('credentials', { email, password, redirect: false })
    if (result?.ok) {
      router.push('/app')
      router.refresh()
    } else {
      toast.error('Access denied. Authorized operators only.')
    }
    setLoading(false)
  }

  const handleWaitlist = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name, message: message || undefined }),
      })
      if (!res.ok) {
        const data = await res.json()
        toast.error(data.error || 'Failed to submit request')
        setLoading(false)
        return
      }
      setSubmitted(true)
    } catch {
      toast.error('Failed to submit request. Try again.')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-dvh flex items-center justify-center relative">
      <NetworkBackground />

      <div className="login-card relative z-10 w-full max-w-md mx-4 p-8 rounded-xl">
        <div className="text-center mb-8">
          <h1 className="font-mono tracking-[0.3em] uppercase text-sm text-white/90">
            Konterra
          </h1>
          <p className="font-mono text-xs text-white/40 mt-1">
            private intelligence network
          </p>
        </div>

        <div className="flex gap-0 mb-8 border-b border-white/10">
          <button
            type="button"
            onClick={() => switchMode('signin')}
            className={`flex-1 pb-3 font-mono text-xs uppercase tracking-wider transition-colors ${
              mode === 'signin' ? 'text-white border-b border-[oklch(0.55_0.08_180)]' : 'text-white/40 hover:text-white/60'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => switchMode('waitlist')}
            className={`flex-1 pb-3 font-mono text-xs uppercase tracking-wider transition-colors ${
              mode === 'waitlist' ? 'text-white border-b border-[oklch(0.55_0.08_180)]' : 'text-white/40 hover:text-white/60'
            }`}
          >
            Request Access
          </button>
        </div>

        <div
          ref={formRef}
          className="transition-all duration-200 ease-out overflow-hidden"
        >
          <div
            className={`transition-all duration-200 ease-out ${
              visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
            }`}
          >
            {mode === 'signin' && (
              <form
                onSubmit={signInStep === 'email' ? handleContinue : handleSignIn}
                className="space-y-4"
              >
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email address"
                  required
                  className="login-input"
                />
                <div
                  className={`transition-all duration-200 ease-out overflow-hidden ${
                    passwordVisible
                      ? 'opacity-100 translate-y-0 max-h-20'
                      : 'opacity-0 translate-y-2 max-h-0'
                  }`}
                >
                  <input
                    ref={passwordRef}
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password"
                    required={signInStep === 'password'}
                    className="login-input w-full"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="login-button"
                >
                  {signInStep === 'email'
                    ? 'Continue'
                    : loading
                      ? 'Authenticating...'
                      : 'Authenticate'}
                </button>
              </form>
            )}

            {mode === 'waitlist' && !submitted && (
              <form onSubmit={handleWaitlist} className="space-y-4">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email address"
                  required
                  className="login-input"
                />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Full name"
                  required
                  minLength={2}
                  className="login-input"
                />
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Why do you want access? (optional)"
                  maxLength={500}
                  rows={3}
                  className="login-input resize-none"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="login-button"
                >
                  {loading ? 'Submitting...' : 'Submit Request'}
                </button>
              </form>
            )}

            {mode === 'waitlist' && submitted && (
              <div className="text-center py-6">
                <p className="font-mono text-sm text-white/70">
                  Request logged. You will be contacted if approved.
                </p>
              </div>
            )}
          </div>
        </div>

        <p className="text-center font-mono text-[10px] text-white/25 mt-8">
          Access is by invitation only. All requests are manually reviewed.
        </p>
      </div>
    </div>
  )
}
