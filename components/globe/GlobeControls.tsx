'use client'

import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Settings, Plus, Upload, LayoutDashboard, Network, Sparkles, LogOut } from 'lucide-react'
import { signOut } from 'next-auth/react'
import { GLASS, Z } from '@/lib/constants/ui'

interface GlobeControlsProps {
  onAddContact?: () => void
  onImport?: () => void
  onSettings?: () => void
  onInsights?: () => void
  isMobile?: boolean
  onSwitchToDashboard?: () => void
  user?: { name?: string | null; email?: string | null; image?: string | null } | null
}

export default function GlobeControls({ onAddContact, onImport, onSettings, onInsights, isMobile, onSwitchToDashboard, user }: GlobeControlsProps) {
  const btnSize = isMobile ? 'h-10 w-10' : 'h-8 w-8'
  const iconSize = isMobile ? 'h-5 w-5' : 'h-4 w-4'

  const initials = user?.name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || '?'

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

        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  className={`${btnSize} !p-0 rounded-full`}
                >
                  <Avatar className={`${isMobile ? 'h-8 w-8' : 'h-6 w-6'} border border-border`}>
                    <AvatarImage src={user?.image || undefined} />
                    <AvatarFallback className="text-[10px] bg-orange-500/20 text-orange-600 dark:text-orange-300">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent>Profile</TooltipContent>
          </Tooltip>
          <DropdownMenuContent align="end" side="top" className="w-48 mb-2">
            <DropdownMenuItem onClick={onAddContact}>
              <Plus className="h-4 w-4 mr-2" />
              Add Contact
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onInsights}>
              <Sparkles className="h-4 w-4 mr-2" />
              Insights
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onSettings}>
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => signOut({ callbackUrl: '/login' })}>
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </TooltipProvider>
  )
}
