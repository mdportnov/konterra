'use client'

import { useRef, useCallback } from 'react'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { GLASS, Z, TRANSITION } from '@/lib/constants/ui'
import { useClickOutside } from '@/hooks/use-click-outside'
import { useHotkey } from '@/hooks/use-hotkey'
import { useIsMobile } from '@/hooks/use-mobile'
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip'

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

  const z = zIndex ?? (side === 'left' ? Z.sidebar : Z.detail)

  useClickOutside(panelRef, handleClose, open && !!onClose)
  useHotkey('Escape', handleClose, { enabled: open && !!onClose, priority: z })

  const translateClosed = side === 'left' ? '-translate-x-full' : 'translate-x-full'
  const borderSide = side === 'left' ? 'border-r' : 'border-l'

  const panelWidth = isMobile ? '100vw' : width

  const ChevronIcon = side === 'right' ? ChevronRight : ChevronLeft
  const tooltipSide = side === 'right' ? 'left' : 'right'

  return (
    <div
      ref={panelRef}
      data-globe-panel
      className={cn(
        'fixed top-0 h-full',
        side === 'left' ? 'left-0' : 'right-0',
        'transition-[transform,opacity] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]',
        open ? 'translate-x-0 opacity-100' : `${translateClosed} opacity-0`,
        className
      )}
      aria-hidden={!open}
      style={{
        width: panelWidth,
        zIndex: z,
        pointerEvents: open ? 'auto' : 'none',
        paddingBottom: isMobile ? 'env(safe-area-inset-bottom, 0px)' : undefined,
      }}
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
      {onClose && open && isMobile && (
        <button
          onClick={handleClose}
          className="absolute top-3 right-3 h-8 w-8 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
          style={{ zIndex: z + 1 }}
        >
          <X className="h-4 w-4" />
        </button>
      )}
      {onClose && !isMobile && open && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={handleClose}
                className={cn(
                  'absolute top-4 h-7 w-4 flex items-center justify-center cursor-pointer',
                  side === 'right' ? '-left-4 rounded-l-sm' : '-right-4 rounded-r-sm',
                  GLASS.control,
                  side === 'right' ? 'border-r-0' : 'border-l-0',
                  'hover:bg-accent',
                  TRANSITION.color,
                  'text-muted-foreground hover:text-foreground',
                )}
              >
                <ChevronIcon className="h-3.5 w-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side={tooltipSide} className="text-xs">
              Close panel
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  )
}
