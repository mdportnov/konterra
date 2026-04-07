'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Settings, Plus, LayoutDashboard, Search, Sparkles, BoxSelect } from 'lucide-react'
import { GLASS, Z } from '@/lib/constants/ui'
import { Kbd } from '@/components/ui/kbd'

interface GlobeControlsProps {
  onAddContact?: (prefill?: Record<string, string>) => void
  onQuickAddContact?: (data: { name: string; country?: string }) => void
  onSearch?: () => void
  onInsights?: () => void
  onSettings?: () => void
  onProfile?: () => void
  isMobile?: boolean
  onSwitchToDashboard?: () => void
  user?: { name?: string | null; email?: string | null; image?: string | null } | null
  regionSelectActive?: boolean
  onToggleRegionSelect?: () => void
}

export default function GlobeControls({ onAddContact, onQuickAddContact, onSearch, onInsights, onSettings, onProfile, isMobile, onSwitchToDashboard, user, regionSelectActive, onToggleRegionSelect }: GlobeControlsProps) {
  const btnSize = isMobile ? 'h-10 w-10' : 'h-8 w-8'
  const iconSize = isMobile ? 'h-5 w-5' : 'h-4 w-4'
  const [quickAddOpen, setQuickAddOpen] = useState(false)
  const [quickName, setQuickName] = useState('')
  const [quickCountry, setQuickCountry] = useState('')
  const [quickAddLoading, setQuickAddLoading] = useState(false)
  const nameInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (quickAddOpen) {
      setTimeout(() => nameInputRef.current?.focus(), 0)
    } else {
      setQuickName('')
      setQuickCountry('')
    }
  }, [quickAddOpen])

  const handleQuickAdd = async () => {
    const trimmed = quickName.trim()
    if (!trimmed) return
    setQuickAddLoading(true)
    try {
      await onQuickAddContact?.({ name: trimmed, country: quickCountry.trim() || undefined })
      setQuickAddOpen(false)
    } catch {
    } finally {
      setQuickAddLoading(false)
    }
  }

  const handleMoreDetails = () => {
    const prefill: Record<string, string> = {}
    if (quickName.trim()) prefill.name = quickName.trim()
    if (quickCountry.trim()) prefill.country = quickCountry.trim()
    setQuickAddOpen(false)
    onAddContact?.(prefill)
  }

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
              onClick={onSearch}
            >
              <Search className={iconSize} />
            </Button>
          </TooltipTrigger>
          <TooltipContent className="flex items-center gap-2">Search <Kbd meta>K</Kbd></TooltipContent>
        </Tooltip>

        {onToggleRegionSelect && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className={`${btnSize} ${regionSelectActive ? '!text-orange-500 !bg-orange-500/15' : '!text-muted-foreground hover:!text-foreground hover:!bg-accent'}`}
                onClick={onToggleRegionSelect}
              >
                <BoxSelect className={iconSize} />
              </Button>
            </TooltipTrigger>
            <TooltipContent className="flex items-center gap-2">
              {regionSelectActive ? 'Cancel selection' : 'Select region'} <Kbd>G</Kbd>
            </TooltipContent>
          </Tooltip>
        )}

        <Popover open={quickAddOpen} onOpenChange={setQuickAddOpen}>
          <Tooltip>
            <TooltipTrigger asChild>
              <PopoverTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  className={`${btnSize} !text-muted-foreground hover:!text-foreground hover:!bg-accent`}
                >
                  <Plus className={iconSize} />
                </Button>
              </PopoverTrigger>
            </TooltipTrigger>
            <TooltipContent className="flex items-center gap-2">Add Contact <Kbd meta>N</Kbd></TooltipContent>
          </Tooltip>
          <PopoverContent
            className="w-64 p-3 space-y-2"
            side="top"
            align="center"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !quickAddLoading) handleQuickAdd()
            }}
          >
            <Input
              ref={nameInputRef}
              value={quickName}
              onChange={(e) => setQuickName(e.target.value)}
              placeholder="Contact name"
              className="h-8 text-sm"
            />
            <Input
              value={quickCountry}
              onChange={(e) => setQuickCountry(e.target.value)}
              placeholder="Country (optional)"
              className="h-8 text-sm"
            />
            <button
              type="button"
              className="text-xs text-muted-foreground hover:text-foreground cursor-pointer"
              onClick={handleMoreDetails}
            >
              Add more details...
            </button>
            <Button
              variant="default"
              size="sm"
              className="w-full h-8 text-xs bg-orange-500 hover:bg-orange-600 text-white"
              disabled={!quickName.trim() || quickAddLoading}
              onClick={handleQuickAdd}
            >
              Add
            </Button>
          </PopoverContent>
        </Popover>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon"
              variant="ghost"
              className={`${btnSize} !text-muted-foreground hover:!text-foreground hover:!bg-accent`}
              onClick={onInsights}
            >
              <Sparkles className={iconSize} />
            </Button>
          </TooltipTrigger>
          <TooltipContent className="flex items-center gap-2">Insights <Kbd meta>I</Kbd></TooltipContent>
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

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon"
              variant="ghost"
              className={`${btnSize} !p-0 rounded-full`}
              onClick={onProfile}
            >
              <Avatar className={`${isMobile ? 'h-8 w-8' : 'h-6 w-6'} border border-border`}>
                <AvatarImage src={user?.image || undefined} />
                <AvatarFallback className="text-[10px] bg-orange-500/20 text-orange-600 dark:text-orange-300">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Profile</TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  )
}
