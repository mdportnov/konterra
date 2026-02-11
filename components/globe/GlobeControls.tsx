'use client'

import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Separator } from '@/components/ui/separator'
import { ThemeToggle } from '@/components/theme-toggle'
import { Settings, Plus, Upload, LayoutDashboard, Network } from 'lucide-react'
import { GLASS, Z } from '@/lib/constants/ui'

interface GlobeControlsProps {
  onAddContact?: () => void
  onImport?: () => void
  onSettings?: () => void
  onInsights?: () => void
  isMobile?: boolean
  onSwitchToDashboard?: () => void
}

export default function GlobeControls({ onAddContact, onImport, onSettings, onInsights, isMobile, onSwitchToDashboard }: GlobeControlsProps) {
  const btnSize = isMobile ? 'h-10 w-10' : 'h-8 w-8'
  const iconSize = isMobile ? 'h-5 w-5' : 'h-4 w-4'

  return (
    <TooltipProvider delayDuration={300}>
      <div
        className={`absolute left-1/2 -translate-x-1/2 sm:left-auto sm:right-6 sm:translate-x-0 flex items-center gap-2 ${GLASS.control} rounded-full px-3 py-2`}
        style={{ zIndex: Z.controls, bottom: 'max(1.25rem, env(safe-area-inset-bottom, 0px))' }}
      >
        {isMobile && onSwitchToDashboard && (
          <>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  className={`${btnSize} !text-muted-foreground hover:!text-foreground hover:!bg-accent`}
                  onClick={onSwitchToDashboard}
                >
                  <LayoutDashboard className={iconSize} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Dashboard</TooltipContent>
            </Tooltip>
            <Separator orientation="vertical" className="h-5 bg-border" />
          </>
        )}

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon"
              variant="ghost"
              className={`${btnSize} !text-muted-foreground hover:!text-foreground hover:!bg-accent`}
              onClick={onAddContact}
            >
              <Plus className={iconSize} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Add Contact</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon"
              variant="ghost"
              className={`${btnSize} !text-muted-foreground hover:!text-foreground hover:!bg-accent`}
              onClick={onImport}
            >
              <Upload className={iconSize} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Import Contacts</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon"
              variant="ghost"
              className={`${btnSize} !text-muted-foreground hover:!text-foreground hover:!bg-accent`}
              onClick={onInsights}
            >
              <Network className={iconSize} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Connection Insights</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon"
              variant="ghost"
              className={`${btnSize} !text-muted-foreground hover:!text-foreground hover:!bg-accent`}
              onClick={onSettings}
            >
              <Settings className={iconSize} />
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
