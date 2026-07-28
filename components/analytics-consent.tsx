'use client'

import { createContext, useCallback, useContext, useMemo, useSyncExternalStore } from 'react'
import Link from 'next/link'
import { Z } from '@/lib/constants/ui'

export type ConsentState = 'unknown' | 'granted' | 'denied'

const STORAGE_KEY = 'konterra-analytics-consent'

/**
 * A tiny external store rather than component state: the value lives in localStorage,
 * must survive across tabs, and must render identically on the server (always 'unknown',
 * so analytics never loads before an answer exists).
 */
const listeners = new Set<() => void>()
let cached: ConsentState | null = null

function readStorage(): ConsentState {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored === 'granted' || stored === 'denied' ? stored : 'unknown'
  } catch {
    return 'unknown'
  }
}

function getSnapshot(): ConsentState {
  // useSyncExternalStore requires a referentially stable snapshot between notifications.
  if (cached === null) cached = readStorage()
  return cached
}

function getServerSnapshot(): ConsentState {
  return 'unknown'
}

function subscribe(onChange: () => void) {
  listeners.add(onChange)
  const onStorage = (e: StorageEvent) => {
    if (e.key !== null && e.key !== STORAGE_KEY) return
    cached = null
    for (const listener of listeners) listener()
  }
  window.addEventListener('storage', onStorage)
  return () => {
    listeners.delete(onChange)
    window.removeEventListener('storage', onStorage)
  }
}

function writeConsent(value: 'granted' | 'denied') {
  try {
    localStorage.setItem(STORAGE_KEY, value)
  } catch {
    // A refused write only means we will ask again next visit.
  }
  cached = value
  // `storage` does not fire in the tab that wrote it, so notify locally.
  for (const listener of listeners) listener()
}

const ConsentContext = createContext<{
  consent: ConsentState
  setConsent: (value: 'granted' | 'denied') => void
}>({ consent: 'unknown', setConsent: () => {} })

export function useAnalyticsConsent() {
  return useContext(ConsentContext)
}

export function AnalyticsConsentProvider({ children }: { children: React.ReactNode }) {
  const consent = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  const setConsent = useCallback((value: 'granted' | 'denied') => writeConsent(value), [])
  const value = useMemo(() => ({ consent, setConsent }), [consent, setConsent])

  return (
    <ConsentContext.Provider value={value}>
      {children}
      {consent === 'unknown' && <ConsentBanner onChoose={setConsent} />}
    </ConsentContext.Provider>
  )
}

function ConsentBanner({ onChoose }: { onChoose: (value: 'granted' | 'denied') => void }) {
  return (
    <div
      role="dialog"
      aria-label="Analytics consent"
      className="fixed left-3 right-3 sm:left-auto sm:right-4 sm:max-w-sm rounded-xl border border-border bg-card/95 backdrop-blur-xl p-4 shadow-lg"
      style={{
        zIndex: Z.consent,
        // Clears the globe's bottom control cluster on small screens instead of sitting on
        // top of the only navigation the user has.
        bottom: 'calc(max(1.25rem, env(safe-area-inset-bottom, 0px)) + 62px)',
      }}
    >
      <p className="text-xs leading-relaxed text-muted-foreground">
        We would like to measure which parts of Konterra get used, so we know what to improve.
        Nothing from your contacts or notes is ever sent.{' '}
        <Link href="/privacy" className="underline underline-offset-2 hover:text-foreground">
          Privacy policy
        </Link>
        .
      </p>
      <div className="mt-3 flex gap-2">
        <button
          onClick={() => onChoose('granted')}
          className="flex-1 rounded-full px-3 py-1.5 text-xs font-medium transition-opacity hover:opacity-90"
          style={{ background: 'var(--terra)', color: 'var(--terra-ink)' }}
        >
          Allow
        </button>
        <button
          onClick={() => onChoose('denied')}
          className="flex-1 rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          No thanks
        </button>
      </div>
    </div>
  )
}
