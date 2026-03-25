'use client'

import { useRef, useCallback, useState, useEffect } from 'react'
import { MessageSquare, Pencil, Trash2 } from 'lucide-react'
import { useIsMobile } from '@/hooks/use-mobile'
import { TRANSITION } from '@/lib/constants/ui'

const SWIPE_THRESHOLD = 80
const VELOCITY_THRESHOLD = 0.4
const ACTION_WIDTH = 180

let globalOpenId: string | null = null
let globalCloseCallback: (() => void) | null = null

interface SwipeableContactItemProps {
  contactId: string
  children: React.ReactNode
  onLog?: () => void
  onEdit?: () => void
  onDelete?: () => void
}

export default function SwipeableContactItem({
  contactId,
  children,
  onLog,
  onEdit,
  onDelete,
}: SwipeableContactItemProps) {
  const isMobile = useIsMobile()
  const [offset, setOffset] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [animating, setAnimating] = useState(false)

  const startX = useRef(0)
  const startY = useRef(0)
  const startTime = useRef(0)
  const currentOffset = useRef(0)
  const locked = useRef<'h' | 'v' | null>(null)
  const active = useRef(false)

  const closeActions = useCallback(() => {
    setAnimating(true)
    setOffset(0)
    setRevealed(false)
    currentOffset.current = 0
    if (globalOpenId === contactId) {
      globalOpenId = null
      globalCloseCallback = null
    }
  }, [contactId])

  const openActions = useCallback(() => {
    if (globalOpenId && globalOpenId !== contactId && globalCloseCallback) {
      globalCloseCallback()
    }
    setAnimating(true)
    setOffset(-ACTION_WIDTH)
    setRevealed(true)
    currentOffset.current = -ACTION_WIDTH
    globalOpenId = contactId
    globalCloseCallback = closeActions
  }, [contactId, closeActions])

  useEffect(() => {
    return () => {
      if (globalOpenId === contactId) {
        globalOpenId = null
        globalCloseCallback = null
      }
    }
  }, [contactId])

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0]
    startX.current = touch.clientX
    startY.current = touch.clientY
    startTime.current = Date.now()
    locked.current = null
    active.current = true
    setAnimating(false)
  }, [])

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!active.current) return

    const touch = e.touches[0]
    const dx = touch.clientX - startX.current
    const dy = touch.clientY - startY.current

    if (locked.current === null) {
      if (Math.abs(dx) > 8 || Math.abs(dy) > 8) {
        locked.current = Math.abs(dx) > Math.abs(dy) ? 'h' : 'v'
      }
      if (locked.current === 'v') {
        active.current = false
        return
      }
    }

    if (locked.current !== 'h') return

    e.stopPropagation()

    const base = revealed ? -ACTION_WIDTH : 0
    let raw = base + dx

    if (raw > 0) raw = 0
    const min = -(ACTION_WIDTH + 40)
    if (raw < min) raw = min + (raw - min) * 0.2

    currentOffset.current = raw
    setOffset(raw)
  }, [revealed])

  const onTouchEnd = useCallback(() => {
    if (!active.current) return
    active.current = false

    const dx = currentOffset.current - (revealed ? -ACTION_WIDTH : 0)
    const dt = (Date.now() - startTime.current) / 1000
    const velocity = Math.abs(dx) / dt

    const shouldReveal = currentOffset.current < -(SWIPE_THRESHOLD) || (dx < 0 && velocity > VELOCITY_THRESHOLD)
    const shouldClose = currentOffset.current > -(ACTION_WIDTH / 2) || (dx > 0 && velocity > VELOCITY_THRESHOLD)

    if (revealed) {
      if (shouldClose) {
        closeActions()
      } else {
        openActions()
      }
    } else {
      if (shouldReveal) {
        openActions()
      } else {
        closeActions()
      }
    }
  }, [revealed, openActions, closeActions])

  const handleAction = useCallback((action?: () => void) => {
    closeActions()
    setTimeout(() => action?.(), 200)
  }, [closeActions])

  if (!isMobile) {
    return <>{children}</>
  }

  return (
    <div className="relative overflow-hidden">
      <div className="absolute inset-y-0 right-0 flex items-stretch" style={{ width: ACTION_WIDTH }}>
        <button
          onClick={() => handleAction(onLog)}
          className="flex-1 flex items-center justify-center bg-blue-500 text-white active:bg-blue-600"
        >
          <MessageSquare className="h-4 w-4" />
        </button>
        <button
          onClick={() => handleAction(onEdit)}
          className="flex-1 flex items-center justify-center bg-zinc-500 text-white active:bg-zinc-600"
        >
          <Pencil className="h-4 w-4" />
        </button>
        <button
          onClick={() => handleAction(onDelete)}
          className="flex-1 flex items-center justify-center bg-red-500 text-white active:bg-red-600"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
      <div
        className={animating ? TRANSITION.panel : ''}
        style={{
          transform: `translateX(${offset}px)`,
          position: 'relative',
          zIndex: 1,
          backgroundColor: 'var(--card)',
        }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {children}
      </div>
    </div>
  )
}
