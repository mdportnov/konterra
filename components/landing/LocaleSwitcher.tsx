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
  const config = LOCALE_CONFIG[current]

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
        className="flex items-center gap-1.5 px-2 py-1.5 rounded-md text-white/50 hover:text-white/80 transition-colors"
        aria-label="Change language"
      >
        <span className="text-sm leading-none">{config.flag}</span>
        <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" className="size-3 opacity-50">
          <path d="M3 5l3 3 3-3" />
        </svg>
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 min-w-[140px] rounded-lg border border-white/10 bg-[oklch(0.1_0.01_260/90%)] backdrop-blur-xl shadow-xl overflow-hidden z-50">
          {LOCALES.map((locale) => {
            const c = LOCALE_CONFIG[locale]
            const isActive = locale === current
            return (
              <button
                key={locale}
                onClick={() => handleSelect(locale)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-left text-xs transition-colors ${
                  isActive
                    ? 'text-white bg-white/10'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                <span className="text-sm leading-none">{c.flag}</span>
                <span className="font-mono">{c.label}</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
