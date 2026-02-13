import { useEffect } from 'react'

interface HotkeyOptions {
  meta?: boolean
  enabled?: boolean
  priority?: number
}

type HotkeyEntry = { handler: () => void; priority: number }
const escapeStack: HotkeyEntry[] = []

export function useHotkey(
  key: string,
  handler: () => void,
  options: HotkeyOptions = {}
) {
  const { meta = false, enabled = true, priority = 0 } = options

  useEffect(() => {
    if (!enabled) return

    const isEscape = key.toLowerCase() === 'escape' && !meta

    if (isEscape) {
      const entry: HotkeyEntry = { handler, priority }
      escapeStack.push(entry)
      return () => {
        const idx = escapeStack.indexOf(entry)
        if (idx >= 0) escapeStack.splice(idx, 1)
      }
    }

    const listener = (e: KeyboardEvent) => {
      if (meta && !(e.metaKey || e.ctrlKey)) return
      if (e.key.toLowerCase() === key.toLowerCase()) {
        e.preventDefault()
        handler()
      }
    }

    window.addEventListener('keydown', listener)
    return () => window.removeEventListener('keydown', listener)
  }, [key, handler, meta, enabled, priority])
}

function globalEscapeListener(e: KeyboardEvent) {
  if (e.key !== 'Escape' || escapeStack.length === 0) return
  e.preventDefault()
  const top = escapeStack.reduce((a, b) => (b.priority >= a.priority ? b : a))
  top.handler()
}

if (typeof window !== 'undefined') {
  window.addEventListener('keydown', globalEscapeListener)
}
