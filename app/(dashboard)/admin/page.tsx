'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import {
  ArrowLeft, Users, Globe, Link2, MessageSquare, Heart, Plane, Tag,
  Plus, Loader2, Shield, ShieldCheck, User, Eye, EyeOff, Search, X,
  ChevronDown, ChevronUp, Trash2, RefreshCw, Pencil, Save, KeyRound,
  Clock, CheckCircle2, XCircle, UserPlus, Copy, Mail,
} from 'lucide-react'
import { GLASS, TRANSITION } from '@/lib/constants/ui'
import { toast } from 'sonner'

type Tab = 'users' | 'waitlist'
type WaitlistFilter = 'all' | 'pending' | 'approved' | 'rejected'

interface AdminStats {
  totalUsers: number
  totalContacts: number
  totalConnections: number
  totalInteractions: number
  totalFavors: number
  totalTrips: number
  totalTags: number
  avgContactsPerUser: number
  waitlistPending: number
  waitlistTotal: number
}

interface AdminUser {
  id: string
  email: string
  name: string | null
  image: string | null
  role: string
  createdAt: string | null
  contactCount: number
}

interface WaitlistEntry {
  id: string
  email: string
  name: string
  message: string | null
  status: 'pending' | 'approved' | 'rejected'
  adminNote: string | null
  reviewedBy: string | null
  createdAt: string | null
  reviewedAt: string | null
}

interface ApproveResult {
  user: { id: string; email: string; name: string }
  generatedPassword: string
}

const ROLE_CONFIG = {
  admin: { label: 'Admin', icon: ShieldCheck, color: 'text-red-500 dark:text-red-400', bg: 'bg-red-500/10 border-red-500/20' },
  moderator: { label: 'Moderator', icon: Shield, color: 'text-orange-500 dark:text-orange-400', bg: 'bg-orange-500/10 border-orange-500/20' },
  user: { label: 'User', icon: User, color: 'text-muted-foreground', bg: 'bg-muted/50 border-border' },
} as const

const STATUS_CONFIG = {
  pending: { label: 'Pending', icon: Clock, color: 'text-yellow-500 dark:text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/20' },
  approved: { label: 'Approved', icon: CheckCircle2, color: 'text-green-500 dark:text-green-400', bg: 'bg-green-500/10 border-green-500/20' },
  rejected: { label: 'Rejected', icon: XCircle, color: 'text-red-500 dark:text-red-400', bg: 'bg-red-500/10 border-red-500/20' },
} as const

