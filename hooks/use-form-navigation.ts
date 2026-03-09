import { useEffect, useRef } from 'react'

const FIELD_SELECTOR = [
  'input:not([type="hidden"]):not([type="range"]):not([type="checkbox"]):not([type="radio"]):not(:disabled)',
  'textarea:not(:disabled)',
  'select:not(:disabled)',
].join(', ')

function isFieldAccessible(el: HTMLElement): boolean {
  if (el.offsetParent === null) return false
  let parent = el.parentElement
  while (parent) {
    if (parent.clientHeight === 0) {
      const style = getComputedStyle(parent)
      if (style.overflow === 'hidden' || style.overflowY === 'hidden') return false
    }
    parent = parent.parentElement
  }
  return true
}

interface FormNavigationOptions {
  onSubmit?: () => void
  enabled?: boolean
}

export function useFormNavigation<T extends HTMLElement>(options: FormNavigationOptions = {}) {
  const containerRef = useRef<T>(null)
  const onSubmitRef = useRef(options.onSubmit)

  useEffect(() => {
    onSubmitRef.current = options.onSubmit
  })

  useEffect(() => {
    if (options.enabled === false) return
    const container = containerRef.current
    if (!container) return

    function getFields(): HTMLElement[] {
      return Array.from(container!.querySelectorAll<HTMLElement>(FIELD_SELECTOR))
        .filter(isFieldAccessible)
    }

    function focusNext(current: HTMLElement) {
      const fields = getFields()
      const idx = fields.indexOf(current)
      if (idx === -1) return
      if (idx < fields.length - 1) {
        fields[idx + 1].focus()
      } else {
        onSubmitRef.current?.()
      }
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 's' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        onSubmitRef.current?.()
        return
      }

      if (e.key !== 'Enter') return
      if (e.defaultPrevented) return

      const target = e.target as HTMLElement
      const tag = target.tagName

      if (tag === 'TEXTAREA') {
        if (e.shiftKey) return
        e.preventDefault()
        focusNext(target)
        return
      }

      if (tag === 'INPUT' || tag === 'SELECT') {
        if (e.shiftKey || e.metaKey || e.ctrlKey) return
        e.preventDefault()
        focusNext(target)
      }
    }

    container.addEventListener('keydown', handleKeyDown)
    return () => container.removeEventListener('keydown', handleKeyDown)
  }, [options.enabled])

  return containerRef
}
