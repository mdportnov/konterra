'use client'

import { Network, Plane } from 'lucide-react'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
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
      <div className={`${GLASS.control} rounded-lg p-1`}>
        <ToggleGroup
          type="single"
          value={value}
          onValueChange={(v) => { if (v) onChange(v as GlobeViewMode) }}
          className="gap-0"
        >
          <Tooltip>
            <TooltipTrigger asChild>
              <ToggleGroupItem
                value="network"
                className="h-7 w-7 p-0 data-[state=on]:bg-orange-500/20 data-[state=on]:text-orange-500"
              >
                <Network className="h-3.5 w-3.5" />
              </ToggleGroupItem>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">Network view</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <ToggleGroupItem
                value="travel"
                className="h-7 w-7 p-0 data-[state=on]:bg-blue-500/20 data-[state=on]:text-blue-500"
              >
                <Plane className="h-3.5 w-3.5" />
              </ToggleGroupItem>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">Travel view</TooltipContent>
          </Tooltip>
        </ToggleGroup>
      </div>
    </TooltipProvider>
  )
}
