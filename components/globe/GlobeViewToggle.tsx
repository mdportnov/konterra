'use client'

import { Network, Plane } from 'lucide-react'
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip'
import { GLASS } from '@/lib/constants/ui'
import type { GlobeViewMode } from '@/types/display'

interface GlobeViewToggleProps {
  value: GlobeViewMode
  onChange: (mode: GlobeViewMode) => void
}

export default function GlobeViewToggle({ value, onChange }: GlobeViewToggleProps) {
  return (
    <TooltipProvider>
      <div className={`${GLASS.control} rounded-lg p-1 flex gap-0.5`}>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => onChange('network')}
              className={`h-7 w-7 flex items-center justify-center rounded-md transition-colors ${
                value === 'network'
                  ? 'bg-orange-500/20 text-orange-400'
                  : 'text-muted-foreground/40 hover:text-muted-foreground/70'
              }`}
            >
              <Network className="h-3.5 w-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">Network view</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => onChange('travel')}
              className={`h-7 w-7 flex items-center justify-center rounded-md transition-colors ${
                value === 'travel'
                  ? 'bg-blue-500/20 text-blue-400'
                  : 'text-muted-foreground/40 hover:text-muted-foreground/70'
              }`}
            >
              <Plane className="h-3.5 w-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">Travel view</TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  )
}
