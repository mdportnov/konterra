'use client'

import { useState, useEffect, useRef } from 'react'
import { signOut } from 'next-auth/react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { ScrollArea } from '@/components/ui/scroll-area'
import { LogOut, Loader2, Pencil, Check, X } from 'lucide-react'
import { toast } from 'sonner'
import type { ProfileTabProps, SessionUser } from './types'

export function ProfileTab({ open }: ProfileTabProps) {
  const [user, setUser] = useState<SessionUser | null>(null)
  const [signingOut, setSigningOut] = useState(false)
  const [editingName, setEditingName] = useState(false)
  const [nameValue, setNameValue] = useState('')
  const fetched = useRef(false)

  useEffect(() => {
    if (open && !fetched.current) {
      fetched.current = true
      fetch('/api/profile')
        .then((r) => r.json())
        .then((data) => setUser(data))
        .catch(() => toast.error('Failed to load profile'))
    }
  }, [open])

  const initials = user?.name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || '?'

  const handleSignOut = async () => {
    setSigningOut(true)
    await signOut({ callbackUrl: '/login' })
  }

  const handleEditName = () => {
    setNameValue(user?.name || '')
    setEditingName(true)
  }

  const handleCancelEdit = () => {
    setNameValue('')
    setEditingName(false)
  }

  const handleSaveName = async () => {
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: nameValue }),
      })
      if (!res.ok) throw new Error('Failed to update profile')
      const updated = await res.json()
      setUser((prev) => prev ? { ...prev, name: updated.name } : prev)
      setEditingName(false)
      toast.success('Name updated')
    } catch {
      toast.error('Failed to update name')
    }
  }

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1">
        <div className="p-6 space-y-6">
          <div className="flex flex-col items-center gap-3 pt-2">
            <Avatar className="h-20 w-20 border-2 border-border">
              <AvatarImage src={user?.image || undefined} />
              <AvatarFallback className="bg-orange-500/20 text-orange-600 dark:text-orange-300 text-xl">
                {initials}
              </AvatarFallback>
            </Avatar>
            {editingName ? (
              <div className="flex items-center gap-1 w-full max-w-[240px]">
                <Input
                  value={nameValue}
                  onChange={(e) => setNameValue(e.target.value)}
                  className="h-8 text-sm text-center"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveName()
                    if (e.key === 'Escape') handleCancelEdit()
                  }}
                />
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={handleSaveName}>
                  <Check className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={handleCancelEdit}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-1">
                <p className="font-medium text-foreground text-lg">{user?.name || 'User'}</p>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={handleEditName}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Edit name</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            )}
            <p className="text-sm text-muted-foreground">{user?.email}</p>
          </div>
        </div>
      </ScrollArea>
      <div className="p-6 pt-0">
        <Button
          variant="outline"
          className="w-full text-muted-foreground"
          onClick={handleSignOut}
          disabled={signingOut}
        >
          {signingOut ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogOut className="mr-2 h-4 w-4" />}
          Sign Out
        </Button>
      </div>
    </div>
  )
}
