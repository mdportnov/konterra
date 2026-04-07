'use client'

import { useSyncExternalStore } from 'react'

let cachedIsMac: boolean | null = null

function detectIsMac(): boolean {
  if (cachedIsMac !== null) return cachedIsMac
  if (typeof navigator === 'undefined') return true
  const p = (navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData?.platform || navigator.platform || ''
  cachedIsMac = /mac|iphone|ipad|ipod/i.test(p)
  return cachedIsMac
}

const subscribe = () => () => {}
export function useIsMac() {
  return useSyncExternalStore(subscribe, detectIsMac, () => true)
}

interface KbdProps {
  children: React.ReactNode
  meta?: boolean
  shift?: boolean
  className?: string
}

export function Kbd({ children, meta = false, shift = false, className = '' }: KbdProps) {
  const isMac = useIsMac()
  const metaSym = isMac ? '\u2318' : 'Ctrl'
  const shiftSym = isMac ? '\u21E7' : 'Shift'
  const sep = isMac ? '' : '+'
  return (
    <kbd
      className={`inline-flex items-center gap-0.5 rounded border border-border/60 bg-muted/60 px-1 py-px text-[10px] font-mono text-muted-foreground ${className}`}
    >
      {meta && <span>{metaSym}{sep}</span>}
      {shift && <span>{shiftSym}{sep}</span>}
      <span>{children}</span>
    </kbd>
  )
}
