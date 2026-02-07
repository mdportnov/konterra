'use client'

import { useRef, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { GLASS, Z, TRANSITION } from '@/lib/constants/ui'
import { useClickOutside } from '@/hooks/use-click-outside'
import { useHotkey } from '@/hooks/use-hotkey'
import { useIsMobile } from '@/hooks/use-mobile'

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
  const isMobile = useIsMobile()

  const handleClose = useCallback(() => {
    onClose?.()
  }, [onClose])

  useClickOutside(panelRef, handleClose, open && !!onClose)
  useHotkey('Escape', handleClose, { enabled: open && !!onClose })

  const z = zIndex ?? (side === 'left' ? Z.sidebar : Z.detail)

  const translateClosed = side === 'left' ? '-translate-x-full' : 'translate-x-full'
  const borderSide = side === 'left' ? 'border-r' : 'border-l'

  const panelWidth = isMobile ? '100vw' : width

  return (
    <div
      ref={panelRef}
      className={cn(
        'fixed top-0 h-full',
        side === 'left' ? 'left-0' : 'right-0',
        'transition-[transform,opacity] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]',
        open ? 'translate-x-0 opacity-100' : `${translateClosed} opacity-0`,
        className
      )}
      style={{ width: panelWidth, zIndex: z, pointerEvents: open ? 'auto' : 'none' }}
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
