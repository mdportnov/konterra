'use client'

import { Button } from '@/components/ui/button'
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip'
import { ChevronLeft, Plus, Globe as GlobeIcon } from 'lucide-react'

interface DashboardHeaderProps {
  isMobile?: boolean
  onSwitchToGlobe?: () => void
  onAddContact: () => void
  onCollapse?: () => void
  dashboardTab: 'connections' | 'travel'
  onDashboardTabChange: (tab: 'connections' | 'travel') => void
}

export default function DashboardHeader({
  isMobile,
  onSwitchToGlobe,
  onAddContact,
  onCollapse,
  dashboardTab,
  onDashboardTabChange,
}: DashboardHeaderProps) {
  return (
    <>
      <div className="px-4 pt-4 md:px-5 md:pt-5">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-lg font-semibold text-foreground truncate">
              Konterra
            </p>
            <p className="text-xs text-muted-foreground">Your network command center</p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {isMobile && onSwitchToGlobe && (
              <Button
                size="sm"
                variant="outline"
                onClick={onSwitchToGlobe}
                className="border-border text-muted-foreground"
              >
                <GlobeIcon className="h-4 w-4 mr-1" />
                Globe
              </Button>
            )}
            <Button
              size="sm"
              onClick={onAddContact}
              className="bg-orange-500 hover:bg-orange-600 text-white"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add
            </Button>
            {onCollapse && !isMobile && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={onCollapse}
                      className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">
                    Collapse sidebar
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </div>
      </div>

      <div className="px-4 md:px-5 pt-3 pb-1">
        <div className="flex gap-1 bg-muted/40 rounded-lg p-0.5">
          <button
            onClick={() => onDashboardTabChange('connections')}
            className={`flex-1 text-xs font-semibold px-3 py-1.5 rounded-md transition-colors ${
              dashboardTab === 'connections'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground/50 hover:text-muted-foreground'
            }`}
          >
            Connections
          </button>
          <button
            onClick={() => onDashboardTabChange('travel')}
            className={`flex-1 text-xs font-semibold px-3 py-1.5 rounded-md transition-colors ${
              dashboardTab === 'travel'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground/50 hover:text-muted-foreground'
            }`}
          >
            Travel Journey
          </button>
        </div>
      </div>
    </>
  )
}