export default function AdminPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('users')
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [showCreateUser, setShowCreateUser] = useState(false)
  const [creating, setCreating] = useState(false)
  const [search, setSearch] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [expandedUser, setExpandedUser] = useState<string | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [newUser, setNewUser] = useState({ email: '', name: '', password: '', role: 'user' })

  const [editingUser, setEditingUser] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ name: '', email: '', role: 'user' })
  const [saving, setSaving] = useState(false)

  const [resetPasswordUser, setResetPasswordUser] = useState<AdminUser | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [resettingPassword, setResettingPassword] = useState(false)

  const [waitlistEntries, setWaitlistEntries] = useState<WaitlistEntry[]>([])
  const [waitlistFilter, setWaitlistFilter] = useState<WaitlistFilter>('pending')
  const [waitlistSearch, setWaitlistSearch] = useState('')
  const [waitlistLoading, setWaitlistLoading] = useState(false)
  const [expandedEntry, setExpandedEntry] = useState<string | null>(null)
  const [processingEntry, setProcessingEntry] = useState<string | null>(null)
  const [deleteWaitlistConfirmId, setDeleteWaitlistConfirmId] = useState<string | null>(null)

  const [approveDialog, setApproveDialog] = useState<WaitlistEntry | null>(null)
  const [approveNote, setApproveNote] = useState('')
  const [approvePassword, setApprovePassword] = useState('')
  const [approving, setApproving] = useState(false)
  const [approveResult, setApproveResult] = useState<ApproveResult | null>(null)

  const [rejectDialog, setRejectDialog] = useState<WaitlistEntry | null>(null)
  const [rejectNote, setRejectNote] = useState('')
  const [rejecting, setRejecting] = useState(false)

  const isAdmin = session?.user?.role === 'admin'
  const hasAccess = isAdmin || session?.user?.role === 'moderator'

  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    else setRefreshing(true)
    try {
      const [statsRes, usersRes] = await Promise.all([
        fetch('/api/admin/stats'),
        fetch('/api/admin/users'),
      ])
      if (!statsRes.ok || !usersRes.ok) throw new Error('Access denied')
      const [statsData, usersData] = await Promise.all([statsRes.json(), usersRes.json()])
      setStats(statsData)
      setUsers(usersData)
    } catch {
      toast.error('Failed to load admin data')
      if (!silent) router.push('/app')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [router])

  const fetchWaitlist = useCallback(async () => {
    setWaitlistLoading(true)
    try {
      const params = waitlistFilter !== 'all' ? `?status=${waitlistFilter}` : ''
      const res = await fetch(`/api/admin/waitlist${params}`)
      if (!res.ok) throw new Error('Failed to load waitlist')
      const data = await res.json()
      setWaitlistEntries(data)
    } catch {
      toast.error('Failed to load waitlist')
    } finally {
      setWaitlistLoading(false)
    }
  }, [waitlistFilter])

  useEffect(() => {
    if (status === 'loading') return
    if (!session?.user) { router.push('/login'); return }
    if (!hasAccess) { router.push('/app'); return }
    fetchData()
  }, [status, session, hasAccess, router, fetchData])

  useEffect(() => {
    if (tab === 'waitlist' && hasAccess) {
      fetchWaitlist()
    }
  }, [tab, hasAccess, fetchWaitlist])

  const handleRefresh = () => {
    fetchData(true)
    if (tab === 'waitlist') fetchWaitlist()
  }

  const handleCreateUser = async () => {
    if (!newUser.email || !newUser.name || !newUser.password) {
      toast.error('All fields are required')
      return
    }
    if (newUser.password.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }
    setCreating(true)
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to create user')
      }
      toast.success('User created')
      setNewUser({ email: '', name: '', password: '', role: 'user' })
      setShowCreateUser(false)
      setShowPassword(false)
      fetchData(true)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to create user')
    } finally {
      setCreating(false)
    }
  }

  const handleRoleChange = async (userId: string, newRole: string) => {
    const prev = users.find((u) => u.id === userId)?.role
    setUsers((u) => u.map((x) => x.id === userId ? { ...x, role: newRole } : x))
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, role: newRole }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to update role')
      }
      toast.success('Role updated')
    } catch (e) {
      setUsers((u) => u.map((x) => x.id === userId ? { ...x, role: prev ?? 'user' } : x))
      toast.error(e instanceof Error ? e.message : 'Failed to update role')
    }
  }

  const handleDeleteUser = async (userId: string) => {
    setDeleting(true)
    const prev = users
    setUsers((u) => u.filter((x) => x.id !== userId))
    setDeleteConfirmId(null)
    setExpandedUser(null)
    try {
      const res = await fetch(`/api/admin/users?id=${userId}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to delete user')
      }
      toast.success('User deleted')
      fetchData(true)
    } catch (e) {
      setUsers(prev)
      toast.error(e instanceof Error ? e.message : 'Failed to delete user')
    } finally {
      setDeleting(false)
    }
  }

  const startEditing = (u: AdminUser) => {
    setEditingUser(u.id)
    setEditForm({ name: u.name || '', email: u.email, role: u.role })
  }

  const cancelEditing = () => {
    setEditingUser(null)
    setEditForm({ name: '', email: '', role: 'user' })
  }

  const handleSaveUser = async (userId: string) => {
    if (!editForm.email || !editForm.name) {
      toast.error('Name and email are required')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, name: editForm.name, email: editForm.email, role: editForm.role }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to update user')
      }
      toast.success('User updated')
      setEditingUser(null)
      fetchData(true)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to update user')
    } finally {
      setSaving(false)
    }
  }

  const handleResetPassword = async () => {
    if (!resetPasswordUser || !newPassword) return
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }
    setResettingPassword(true)
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: resetPasswordUser.id, password: newPassword }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to reset password')
      }
      toast.success('Password reset successfully')
      setResetPasswordUser(null)
      setNewPassword('')
      setShowNewPassword(false)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to reset password')
    } finally {
      setResettingPassword(false)
    }
  }

  const handleApprove = async () => {
    if (!approveDialog) return
    setApproving(true)
    try {
      const res = await fetch('/api/admin/waitlist', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: approveDialog.id,
          action: 'approve',
          adminNote: approveNote || undefined,
          password: approvePassword || undefined,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to approve')
      }
      const data = await res.json()
      setApproveResult({ user: data.user, generatedPassword: data.generatedPassword })
      toast.success('Request approved, user account created')
      fetchWaitlist()
      fetchData(true)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to approve request')
    } finally {
      setApproving(false)
    }
  }

  const handleReject = async () => {
    if (!rejectDialog) return
    setRejecting(true)
    try {
      const res = await fetch('/api/admin/waitlist', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: rejectDialog.id,
          action: 'reject',
          adminNote: rejectNote || undefined,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to reject')
      }
      toast.success('Request rejected')
      setRejectDialog(null)
      setRejectNote('')
      fetchWaitlist()
      fetchData(true)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to reject request')
    } finally {
      setRejecting(false)
    }
  }

  const handleDeleteWaitlistEntry = async (id: string) => {
    setProcessingEntry(id)
    try {
      const res = await fetch(`/api/admin/waitlist?id=${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to delete entry')
      }
      toast.success('Entry deleted')
      setWaitlistEntries((prev) => prev.filter((e) => e.id !== id))
      setDeleteWaitlistConfirmId(null)
      setExpandedEntry(null)
      fetchData(true)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to delete entry')
    } finally {
      setProcessingEntry(null)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Copied to clipboard')
  }

  const filteredUsers = users.filter((u) => {
    const q = search.toLowerCase()
    return u.name?.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
  })

  const filteredWaitlist = waitlistEntries.filter((e) => {
    const q = waitlistSearch.toLowerCase()
    return e.name.toLowerCase().includes(q) || e.email.toLowerCase().includes(q)
  })

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
          <Skeleton className="h-10 w-48" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-8 w-full rounded-lg" />
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  const statCards = stats ? [
    { label: 'Users', value: stats.totalUsers, icon: Users, color: 'text-blue-500' },
    { label: 'Contacts', value: stats.totalContacts, icon: Users, color: 'text-green-500' },
    { label: 'Connections', value: stats.totalConnections, icon: Link2, color: 'text-purple-500' },
    { label: 'Interactions', value: stats.totalInteractions, icon: MessageSquare, color: 'text-yellow-500' },
    { label: 'Favors', value: stats.totalFavors, icon: Heart, color: 'text-pink-500' },
    { label: 'Trips', value: stats.totalTrips, icon: Plane, color: 'text-cyan-500' },
    { label: 'Tags', value: stats.totalTags, icon: Tag, color: 'text-indigo-500' },
    { label: 'Avg/User', value: stats.avgContactsPerUser, icon: Globe, color: 'text-orange-500' },
  ] : []

  return (
    <div className="min-h-screen bg-background">
      <header className={`sticky top-0 z-40 border-b ${GLASS.heavy}`}>
        <div className="max-w-6xl mx-auto px-3 sm:px-6 h-14 flex items-center gap-2 sm:gap-4">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="shrink-0" onClick={() => router.push('/app')}>
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Back to globe</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <div className="flex items-center gap-2 min-w-0">
            <Shield className="h-5 w-5 text-orange-500 shrink-0" />
            <h1 className="text-base sm:text-lg font-semibold text-foreground truncate">Admin</h1>
          </div>
          <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" onClick={handleRefresh} disabled={refreshing}>
                    <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Refresh data</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <Badge variant="outline" className={`hidden sm:flex ${ROLE_CONFIG[session?.user?.role as keyof typeof ROLE_CONFIG]?.bg || ''}`}>
              {isAdmin ? 'Administrator' : 'Moderator'}
            </Badge>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6 sm:space-y-8">
        <section>
          <h2 className="text-sm font-medium text-muted-foreground/60 uppercase tracking-wider mb-3 sm:mb-4">Platform Overview</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
            {statCards.map(({ label, value, icon: Icon, color }) => (
              <div
                key={label}
                className={`rounded-xl border border-border bg-card/50 p-3 sm:p-4 space-y-1 sm:space-y-2 ${TRANSITION.color} hover:bg-card/80`}
              >
                <Icon className={`h-4 w-4 sm:h-5 sm:w-5 ${color}`} />
                <p className="text-xl sm:text-2xl font-bold text-foreground">{value.toLocaleString()}</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground">{label}</p>
              </div>
            ))}
          </div>
        </section>

        <Separator />

        <div className="flex gap-0 border-b border-border">
          <button
            type="button"
            onClick={() => setTab('users')}
            className={`px-4 pb-3 text-sm font-medium ${TRANSITION.color} ${
              tab === 'users'
                ? 'text-foreground border-b-2 border-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Users ({users.length})
          </button>
          <button
            type="button"
            onClick={() => setTab('waitlist')}
            className={`px-4 pb-3 text-sm font-medium ${TRANSITION.color} flex items-center gap-2 ${
              tab === 'waitlist'
                ? 'text-foreground border-b-2 border-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Waitlist
            {stats && stats.waitlistPending > 0 && (
              <Badge variant="outline" className="bg-yellow-500/10 border-yellow-500/20 text-yellow-500 text-[10px] px-1.5 py-0">
                {stats.waitlistPending}
              </Badge>
            )}
          </button>
        </div>

        {tab === 'users' && (
          <section>
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <h2 className="text-sm font-medium text-muted-foreground/60 uppercase tracking-wider">
                Users ({filteredUsers.length})
              </h2>
              <Button
                size="sm"
                className="gap-1.5"
                onClick={() => setShowCreateUser(!showCreateUser)}
              >
                {showCreateUser ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                <span className="hidden sm:inline">{showCreateUser ? 'Cancel' : 'Add User'}</span>
              </Button>
            </div>

            {showCreateUser && (
              <div className="rounded-xl border border-border bg-card/50 p-4 sm:p-5 mb-4 space-y-4">
                <h3 className="text-sm font-medium text-foreground">Create New User</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="new-name" className="text-xs text-muted-foreground">Name</Label>
                    <Input
                      id="new-name"
                      placeholder="Full name"
                      value={newUser.name}
                      onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new-email" className="text-xs text-muted-foreground">Email</Label>
                    <Input
                      id="new-email"
                      type="email"
                      placeholder="user@example.com"
                      value={newUser.email}
                      onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new-password" className="text-xs text-muted-foreground">Password</Label>
                    <div className="relative">
                      <Input
                        id="new-password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Min 6 characters"
                        value={newUser.password}
                        onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                      />
                      <button
                        type="button"
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new-role" className="text-xs text-muted-foreground">Role</Label>
                    <Select value={newUser.role} onValueChange={(v) => setNewUser({ ...newUser, role: v })}>
                      <SelectTrigger id="new-role">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">User</SelectItem>
                        <SelectItem value="moderator">Moderator</SelectItem>
                        {isAdmin && <SelectItem value="admin">Admin</SelectItem>}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button onClick={handleCreateUser} disabled={creating} className="gap-1.5">
                    {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                    Create User
                  </Button>
                </div>
              </div>
            )}

            <div className="mb-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search users..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
                {search && (
                  <button
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setSearch('')}
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            <ScrollArea className="max-h-[calc(100vh-24rem)]">
              <div className="space-y-2">
                {filteredUsers.map((u) => {
                  const config = ROLE_CONFIG[u.role as keyof typeof ROLE_CONFIG] || ROLE_CONFIG.user
                  const RoleIcon = config.icon
                  const initials = u.name
                    ?.split(' ')
                    .map((n) => n[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2) || '?'
                  const isExpanded = expandedUser === u.id
                  const isSelf = u.id === session?.user?.id
                  const isDeleteTarget = deleteConfirmId === u.id
                  const isEditing = editingUser === u.id

                  return (
                    <div
                      key={u.id}
                      className={`rounded-xl border bg-card/50 ${TRANSITION.color} hover:bg-card/80 ${isDeleteTarget ? 'border-destructive/50' : 'border-border'}`}
                    >
                      <button
                        className="w-full px-3 sm:px-4 py-3 flex items-center gap-2 sm:gap-3 text-left"
                        onClick={() => {
                          if (isEditing) return
                          setExpandedUser(isExpanded ? null : u.id)
                          if (isExpanded) cancelEditing()
                        }}
                      >
                        <Avatar className="h-8 w-8 sm:h-9 sm:w-9 shrink-0">
                          <AvatarFallback className="bg-muted text-muted-foreground text-xs">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 sm:gap-2">
                            <span className="text-sm font-medium text-foreground truncate">{u.name || 'Unnamed'}</span>
                            {isSelf && (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0">you</Badge>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground truncate block">{u.email}</span>
                        </div>
                        <span className="text-xs text-muted-foreground shrink-0 hidden sm:block">{u.contactCount} contacts</span>
                        <Badge variant="outline" className={`shrink-0 gap-1 text-[10px] ${config.bg}`}>
                          <RoleIcon className={`h-3 w-3 ${config.color}`} />
                          <span className="hidden sm:inline">{config.label}</span>
                        </Badge>
                        {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
                      </button>

                      {isExpanded && !isEditing && (
                        <div className="px-3 sm:px-4 pb-3 pt-0 space-y-3 border-t border-border">
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 pt-3 text-xs">
                            <div>
                              <span className="text-muted-foreground">ID</span>
                              <p className="text-foreground font-mono text-[10px] truncate">{u.id}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Contacts</span>
                              <p className="text-foreground">{u.contactCount}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Joined</span>
                              <p className="text-foreground">
                                {u.createdAt ? new Date(u.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}
                              </p>
                            </div>
                          </div>
                          {isAdmin && !isSelf && (
                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground">Role:</span>
                                <Select value={u.role} onValueChange={(v) => handleRoleChange(u.id, v)}>
                                  <SelectTrigger className="h-7 w-[130px] text-xs">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="user" className="text-xs">User</SelectItem>
                                    <SelectItem value="moderator" className="text-xs">Moderator</SelectItem>
                                    <SelectItem value="admin" className="text-xs">Admin</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="flex items-center gap-1.5 sm:ml-auto">
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground"
                                        onClick={() => startEditing(u)}
                                      >
                                        <Pencil className="h-3.5 w-3.5" />
                                        <span className="sm:hidden">Edit</span>
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Edit user</TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground"
                                        onClick={() => setResetPasswordUser(u)}
                                      >
                                        <KeyRound className="h-3.5 w-3.5" />
                                        <span className="sm:hidden">Password</span>
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Reset password</TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                                {isDeleteTarget ? (
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-xs text-destructive">Delete?</span>
                                    <Button
                                      variant="destructive"
                                      size="sm"
                                      className="h-7 text-xs px-2"
                                      onClick={() => handleDeleteUser(u.id)}
                                      disabled={deleting}
                                    >
                                      {deleting ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Confirm'}
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-7 text-xs px-2"
                                      onClick={() => setDeleteConfirmId(null)}
                                      disabled={deleting}
                                    >
                                      Cancel
                                    </Button>
                                  </div>
                                ) : (
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-7 text-xs gap-1 text-muted-foreground hover:text-destructive"
                                          onClick={() => setDeleteConfirmId(u.id)}
                                        >
                                          <Trash2 className="h-3.5 w-3.5" />
                                          <span className="sm:hidden">Delete</span>
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>Delete user</TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {isExpanded && isEditing && (
                        <div className="px-3 sm:px-4 pb-4 pt-0 space-y-3 border-t border-border">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3">
                            <div className="space-y-1.5">
                              <Label className="text-xs text-muted-foreground">Name</Label>
                              <Input
                                value={editForm.name}
                                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                className="h-8 text-sm"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs text-muted-foreground">Email</Label>
                              <Input
                                type="email"
                                value={editForm.email}
                                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                                className="h-8 text-sm"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs text-muted-foreground">Role</Label>
                              <Select value={editForm.role} onValueChange={(v) => setEditForm({ ...editForm, role: v })}>
                                <SelectTrigger className="h-8 text-sm">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="user">User</SelectItem>
                                  <SelectItem value="moderator">Moderator</SelectItem>
                                  <SelectItem value="admin">Admin</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <div className="flex items-center justify-end gap-2 pt-1">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs"
                              onClick={cancelEditing}
                              disabled={saving}
                            >
                              Cancel
                            </Button>
                            <Button
                              size="sm"
                              className="h-7 text-xs gap-1"
                              onClick={() => handleSaveUser(u.id)}
                              disabled={saving}
                            >
                              {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                              Save
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
                {filteredUsers.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    {search ? 'No users match your search' : 'No users found'}
                  </div>
                )}
              </div>
            </ScrollArea>
          </section>
        )}

        {tab === 'waitlist' && (
          <section>
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
              <h2 className="text-sm font-medium text-muted-foreground/60 uppercase tracking-wider">
                Requests ({filteredWaitlist.length})
              </h2>
              <div className="flex items-center gap-2 sm:ml-auto">
                {(['all', 'pending', 'approved', 'rejected'] as const).map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setWaitlistFilter(f)}
                    className={`px-3 py-1 rounded-full text-xs font-medium ${TRANSITION.color} ${
                      waitlistFilter === f
                        ? 'bg-foreground text-background'
                        : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
                    {f === 'pending' && stats && stats.waitlistPending > 0 && (
                      <span className="ml-1">({stats.waitlistPending})</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search requests..."
                  value={waitlistSearch}
                  onChange={(e) => setWaitlistSearch(e.target.value)}
                  className="pl-9"
                />
                {waitlistSearch && (
                  <button
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setWaitlistSearch('')}
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            {waitlistLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 rounded-xl" />
                ))}
              </div>
            ) : (
              <ScrollArea className="max-h-[calc(100vh-24rem)]">
                <div className="space-y-2">
                  {filteredWaitlist.map((entry) => {
                    const statusConfig = STATUS_CONFIG[entry.status]
                    const StatusIcon = statusConfig.icon
                    const isExpanded = expandedEntry === entry.id
                    const isDeleteTarget = deleteWaitlistConfirmId === entry.id
                    const isProcessing = processingEntry === entry.id
                    const initials = entry.name
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .toUpperCase()
                      .slice(0, 2)

                    return (
                      <div
                        key={entry.id}
                        className={`rounded-xl border bg-card/50 ${TRANSITION.color} hover:bg-card/80 ${isDeleteTarget ? 'border-destructive/50' : 'border-border'}`}
                      >
                        <button
                          className="w-full px-3 sm:px-4 py-3 flex items-center gap-2 sm:gap-3 text-left"
                          onClick={() => setExpandedEntry(isExpanded ? null : entry.id)}
                        >
                          <Avatar className="h-8 w-8 sm:h-9 sm:w-9 shrink-0">
                            <AvatarFallback className="bg-muted text-muted-foreground text-xs">
                              {initials}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <span className="text-sm font-medium text-foreground truncate block">{entry.name}</span>
                            <span className="text-xs text-muted-foreground truncate block">{entry.email}</span>
                          </div>
                          <span className="text-xs text-muted-foreground shrink-0 hidden sm:block">
                            {entry.createdAt ? new Date(entry.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}
                          </span>
                          <Badge variant="outline" className={`shrink-0 gap-1 text-[10px] ${statusConfig.bg}`}>
                            <StatusIcon className={`h-3 w-3 ${statusConfig.color}`} />
                            <span className="hidden sm:inline">{statusConfig.label}</span>
                          </Badge>
                          {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
                        </button>

                        {isExpanded && (
                          <div className="px-3 sm:px-4 pb-3 pt-0 space-y-3 border-t border-border">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 pt-3 text-xs">
                              <div>
                                <span className="text-muted-foreground">Email</span>
                                <div className="flex items-center gap-1">
                                  <Mail className="h-3 w-3 text-muted-foreground" />
                                  <p className="text-foreground truncate">{entry.email}</p>
                                </div>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Requested</span>
                                <p className="text-foreground">
                                  {entry.createdAt ? new Date(entry.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}
                                </p>
                              </div>
                              {entry.reviewedAt && (
                                <div>
                                  <span className="text-muted-foreground">Reviewed</span>
                                  <p className="text-foreground">
                                    {new Date(entry.reviewedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                  </p>
                                </div>
                              )}
                            </div>

                            {entry.message && (
                              <div className="text-xs">
                                <span className="text-muted-foreground">Message</span>
                                <p className="text-foreground mt-1 bg-muted/30 rounded-lg p-2.5 whitespace-pre-wrap">{entry.message}</p>
                              </div>
                            )}

                            {entry.adminNote && (
                              <div className="text-xs">
                                <span className="text-muted-foreground">Admin Note</span>
                                <p className="text-foreground mt-1 bg-muted/30 rounded-lg p-2.5 whitespace-pre-wrap">{entry.adminNote}</p>
                              </div>
                            )}

                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                              {entry.status === 'pending' && (
                                <div className="flex items-center gap-1.5">
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          size="sm"
                                          className="h-7 text-xs gap-1"
                                          onClick={() => setApproveDialog(entry)}
                                          disabled={isProcessing}
                                        >
                                          <UserPlus className="h-3.5 w-3.5" />
                                          Approve
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>Approve and create user account</TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          className="h-7 text-xs gap-1 text-destructive hover:text-destructive"
                                          onClick={() => setRejectDialog(entry)}
                                          disabled={isProcessing}
                                        >
                                          <XCircle className="h-3.5 w-3.5" />
                                          Reject
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>Reject request</TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                </div>
                              )}
                              {isAdmin && (
                                <div className="sm:ml-auto">
                                  {isDeleteTarget ? (
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-xs text-destructive">Delete?</span>
                                      <Button
                                        variant="destructive"
                                        size="sm"
                                        className="h-7 text-xs px-2"
                                        onClick={() => handleDeleteWaitlistEntry(entry.id)}
                                        disabled={isProcessing}
                                      >
                                        {isProcessing ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Confirm'}
                                      </Button>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-7 text-xs px-2"
                                        onClick={() => setDeleteWaitlistConfirmId(null)}
                                        disabled={isProcessing}
                                      >
                                        Cancel
                                      </Button>
                                    </div>
                                  ) : (
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-7 text-xs gap-1 text-muted-foreground hover:text-destructive"
                                            onClick={() => setDeleteWaitlistConfirmId(entry.id)}
                                          >
                                            <Trash2 className="h-3.5 w-3.5" />
                                            <span className="sm:hidden">Delete</span>
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>Delete entry</TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                  {filteredWaitlist.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                      {waitlistSearch
                        ? 'No requests match your search'
                        : waitlistFilter === 'pending'
                          ? 'No pending requests'
                          : 'No requests found'}
                    </div>
                  )}
                </div>
              </ScrollArea>
            )}
          </section>
        )}
      </main>

      <Dialog open={!!resetPasswordUser} onOpenChange={(open) => {
        if (!open) {
          setResetPasswordUser(null)
          setNewPassword('')
          setShowNewPassword(false)
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>
              Set a new password for {resetPasswordUser?.name || resetPasswordUser?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="reset-password" className="text-xs text-muted-foreground">New Password</Label>
            <div className="relative">
              <Input
                id="reset-password"
                type={showNewPassword ? 'text' : 'password'}
                placeholder="Min 6 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
              <button
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setShowNewPassword(!showNewPassword)}
              >
                {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setResetPasswordUser(null)
              setNewPassword('')
              setShowNewPassword(false)
            }}>
              Cancel
            </Button>
            <Button onClick={handleResetPassword} disabled={resettingPassword || newPassword.length < 6} className="gap-1.5">
              {resettingPassword ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
              Reset Password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!approveDialog} onOpenChange={(open) => {
        if (!open) {
          setApproveDialog(null)
          setApproveNote('')
          setApprovePassword('')
          setApproveResult(null)
        }
      }}>
        <DialogContent>
          {!approveResult ? (
            <>
              <DialogHeader>
                <DialogTitle>Approve Request</DialogTitle>
                <DialogDescription>
                  Approve {approveDialog?.name} ({approveDialog?.email}) and create a user account.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="approve-password" className="text-xs text-muted-foreground">
                    Password (optional, auto-generated if empty)
                  </Label>
                  <Input
                    id="approve-password"
                    type="text"
                    placeholder="Leave empty to auto-generate"
                    value={approvePassword}
                    onChange={(e) => setApprovePassword(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="approve-note" className="text-xs text-muted-foreground">
                    Admin Note (optional, internal only)
                  </Label>
                  <Textarea
                    id="approve-note"
                    placeholder="Internal note about this approval..."
                    value={approveNote}
                    onChange={(e) => setApproveNote(e.target.value)}
                    rows={2}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => {
                  setApproveDialog(null)
                  setApproveNote('')
                  setApprovePassword('')
                }}>
                  Cancel
                </Button>
                <Button onClick={handleApprove} disabled={approving} className="gap-1.5">
                  {approving ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                  Approve
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Account Created</DialogTitle>
                <DialogDescription>
                  Share these credentials with the user. The password will not be shown again.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs text-muted-foreground">Email</span>
                      <p className="text-sm font-mono text-foreground">{approveResult.user.email}</p>
                    </div>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => copyToClipboard(approveResult.user.email)}>
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Copy email</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs text-muted-foreground">Password</span>
                      <p className="text-sm font-mono text-foreground">{approveResult.generatedPassword}</p>
                    </div>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => copyToClipboard(approveResult.generatedPassword)}>
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Copy password</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full gap-1.5"
                  onClick={() => {
                    copyToClipboard(`Email: ${approveResult.user.email}\nPassword: ${approveResult.generatedPassword}`)
                  }}
                >
                  <Copy className="h-3.5 w-3.5" />
                  Copy All Credentials
                </Button>
              </div>
              <DialogFooter>
                <Button onClick={() => {
                  setApproveDialog(null)
                  setApproveNote('')
                  setApprovePassword('')
                  setApproveResult(null)
                }}>
                  Done
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!rejectDialog} onOpenChange={(open) => {
        if (!open) {
          setRejectDialog(null)
          setRejectNote('')
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Request</DialogTitle>
            <DialogDescription>
              Reject the access request from {rejectDialog?.name} ({rejectDialog?.email}).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="reject-note" className="text-xs text-muted-foreground">
              Reason / Note (optional, internal only)
            </Label>
            <Textarea
              id="reject-note"
              placeholder="Reason for rejection..."
              value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setRejectDialog(null)
              setRejectNote('')
            }}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleReject} disabled={rejecting} className="gap-1.5">
              {rejecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
