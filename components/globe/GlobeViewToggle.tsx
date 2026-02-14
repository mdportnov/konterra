'use client'

import { Network, Plane } from 'lucide-react'
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip'
import { GLASS } from '@/lib/constants/ui'
import type { GlobeLayer } from '@/types/display'

interface GlobeViewToggleProps {
  showNetwork: boolean
  showTravel: boolean
  onToggle: (layer: GlobeLayer) => void
}

export default function GlobeViewToggle({ showNetwork, showTravel, onToggle }: GlobeViewToggleProps) {
  return (
    <TooltipProvider>
      <div className={`${GLASS.control} rounded-lg p-1 flex gap-0.5`}>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => onToggle('network')}
              className={`h-7 w-7 flex items-center justify-center rounded-md transition-colors ${
                showNetwork
                  ? 'bg-orange-500/20 text-orange-400'
                  : 'text-muted-foreground/40 hover:text-muted-foreground/70'
              }`}
            >
              <Network className="h-3.5 w-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">Network layer</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => onToggle('travel')}
              className={`h-7 w-7 flex items-center justify-center rounded-md transition-colors ${
                showTravel
                  ? 'bg-blue-500/20 text-blue-400'
                  : 'text-muted-foreground/40 hover:text-muted-foreground/70'
              }`}
            >
              <Plane className="h-3.5 w-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">Travel layer</TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  )
}
