import { useEffect, useRef } from 'react'
import type { RefObject } from 'react'

export function useClickOutside(
  ref: RefObject<HTMLElement | null>,
  handler: () => void,
  enabled = true
) {
  const startedInside = useRef(false)
  const startPos = useRef<{ x: number; y: number } | null>(null)
  const ready = useRef(false)

  useEffect(() => {
    ready.current = false
    if (!enabled) return

    const timer = requestAnimationFrame(() => { ready.current = true })

    const onDown = (e: PointerEvent) => {
      startPos.current = { x: e.clientX, y: e.clientY }
      startedInside.current = !!ref.current?.contains(e.target as Node)
    }

    const onUp = (e: PointerEvent) => {
      if (!ready.current || !startPos.current) return
      const dx = e.clientX - startPos.current.x
      const dy = e.clientY - startPos.current.y
      const wasDrag = Math.sqrt(dx * dx + dy * dy) > 5
      const wasInside = startedInside.current
      startPos.current = null
      startedInside.current = false
      if (wasDrag) return
      if (wasInside) return
      if (ref.current?.contains(e.target as Node)) return
      const target = e.target as HTMLElement
      if (target.closest?.('[data-globe-panel]')) return
      if (target.closest?.('[data-globe-popup]')) return
      if (target.closest?.('[role="dialog"], [data-slot="dialog-overlay"]')) return
      if (target.closest?.('[data-cmdk-dialog]')) return
      if (target.closest?.('[data-radix-popper-content-wrapper]')) return
      if (target.closest?.('[data-radix-select-content]')) return
      if (target.closest?.('[role="listbox"]')) return
      if (target.closest?.('[data-slot="select-content"]')) return
      if (target.closest?.('[data-slot="dropdown-menu-content"]')) return
      if (target.closest?.('[data-slot="popover-content"]')) return
      if (target.closest?.('[data-slot="sheet-content"]')) return
      if (target.hasAttribute?.('data-radix-focus-guard')) return
      handler()
    }

    document.addEventListener('pointerdown', onDown)
    document.addEventListener('pointerup', onUp)
    return () => {
      cancelAnimationFrame(timer)
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('pointerup', onUp)
    }
  }, [ref, handler, enabled])
}
