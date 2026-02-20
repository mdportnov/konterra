import { useEffect, useRef } from 'react'

interface HotkeyOptions {
  meta?: boolean
  enabled?: boolean
  priority?: number
}

type HotkeyEntry = { handler: () => void; priority: number }
const escapeStack: HotkeyEntry[] = []

let globalListenerAttached = false

function globalEscapeListener(e: KeyboardEvent) {
  if (e.key !== 'Escape' || escapeStack.length === 0) return
  const top = escapeStack.reduce((a, b) => (b.priority >= a.priority ? b : a))
  e.preventDefault()
  e.stopPropagation()
  top.handler()
}

function ensureGlobalListener() {
  if (globalListenerAttached) return
  if (typeof window === 'undefined') return
  globalListenerAttached = true
  window.addEventListener('keydown', globalEscapeListener, true)
}

function isInsideInput(e: KeyboardEvent): boolean {
  const el = e.target as HTMLElement | null
  if (!el) return false
  const tag = el.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true
  if (el.isContentEditable) return true
  return false
}

export function useHotkey(
  key: string,
  handler: () => void,
  options: HotkeyOptions = {}
) {
  const { meta = false, enabled = true, priority = 0 } = options
  const handlerRef = useRef(handler)

  useEffect(() => {
    handlerRef.current = handler
  })

  useEffect(() => {
    if (!enabled) return

    const isEscape = key.toLowerCase() === 'escape' && !meta

    if (isEscape) {
      ensureGlobalListener()
      const entry: HotkeyEntry = { handler: () => handlerRef.current(), priority }
      escapeStack.push(entry)
      return () => {
        const idx = escapeStack.indexOf(entry)
        if (idx >= 0) escapeStack.splice(idx, 1)
      }
    }

    const listener = (e: KeyboardEvent) => {
      if (meta && !(e.metaKey || e.ctrlKey)) return
      if (e.key.toLowerCase() !== key.toLowerCase()) return
      if (!meta && isInsideInput(e)) return
      e.preventDefault()
      handlerRef.current()
    }

    window.addEventListener('keydown', listener)
    return () => window.removeEventListener('keydown', listener)
  }, [key, meta, enabled, priority])
}
