'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { signOut } from 'next-auth/react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { LogOut, Loader2, Pencil, Check, X, Users, Globe, Link2, CalendarDays, Shield, MapPin } from 'lucide-react'
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

interface HomebaseData {
  city?: string | null
  country?: string | null
  timezone?: string | null
  lat?: number | null
  lng?: number | null
}

interface GeoSuggestion {
  formatted: string
  lat: number
  lng: number
}

export function ProfileTab({ open, contactCount, connectionCount, visitedCountryCount }: ProfileTabProps) {
  const [user, setUser] = useState<SessionUser | null>(null)
  const [signingOut, setSigningOut] = useState(false)
  const [editingName, setEditingName] = useState(false)
  const [nameValue, setNameValue] = useState('')
  const fetched = useRef(false)

  const [homebase, setHomebase] = useState<HomebaseData | null>(null)
  const [homebaseLoading, setHomebaseLoading] = useState(false)
  const [editingHomebase, setEditingHomebase] = useState(false)
  const [cityInput, setCityInput] = useState('')
  const [suggestions, setSuggestions] = useState<GeoSuggestion[]>([])
  const [selectedGeo, setSelectedGeo] = useState<GeoSuggestion | null>(null)
  const [savingHomebase, setSavingHomebase] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (open && !fetched.current) {
      fetched.current = true
      fetch('/api/profile')
        .then((r) => r.json())
        .then((data) => setUser(data))
        .catch(() => toast.error('Failed to load profile'))

      setHomebaseLoading(true)
      fetch('/api/me/location')
        .then((r) => r.json())
        .then((data) => setHomebase(data))
        .catch(() => toast.error('Failed to load homebase'))
        .finally(() => setHomebaseLoading(false))
    }
  }, [open])

  const searchCity = useCallback((query: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (query.length < 2) { setSuggestions([]); return }
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`)
        if (!res.ok) return
        const data = await res.json()
        if (data.formatted) {
          setSuggestions([{ formatted: data.formatted, lat: data.lat, lng: data.lng }])
        }
      } catch { /* ignore */ }
    }, 300)
  }, [])

  const handleCityInputChange = (val: string) => {
    setCityInput(val)
    setSelectedGeo(null)
    searchCity(val)
  }

  const handleSelectSuggestion = (s: GeoSuggestion) => {
    setCityInput(s.formatted)
    setSelectedGeo(s)
    setSuggestions([])
  }

  const handleEditHomebase = () => {
    setCityInput(homebase?.city || '')
    setSelectedGeo(null)
    setSuggestions([])
    setEditingHomebase(true)
  }

  const handleCancelHomebase = () => {
    setEditingHomebase(false)
    setCityInput('')
    setSuggestions([])
    setSelectedGeo(null)
  }

  const handleSaveHomebase = async () => {
    setSavingHomebase(true)
    try {
      const payload: Record<string, unknown> = { city: cityInput }
      if (selectedGeo) {
        payload.lat = selectedGeo.lat
        payload.lng = selectedGeo.lng
        const parts = selectedGeo.formatted.split(',').map((s) => s.trim())
        if (parts.length >= 2) payload.country = parts[parts.length - 1]
      }
      const res = await fetch('/api/me/location', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error()
      const fresh = await fetch('/api/me/location')
      const data = await fresh.json()
      setHomebase(data)
      setEditingHomebase(false)
      toast.success('Homebase updated')
    } catch {
      toast.error('Failed to update homebase')
    } finally {
      setSavingHomebase(false)
    }
  }

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

  const homebaseDisplay = homebase?.city
    ? [homebase.city, homebase.country].filter(Boolean).join(', ')
    : null

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

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-muted-foreground/60" />
                <span className="text-xs font-medium text-muted-foreground/60 uppercase tracking-wider">Homebase</span>
              </div>
              {!editingHomebase && !homebaseLoading && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={handleEditHomebase}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Edit homebase</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
            {homebaseLoading ? (
              <Skeleton className="h-5 w-40" />
            ) : editingHomebase ? (
              <div className="space-y-2">
                <div className="relative">
                  <Input
                    value={cityInput}
                    onChange={(e) => handleCityInputChange(e.target.value)}
                    placeholder="Search city..."
                    className="h-8 text-sm"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') handleCancelHomebase()
                    }}
                  />
                  {suggestions.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-md shadow-md z-50 overflow-hidden">
                      {suggestions.map((s, i) => (
                        <button
                          key={i}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors"
                          onClick={() => handleSelectSuggestion(s)}
                        >
                          {s.formatted}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={handleSaveHomebase}
                    disabled={savingHomebase || !cityInput.trim()}
                  >
                    {savingHomebase ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Check className="h-3 w-3 mr-1" />}
                    Save
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={handleCancelHomebase}>
                    <X className="h-3 w-3 mr-1" />
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                {homebaseDisplay || 'Not set'}
                {homebase?.timezone && <span className="text-xs text-muted-foreground/50 ml-1">({homebase.timezone})</span>}
              </p>
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
