import { useEffect } from 'react'

interface HotkeyOptions {
  meta?: boolean
  enabled?: boolean
}

export function useHotkey(
  key: string,
  handler: () => void,
  options: HotkeyOptions = {}
) {
  const { meta = false, enabled = true } = options

  useEffect(() => {
    if (!enabled) return

    const listener = (e: KeyboardEvent) => {
      if (meta && !(e.metaKey || e.ctrlKey)) return
      if (e.key.toLowerCase() === key.toLowerCase()) {
        e.preventDefault()
        handler()
      }
    }

    window.addEventListener('keydown', listener)
    return () => window.removeEventListener('keydown', listener)
  }, [key, handler, meta, enabled])
}
