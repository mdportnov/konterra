import { useRef, useCallback, useState } from 'react'

interface SwipeConfig {
  threshold?: number
  velocityThreshold?: number
  direction?: 'left' | 'right' | 'horizontal'
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
  onSwipeEnd?: (offset: number) => void
  lockAxis?: boolean
  ignoreSelector?: string
}

interface SwipeState {
  offset: number
  isSwiping: boolean
}

interface TouchHandlers {
  onTouchStart: (e: React.TouchEvent) => void
  onTouchMove: (e: React.TouchEvent) => void
  onTouchEnd: () => void
}

export function useSwipe(config: SwipeConfig = {}): SwipeState & TouchHandlers {
  const {
    threshold = 80,
    velocityThreshold = 0.5,
    direction = 'left',
    onSwipeLeft,
    onSwipeRight,
    onSwipeEnd,
    lockAxis = true,
    ignoreSelector,
  } = config

  const [offset, setOffset] = useState(0)
  const [isSwiping, setIsSwiping] = useState(false)

  const startX = useRef(0)
  const startY = useRef(0)
  const startTime = useRef(0)
  const currentX = useRef(0)
  const locked = useRef<'horizontal' | 'vertical' | null>(null)
  const active = useRef(false)

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (ignoreSelector) {
      const target = e.target as HTMLElement
      if (target.closest(ignoreSelector)) {
        active.current = false
        return
      }
    }
    const touch = e.touches[0]
    startX.current = touch.clientX
    startY.current = touch.clientY
    startTime.current = Date.now()
    currentX.current = touch.clientX
    locked.current = null
    active.current = true
  }, [ignoreSelector])

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!active.current) return

    const touch = e.touches[0]
    const dx = touch.clientX - startX.current
    const dy = touch.clientY - startY.current

    if (locked.current === null && lockAxis) {
      if (Math.abs(dx) > 8 || Math.abs(dy) > 8) {
        locked.current = Math.abs(dx) > Math.abs(dy) ? 'horizontal' : 'vertical'
      }
      if (locked.current === 'vertical') {
        active.current = false
        return
      }
    }

    if (lockAxis && locked.current !== 'horizontal') return

    currentX.current = touch.clientX
    let raw = dx

    if (direction === 'left' && raw > 0) raw = 0
    if (direction === 'right' && raw < 0) raw = 0

    setOffset(raw)
    if (!isSwiping && Math.abs(raw) > 4) {
      setIsSwiping(true)
    }
  }, [direction, lockAxis, isSwiping])

  const onTouchEnd = useCallback(() => {
    if (!active.current) return
    active.current = false

    const dx = currentX.current - startX.current
    const dt = (Date.now() - startTime.current) / 1000
    const velocity = Math.abs(dx) / dt

    const triggered = Math.abs(dx) >= threshold || velocity >= velocityThreshold

    if (triggered) {
      if (dx < 0 && (direction === 'left' || direction === 'horizontal')) {
        onSwipeLeft?.()
      }
      if (dx > 0 && (direction === 'right' || direction === 'horizontal')) {
        onSwipeRight?.()
      }
    }

    onSwipeEnd?.(dx)
    setOffset(0)
    setIsSwiping(false)
  }, [threshold, velocityThreshold, direction, onSwipeLeft, onSwipeRight, onSwipeEnd])

  return { offset, isSwiping, onTouchStart, onTouchMove, onTouchEnd }
}
