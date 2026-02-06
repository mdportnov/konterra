'use client'

import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Separator } from '@/components/ui/separator'
import { ThemeToggle } from '@/components/theme-toggle'
import { Settings, Plus } from 'lucide-react'
import { GLASS, Z } from '@/lib/constants/ui'

interface GlobeControlsProps {
  onAddContact?: () => void
  onSettings?: () => void
}

export default function GlobeControls({ onAddContact, onSettings }: GlobeControlsProps) {
  return (
    <TooltipProvider delayDuration={300}>
      <div
        className={`absolute bottom-4 right-4 sm:bottom-6 sm:right-6 flex items-center gap-2 ${GLASS.control} rounded-full px-3 py-2`}
        style={{ zIndex: Z.controls }}
      >
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 !text-muted-foreground hover:!text-foreground hover:!bg-accent"
              onClick={onAddContact}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Add Contact</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 !text-muted-foreground hover:!text-foreground hover:!bg-accent"
              onClick={onSettings}
            >
              <Settings className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Settings</TooltipContent>
        </Tooltip>

        <Separator orientation="vertical" className="h-5 bg-border" />
        <ThemeToggle />
      </div>
    </TooltipProvider>
  )
}
