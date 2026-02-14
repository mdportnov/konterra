'use client'

import { useState, useEffect, useRef } from 'react'
import { signOut } from 'next-auth/react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { LogOut, Loader2, Pencil, Check, X, Users, Globe, Link2, CalendarDays, Shield } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import type { ProfileTabProps } from './types'

interface SessionUser {
  name?: string | null
  email?: string | null
  image?: string | null
  role?: string | null
  createdAt?: string | null
}

export function ProfileTab({ open, contactCount, connectionCount, visitedCountryCount }: ProfileTabProps) {
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

  const memberSince = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    : null

  const stats = [
    { label: 'Contacts', value: contactCount, icon: Users },
    { label: 'Countries', value: visitedCountryCount, icon: Globe },
    { label: 'Connections', value: connectionCount, icon: Link2 },
    { label: 'Member since', value: memberSince || '...', icon: CalendarDays },
  ]

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1">
        <div className="p-6 space-y-6">
          <div className="flex flex-col items-center gap-3 pt-2">
            {!user ? (
              <>
                <Skeleton className="h-20 w-20 rounded-full" />
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-40" />
              </>
            ) : (
              <>
                <Avatar className="h-20 w-20 border-2 border-border">
                  <AvatarImage src={user.image || undefined} />
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
                    <p className="font-medium text-foreground text-lg">{user.name || 'User'}</p>
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
                <p className="text-sm text-muted-foreground">{user.email}</p>
                {user.role && user.role !== 'user' && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-orange-500/10 border border-orange-500/20 px-2.5 py-0.5 text-xs font-medium text-orange-600 dark:text-orange-300">
                    <Shield className="h-3 w-3" />
                    {user.role === 'admin' ? 'Administrator' : 'Moderator'}
                  </span>
                )}
              </>
            )}
          </div>

          <Separator className="bg-border" />

          <div className="grid grid-cols-2 gap-3">
            {stats.map(({ label, value, icon: Icon }) => (
              <div key={label} className="rounded-lg border border-border bg-muted/30 p-3 text-center space-y-1">
                <Icon className="h-4 w-4 mx-auto text-muted-foreground/60" />
                <p className="text-lg font-semibold text-foreground">{value}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </ScrollArea>
      <div className="p-6 pt-0 space-y-2">
        {user && (user.role === 'admin' || user.role === 'moderator') && (
          <Button
            variant="outline"
            className="w-full justify-start border-orange-500/30 text-orange-600 dark:text-orange-300 hover:bg-orange-500/10"
            onClick={() => window.location.href = '/admin'}
          >
            <Shield className="mr-2 h-4 w-4" />
            Admin Dashboard
          </Button>
        )}
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
