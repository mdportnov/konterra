'use client'

import { useRef, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { GLASS, Z, TRANSITION } from '@/lib/constants/ui'
import { useClickOutside } from '@/hooks/use-click-outside'
import { useHotkey } from '@/hooks/use-hotkey'

interface GlobePanelProps {
  open: boolean
  side: 'left' | 'right'
  width: number
  glass?: keyof typeof GLASS
  zIndex?: number
  onClose?: () => void
  className?: string
  children: React.ReactNode
}

export default function GlobePanel({
  open,
  side,
  width,
  glass = 'panel',
  zIndex,
  onClose,
  className,
  children,
}: GlobePanelProps) {
  const panelRef = useRef<HTMLDivElement>(null)

  const handleClose = useCallback(() => {
    onClose?.()
  }, [onClose])

  useClickOutside(panelRef, handleClose, open && !!onClose)
  useHotkey('Escape', handleClose, { enabled: open && !!onClose })

  const z = zIndex ?? (side === 'left' ? Z.sidebar : Z.detail)

  const translateClosed = side === 'left' ? '-translate-x-full' : 'translate-x-full'
  const borderSide = side === 'left' ? 'border-r' : 'border-l'

  return (
    <div
      ref={panelRef}
      className={cn(
        'fixed top-0 h-full',
        side === 'left' ? 'left-0' : 'right-0',
        TRANSITION.panel,
        open ? 'translate-x-0' : translateClosed,
        className
      )}
      style={{ width, zIndex: z }}
    >
      <div
        className={cn(
          'h-full flex flex-col overflow-hidden',
          GLASS[glass],
          borderSide,
          side === 'right' && 'overflow-y-auto'
        )}
      >
        {children}
      </div>
    </div>
  )
}
