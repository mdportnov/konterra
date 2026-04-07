'use client'

import { Suspense, useState, useRef, useEffect, useCallback } from 'react'
import { useFormNavigation } from '@/hooks/use-form-navigation'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import NetworkBackground from '@/components/auth/NetworkBackground'

type Mode = 'signin' | 'waitlist' | 'register'
type SignInStep = 'email' | 'password'

interface InviteInfo {
  status: 'valid' | 'used' | 'expired'
  inviterName: string | null
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  )
}

function LoginContent() {
  const [mode, setMode] = useState<Mode>('signin')
  const [animating, setAnimating] = useState(false)
  const [visible, setVisible] = useState(true)
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [name, setName] = useState('')
  const [message, setMessage] = useState('')
  const [signInStep, setSignInStep] = useState<SignInStep>('email')
  const [passwordVisible, setPasswordVisible] = useState(false)
  const [inviteInfo, setInviteInfo] = useState<InviteInfo | null>(null)
  const animRef = useRef<HTMLDivElement>(null)
  const formNavRef = useFormNavigation<HTMLDivElement>({
    onSubmit: () => {
      formNavRef.current?.querySelector<HTMLFormElement>('form')?.requestSubmit()
    },
  })
  const passwordRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const searchParams = useSearchParams()

  const inviteCode = searchParams.get('invite')
  const [inviteLoading, setInviteLoading] = useState(!!inviteCode)

  useEffect(() => {
    if (!inviteCode) return
    const controller = new AbortController()
    fetch(`/api/public/invite/${encodeURIComponent(inviteCode)}`, { signal: controller.signal })
      .then((r) => {
        if (!r.ok) throw new Error()
        return r.json()
      })
      .then((data: InviteInfo) => {
        if (data.status === 'valid') {
          setInviteInfo(data)
          setMode('register')
          setVisible(true)
        } else if (data.status === 'used') {
          toast.error('This invite has already been used')
        } else if (data.status === 'expired') {
          toast.error('This invite has expired')
        }
      })
      .catch((err) => {
        if (err instanceof DOMException && err.name === 'AbortError') return
        toast.error('Invalid invite link')
      })
      .finally(() => setInviteLoading(false))
    return () => controller.abort()
  }, [inviteCode])

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
    const el = animRef.current
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

  const handleRegister = async (e: React.FormEvent) => {
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
      const normalizedEmail = email.toLowerCase().trim()
      const trimmedName = name.trim()
      const res = await fetch('/api/public/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalizedEmail, name: trimmedName, password, inviteCode }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Registration failed')
        setLoading(false)
        return
      }
      const result = await signIn('credentials', { email: normalizedEmail, password, redirect: false })
      if (result?.ok) {
        router.push('/app')
        router.refresh()
      } else {
        toast.error('Registration succeeded but auto-login failed. Please sign in.')
        setMode('signin')
        setInviteInfo(null)
      }
    } catch {
      toast.error('Registration failed. Try again.')
    }
    setLoading(false)
  }

  const showTabs = mode !== 'register'

  return (
    <div className="min-h-dvh flex items-center justify-center relative">
      <NetworkBackground />

      <div className="login-card relative z-10 w-full max-w-md mx-4 p-6 sm:p-8 rounded-xl">
        <div className="text-center mb-8">
          <img src="/icon.svg" alt="" width={48} height={48} className="mx-auto mb-3" />
          <h1 className="font-mono tracking-[0.3em] uppercase text-sm text-white/90">
            Konterra
          </h1>
          <p className="font-mono text-xs text-white/40 mt-1">
            private intelligence network
          </p>
        </div>

        {inviteLoading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="h-5 w-5 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
            <p className="font-mono text-xs text-white/40 mt-4">Validating invite...</p>
          </div>
        ) : (
        <>
        {showTabs && (
          <div className="flex gap-0 mb-8 border-b border-white/10">
            <button
              type="button"
              onClick={() => switchMode('signin')}
              className={`flex-1 pb-3 font-mono text-xs uppercase tracking-wider transition-colors ${
                mode === 'signin' ? 'text-white border-b border-[oklch(0.6_0.2_250)]' : 'text-white/40 hover:text-white/60'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => switchMode('waitlist')}
              className={`flex-1 pb-3 font-mono text-xs uppercase tracking-wider transition-colors ${
                mode === 'waitlist' ? 'text-white border-b border-[oklch(0.6_0.2_250)]' : 'text-white/40 hover:text-white/60'
              }`}
            >
              Request Access
            </button>
          </div>
        )}

        {mode === 'register' && inviteInfo && (
          <div className="text-center mb-6">
            <p className="font-mono text-xs text-white/60">
              Invited by <span className="text-white/90 font-medium">{inviteInfo.inviterName || 'a member'}</span>
            </p>
          </div>
        )}

        <div
          ref={animRef}
          className="transition-[opacity,transform,max-height] duration-200 ease-out overflow-hidden"
        >
          <div
            ref={formNavRef}
            className={`transition-[opacity,transform] duration-200 ease-out ${
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
                  autoComplete="email"
                  inputMode="email"
                  className="login-input"
                />
                <div
                  className={`transition-[opacity,transform,max-height] duration-200 ease-out overflow-hidden ${
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
                    autoComplete="current-password"
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
                  autoComplete="email"
                  inputMode="email"
                  className="login-input"
                />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Full name"
                  required
                  minLength={2}
                  autoComplete="name"
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

            {mode === 'register' && (
              <form onSubmit={handleRegister} className="space-y-3 sm:space-y-4">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email address"
                  required
                  autoComplete="email"
                  inputMode="email"
                  className="login-input"
                />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Full name"
                  required
                  minLength={2}
                  autoComplete="name"
                  className="login-input"
                />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password (min 8 characters)"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  className="login-input"
                />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  className="login-input"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="login-button"
                >
                  {loading ? 'Creating account...' : 'Create Account'}
                </button>
                <p className="text-center font-mono text-xs text-white/40 mt-2">
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setMode('signin')
                      setInviteInfo(null)
                      setSignInStep('email')
                      setPasswordVisible(false)
                      setPassword('')
                      setConfirmPassword('')
                    }}
                    className="text-white/60 hover:text-white/80 underline underline-offset-2 transition-colors"
                  >
                    Sign in
                  </button>
                </p>
              </form>
            )}
          </div>
        </div>
        </>
        )}

        <p className="text-center font-mono text-[10px] text-white/25 mt-8">
          Access is by invitation only. All requests are manually reviewed.
        </p>
      </div>
    </div>
  )
}
