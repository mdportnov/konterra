'use client'

import { Network, Plane, Flame, Hexagon } from 'lucide-react'
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip'
import { GLASS } from '@/lib/constants/ui'
import type { GlobeLayer, VisualizationMode } from '@/types/display'

interface GlobeViewToggleProps {
  showNetwork: boolean
  showTravel: boolean
  showHeatmap: boolean
  showHexBins: boolean
  onToggle: (layer: GlobeLayer) => void
  onVisualizationToggle: (mode: VisualizationMode) => void
}

export default function GlobeViewToggle({
  showNetwork,
  showTravel,
  showHeatmap,
  showHexBins,
  onToggle,
  onVisualizationToggle,
}: GlobeViewToggleProps) {
  return (
    <TooltipProvider>
      <div className="flex gap-1.5">
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
        <div className={`${GLASS.control} rounded-lg p-1 flex gap-0.5`}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => onVisualizationToggle('heatmap')}
                className={`h-7 w-7 flex items-center justify-center rounded-md transition-colors ${
                  showHeatmap
                    ? 'bg-red-500/20 text-red-400'
                    : 'text-muted-foreground/40 hover:text-muted-foreground/70'
                }`}
              >
                <Flame className="h-3.5 w-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">Heatmap</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => onVisualizationToggle('hexbin')}
                className={`h-7 w-7 flex items-center justify-center rounded-md transition-colors ${
                  showHexBins
                    ? 'bg-amber-500/20 text-amber-400'
                    : 'text-muted-foreground/40 hover:text-muted-foreground/70'
                }`}
              >
                <Hexagon className="h-3.5 w-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">Hex bins</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </TooltipProvider>
  )
}
