'use client'

import { useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useClickOutside } from '@/hooks/use-click-outside'
import { useHotkey } from '@/hooks/use-hotkey'
import { LOCALES, LOCALE_CONFIG, getLocalePath, type Locale } from '@/lib/i18n/locales'

interface LocaleSwitcherProps {
  current: Locale
}

export default function LocaleSwitcher({ current }: LocaleSwitcherProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const router = useRouter()

  const close = useCallback(() => setOpen(false), [])
  useClickOutside(ref, close, open)
  useHotkey('Escape', close, { enabled: open })

  const handleSelect = (locale: Locale) => {
    setOpen(false)
    router.push(getLocalePath(locale))
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-2 py-1.5 rounded-full transition-colors hover:text-[var(--bone)]"
        style={{ color: 'var(--bone-45)' }}
        aria-label="Change language"
      >
        <span className="font-mono text-[11px] tracking-[0.14em] uppercase leading-none">{current}</span>
        <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" className="size-3 opacity-60">
          <path d="M3 5l3 3 3-3" />
        </svg>
      </button>
      {open && (
        <div
          className="absolute right-0 top-full mt-2 min-w-[150px] rounded-xl border backdrop-blur-xl shadow-xl overflow-hidden z-50"
          style={{ borderColor: 'var(--hairline-strong)', background: 'oklch(0.145 0.009 80 / 92%)' }}
        >
          {LOCALES.map((locale) => {
            const c = LOCALE_CONFIG[locale]
            const isActive = locale === current
            return (
              <button
                key={locale}
                onClick={() => handleSelect(locale)}
                className="w-full flex items-center justify-between gap-2.5 px-3.5 py-2.5 text-left text-xs transition-colors hover:bg-[oklch(0.93_0.012_85/5%)]"
                style={{ color: isActive ? 'var(--bone)' : 'var(--bone-45)' }}
              >
                <span className="font-mono tracking-wide">{c.label}</span>
                {isActive && <span className="size-1 rounded-full" style={{ background: 'var(--terra)' }} />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
