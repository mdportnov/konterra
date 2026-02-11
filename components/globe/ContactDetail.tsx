'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Mail, Phone, Linkedin, Twitter, Send, Instagram, Github, Globe, MapPin,
  Building2, Pencil, X, CalendarDays, Users, Handshake, Trash2, Plus,
  MessageSquare, Calendar, Clock, Link2, Gift, Cake, Brain, Target,
  Shield, Zap, ChevronRight,
} from 'lucide-react'
import { toast } from 'sonner'
import GlobePanel from '@/components/globe/GlobePanel'
import { StarRating } from '@/components/ui/star-rating'
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip'
import { PANEL_WIDTH } from '@/lib/constants/ui'
import { RATING_LABELS } from '@/lib/constants/rating'
import { trajectoryIcon, trajectoryColor, computeTrajectory, computeRelationshipStrength } from '@/lib/metrics'
import { fetchContactInteractions, fetchContactConnections, fetchContactFavors, fetchContactCountryConnections } from '@/lib/api'
import type { Contact, Interaction, ContactConnection, ContactCountryConnection, Favor } from '@/lib/db/schema'

export interface ConnectedContact {
  id: string
  name: string
  lat: number | null
  lng: number | null
}

interface ContactDetailProps {
  contact: Contact | null
  open: boolean
  onClose: () => void
  onEdit: (contact: Contact) => void
  onDelete?: (contactId: string) => void
  connectedContacts?: ConnectedContact[]
  onConnectedContactClick?: (c: ConnectedContact) => void
  allContacts?: Contact[]
  onCountryConnectionsChange?: (contactId: string, connections: ContactCountryConnection[]) => void
}

const INTERACTION_TYPES = ['meeting', 'call', 'message', 'email', 'event', 'introduction', 'deal', 'note'] as const
const CONNECTION_TYPES = ['knows', 'introduced_by', 'works_with', 'reports_to', 'invested_in', 'referred_by'] as const
const FAVOR_TYPES = ['introduction', 'advice', 'referral', 'money', 'opportunity', 'resource', 'time'] as const

const INTERACTION_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  meeting: Calendar, call: Phone, message: MessageSquare, email: Mail,
  event: Users, introduction: Handshake, deal: Handshake, note: MessageSquare,
}

function relativeDate(date: Date | string): string {
  const d = date instanceof Date ? date : new Date(date)
  const diff = Date.now() - d.getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days}d ago`
  if (days < 30) return `${Math.floor(days / 7)}w ago`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function ContactDetail({
  contact,
  open,
  onClose,
  onEdit,
  onDelete,
  connectedContacts = [],
  onConnectedContactClick,
  allContacts = [],
  onCountryConnectionsChange,
}: ContactDetailProps) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [interactions, setInteractions] = useState<Interaction[]>([])
  const [loadingInteractions, setLoadingInteractions] = useState(false)
  const [showAddInteraction, setShowAddInteraction] = useState(false)
  const [newInteraction, setNewInteraction] = useState({ type: 'meeting', notes: '', date: new Date().toISOString().slice(0, 10) })
  const [connections, setConnections] = useState<ContactConnection[]>([])
  const [loadingConnections, setLoadingConnections] = useState(false)
  const [showAddConnection, setShowAddConnection] = useState(false)
  const [newConnection, setNewConnection] = useState({ targetContactId: '', connectionType: 'knows', strength: 3 })
  const [favorsList, setFavorsList] = useState<Favor[]>([])
  const [loadingFavors, setLoadingFavors] = useState(false)
  const [showAddFavor, setShowAddFavor] = useState(false)
  const [newFavor, setNewFavor] = useState({ direction: 'given', type: 'introduction', description: '' })
  const [countryTies, setCountryTies] = useState<ContactCountryConnection[]>([])
  const [loadingCountryTies, setLoadingCountryTies] = useState(false)
  const [showAddCountryTie, setShowAddCountryTie] = useState(false)
  const [newCountryTie, setNewCountryTie] = useState({ country: '', notes: '' })
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({ timeline: false, connections: false, favors: false, countryTies: false, profile: false })
  const abortRef = useRef<AbortController | null>(null)

  const toggleSection = useCallback((key: string) => {
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }))
  }, [])

  useEffect(() => {
    if (!contact || !open) return
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    const contactId = contact.id

    setLoadingInteractions(true)
    setLoadingConnections(true)
    setLoadingFavors(true)
    setLoadingCountryTies(true)

    fetchContactInteractions(contactId, controller.signal)
      .then((data) => { if (!controller.signal.aborted) setInteractions(data) })
      .catch((e) => { if (!controller.signal.aborted && e.name !== 'AbortError') toast.error('Failed to load interactions') })
      .finally(() => { if (!controller.signal.aborted) setLoadingInteractions(false) })

    fetchContactConnections(contactId, controller.signal)
      .then((data) => { if (!controller.signal.aborted) setConnections(data) })
      .catch((e) => { if (!controller.signal.aborted && e.name !== 'AbortError') toast.error('Failed to load connections') })
      .finally(() => { if (!controller.signal.aborted) setLoadingConnections(false) })

    fetchContactFavors(contactId, controller.signal)
      .then((data) => { if (!controller.signal.aborted) setFavorsList(data) })
      .catch((e) => { if (!controller.signal.aborted && e.name !== 'AbortError') toast.error('Failed to load favors') })
      .finally(() => { if (!controller.signal.aborted) setLoadingFavors(false) })

    fetchContactCountryConnections(contactId, controller.signal)
      .then((data) => { if (!controller.signal.aborted) setCountryTies(data) })
      .catch((e) => { if (!controller.signal.aborted && e.name !== 'AbortError') toast.error('Failed to load country ties') })
      .finally(() => { if (!controller.signal.aborted) setLoadingCountryTies(false) })

    return () => controller.abort()
  }, [contact, open])

  if (!contact) return null

  const initials = contact.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  const handleDelete = async () => {
    setDeleting(true)
    try {
      const res = await fetch(`/api/contacts/${contact.id}`, { method: 'DELETE' })
      if (res.ok) {
        toast.success('Contact deleted')
        onDelete?.(contact.id)
        onClose()
      } else {
        toast.error('Failed to delete contact')
      }
    } catch {
      toast.error('Failed to delete contact')
    } finally {
      setDeleting(false)
      setConfirmDelete(false)
    }
  }

  const handleAddInteraction = async () => {
    try {
      const res = await fetch(`/api/contacts/${contact.id}/interactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newInteraction, date: new Date(newInteraction.date + 'T12:00:00').toISOString() }),
      })
      if (res.ok) {
        const item = await res.json()
        setInteractions((prev) => [item, ...prev])
        setShowAddInteraction(false)
        setNewInteraction({ type: 'meeting', notes: '', date: new Date().toISOString().slice(0, 10) })
        toast.success('Interaction added')
      }
    } catch {
      toast.error('Failed to add interaction')
    }
  }

  const handleAddConnection = async () => {
    if (!newConnection.targetContactId) return
    try {
      const res = await fetch(`/api/contacts/${contact.id}/connections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newConnection),
      })
      if (res.ok) {
        const conn = await res.json()
        setConnections((prev) => [...prev, conn])
        setShowAddConnection(false)
        setNewConnection({ targetContactId: '', connectionType: 'knows', strength: 3 })
        toast.success('Connection added')
      }
    } catch {
      toast.error('Failed to add connection')
    }
  }

  const handleAddFavor = async () => {
    try {
      const res = await fetch(`/api/contacts/${contact.id}/favors`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newFavor),
      })
      if (res.ok) {
        const favor = await res.json()
        setFavorsList((prev) => [favor, ...prev])
        setShowAddFavor(false)
        setNewFavor({ direction: 'given', type: 'introduction', description: '' })
        toast.success('Favor recorded')
      }
    } catch {
      toast.error('Failed to record favor')
    }
  }

  const handleAddCountryTie = async () => {
    if (!newCountryTie.country.trim()) return
    try {
      const res = await fetch(`/api/contacts/${contact.id}/country-connections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCountryTie),
      })
      if (res.ok) {
        const item = await res.json()
        const updated = [...countryTies, item]
        setCountryTies(updated)
        setShowAddCountryTie(false)
        setNewCountryTie({ country: '', notes: '' })
        toast.success('Country tie added')
        onCountryConnectionsChange?.(contact.id, updated)
      }
    } catch {
      toast.error('Failed to add country tie')
    }
  }

  const handleDeleteCountryTie = async (connectionId: string) => {
    try {
      const res = await fetch(`/api/contacts/${contact.id}/country-connections`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connectionId }),
      })
      if (res.ok) {
        const updated = countryTies.filter((t) => t.id !== connectionId)
        setCountryTies(updated)
        toast.success('Country tie removed')
        onCountryConnectionsChange?.(contact.id, updated)
      }
    } catch {
      toast.error('Failed to remove country tie')
    }
  }

  const trajectory = computeTrajectory(interactions)
  const strengthScore = computeRelationshipStrength(contact, interactions, favorsList)
  const givenCount = favorsList.filter((f) => f.direction === 'given').length
  const receivedCount = favorsList.filter((f) => f.direction === 'received').length
  const favorNet = givenCount - receivedCount

  const otherContacts = allContacts.filter((c) => c.id !== contact.id)

  const getConnectionContactName = (conn: ContactConnection) => {
    const otherId = conn.sourceContactId === contact.id ? conn.targetContactId : conn.sourceContactId
    return allContacts.find((c) => c.id === otherId)?.name || 'Unknown'
  }

  const hasBirthday = contact.birthday != null
  let birthdaySoon = false
  if (hasBirthday) {
    const bd = new Date(contact.birthday!)
    const now = new Date()
    const thisYear = new Date(now.getFullYear(), bd.getMonth(), bd.getDate())
    if (thisYear < now) thisYear.setFullYear(thisYear.getFullYear() + 1)
    birthdaySoon = (thisYear.getTime() - now.getTime()) / 86400000 <= 7
  }

  return (
    <GlobePanel
      open={open}
      side="right"
      width={PANEL_WIDTH.detail}
      glass="heavy"
      onClose={onClose}
    >
      <div className="relative p-6 overflow-y-auto h-full">
        <div className="absolute top-4 right-4 flex gap-1">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 !text-muted-foreground hover:!text-foreground hover:!bg-accent"
                  onClick={() => onEdit(contact)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Edit</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DialogTrigger asChild>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 !text-muted-foreground hover:!text-red-500 hover:!bg-red-500/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </DialogTrigger>
                </TooltipTrigger>
                <TooltipContent>Delete</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete {contact.name}?</DialogTitle>
                <DialogDescription>
                  This will permanently delete this contact and all associated data.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setConfirmDelete(false)}>Cancel</Button>
                <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
                  {deleting ? 'Deleting...' : 'Delete'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 !text-muted-foreground hover:!text-foreground hover:!bg-accent"
            onClick={(e) => { e.stopPropagation(); onClose() }}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-end gap-4 mb-4 mt-4">
          <Avatar className="h-20 w-20 border-2 border-border shadow-lg">
            <AvatarImage src={contact.photo || undefined} />
            <AvatarFallback className="text-xl bg-orange-500/20 text-orange-600 dark:text-orange-300">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="pb-1">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-semibold text-foreground">{contact.name}</h2>
              {contact.gender && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                  contact.gender === 'male'
                    ? 'bg-blue-500/20 text-blue-600 dark:text-blue-300'
                    : 'bg-pink-500/20 text-pink-600 dark:text-pink-300'
                }`}>
                  {contact.gender === 'male' ? 'M' : 'F'}
                </span>
              )}
              {birthdaySoon && (
                <Cake className="h-4 w-4 text-pink-500 animate-pulse" />
              )}
            </div>
            {contact.role && (
              <p className="text-muted-foreground text-sm">{contact.role}</p>
            )}
            <div className="flex items-center gap-2 mt-1">
              {strengthScore > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-orange-500/15 text-orange-600 dark:text-orange-300 font-medium">
                  {strengthScore}/100
                </span>
              )}
              <span className={`text-xs font-medium ${trajectoryColor(trajectory)}`}>
                {trajectoryIcon(trajectory)} {trajectory}
              </span>
              {contact.communicationStyle ? (
                <Badge className="text-[10px] bg-purple-500/15 text-purple-600 dark:text-purple-300 border-purple-500/20">
                  {contact.communicationStyle}
                </Badge>
              ) : (
                <Badge className="text-[10px] bg-muted/50 text-muted-foreground/30 border-dashed border-border italic">
                  style
                </Badge>
              )}
              {contact.preferredChannel ? (
                <Badge className="text-[10px] bg-sky-500/15 text-sky-600 dark:text-sky-300 border-sky-500/20">
                  {contact.preferredChannel}
                </Badge>
              ) : (
                <Badge className="text-[10px] bg-muted/50 text-muted-foreground/30 border-dashed border-border italic">
                  channel
                </Badge>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {(contact.rating || contact.relationshipType || contact.metAt) && (
            <div className="space-y-2">
              {contact.rating != null && contact.rating > 0 && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center gap-2 w-fit">
                        <StarRating value={contact.rating} size="sm" />
                        <span className="text-xs text-muted-foreground/60">{RATING_LABELS[contact.rating]?.label}</span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-[220px]">
                      <p className="font-medium">{RATING_LABELS[contact.rating]?.label}</p>
                      <p className="text-[10px] opacity-80 mt-0.5">{RATING_LABELS[contact.rating]?.description}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              {contact.relationshipType && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Handshake className="h-4 w-4 text-muted-foreground/60 shrink-0" />
                  <span className="capitalize">{contact.relationshipType}</span>
                </div>
              )}
              {contact.metAt && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CalendarDays className="h-4 w-4 text-muted-foreground/60 shrink-0" />
                  <span>
                    {contact.metAt}
                    {contact.metDate && (
                      <span className="text-muted-foreground/60 ml-1">
                        ({new Date(contact.metDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })})
                      </span>
                    )}
                  </span>
                </div>
              )}
            </div>
          )}

          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <Zap className={`h-3 w-3 ${contact.influenceLevel ? 'text-amber-500' : 'text-muted-foreground/20'}`} />
              <span className="text-[11px] text-muted-foreground w-16">Influence</span>
              <div className="flex-1 h-1.5 rounded-full bg-border overflow-hidden">
                <div className="h-full rounded-full bg-amber-500" style={{ width: `${(contact.influenceLevel || 0) * 10}%` }} />
              </div>
              <span className={`text-[10px] w-6 text-right ${contact.influenceLevel ? 'text-muted-foreground' : 'text-muted-foreground/20'}`}>{contact.influenceLevel || 0}</span>
            </div>
            <div className="flex items-center gap-2">
              <Target className={`h-3 w-3 ${contact.networkReach ? 'text-blue-500' : 'text-muted-foreground/20'}`} />
              <span className="text-[11px] text-muted-foreground w-16">Reach</span>
              <div className="flex-1 h-1.5 rounded-full bg-border overflow-hidden">
                <div className="h-full rounded-full bg-blue-500" style={{ width: `${(contact.networkReach || 0) * 10}%` }} />
              </div>
              <span className={`text-[10px] w-6 text-right ${contact.networkReach ? 'text-muted-foreground' : 'text-muted-foreground/20'}`}>{contact.networkReach || 0}</span>
            </div>
            <div className="flex items-center gap-2">
              <Shield className={`h-3 w-3 ${contact.trustLevel ? 'text-green-500' : 'text-muted-foreground/20'}`} />
              <span className="text-[11px] text-muted-foreground w-16">Trust</span>
              <div className="flex-1 h-1.5 rounded-full bg-border overflow-hidden">
                <div className="h-full rounded-full bg-green-500" style={{ width: `${(contact.trustLevel || 0) * 20}%` }} />
              </div>
              <span className={`text-[10px] w-6 text-right ${contact.trustLevel ? 'text-muted-foreground' : 'text-muted-foreground/20'}`}>{contact.trustLevel || 0}</span>
            </div>
          </div>

          {(contact.company || contact.city || contact.country || contact.address) && (
            <div className="space-y-2">
              {contact.company && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Building2 className="h-4 w-4 text-muted-foreground/60 shrink-0" />
                  <span>{contact.company}</span>
                </div>
              )}
              {(contact.city || contact.country) && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4 text-muted-foreground/60 shrink-0" />
                  <span>{[contact.city, contact.country].filter(Boolean).join(', ')}</span>
                </div>
              )}
              {contact.address && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4 text-muted-foreground/60 shrink-0" />
                  <span>{contact.address}</span>
                </div>
              )}
              {contact.birthday && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Cake className="h-4 w-4 text-muted-foreground/60 shrink-0" />
                  <span>{(() => {
                    const bd = new Date(contact.birthday)
                    if (bd.getFullYear() <= 1904) return bd.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
                    return bd.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
                  })()}</span>
                </div>
              )}
            </div>
          )}

          {(contact.email || contact.phone) && (
            <div className="space-y-2">
              {contact.email && (
                <a
                  href={`mailto:${contact.email}`}
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-orange-500 dark:hover:text-orange-300 transition-colors cursor-pointer"
                >
                  <Mail className="h-4 w-4 text-muted-foreground/60 shrink-0" />
                  <span>{contact.email}</span>
                </a>
              )}
              {contact.phone && (
                <a
                  href={`tel:${contact.phone}`}
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-orange-500 dark:hover:text-orange-300 transition-colors cursor-pointer"
                >
                  <Phone className="h-4 w-4 text-muted-foreground/60 shrink-0" />
                  <span>{contact.phone}</span>
                </a>
              )}
            </div>
          )}

          {(contact.linkedin || contact.twitter || contact.telegram || contact.instagram || contact.github || contact.website) && (
            <div className="flex flex-wrap gap-2">
              {contact.linkedin && <SocialButton href={ensureUrl(contact.linkedin, 'https://linkedin.com/in/')} icon={Linkedin} />}
              {contact.twitter && <SocialButton href={ensureUrl(contact.twitter, 'https://x.com/')} icon={Twitter} />}
              {contact.telegram && <SocialButton href={ensureUrl(contact.telegram, 'https://t.me/')} icon={Send} />}
              {contact.instagram && <SocialButton href={ensureUrl(contact.instagram, 'https://instagram.com/')} icon={Instagram} />}
              {contact.github && <SocialButton href={ensureUrl(contact.github, 'https://github.com/')} icon={Github} />}
              {contact.website && <SocialButton href={ensureUrl(contact.website, 'https://')} icon={Globe} />}
            </div>
          )}

          {contact.tags && contact.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {contact.tags.map((tag) => (
                <Badge key={tag} className="bg-accent text-muted-foreground border-border hover:bg-accent">
                  {tag}
                </Badge>
              ))}
            </div>
          )}

          {(contact.motivations && contact.motivations.length > 0) && (
            <div className="flex flex-wrap gap-1">
              {contact.motivations.map((m) => (
                <Badge key={m} className="text-[10px] bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border-emerald-500/20">
                  {m}
                </Badge>
              ))}
            </div>
          )}

          {contact.secondaryLocations && contact.secondaryLocations.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5 text-muted-foreground/40" />
                <span className="text-xs font-medium text-muted-foreground/60 uppercase tracking-wider">Also in</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {contact.secondaryLocations.map((loc) => (
                  <span
                    key={loc}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs bg-accent/50 text-muted-foreground border border-border"
                  >
                    <MapPin className="h-3 w-3 shrink-0" />
                    {loc}
                  </span>
                ))}
              </div>
            </div>
          )}

          {connectedContacts.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Users className="h-3.5 w-3.5 text-sky-500 dark:text-sky-400/60" />
                <span className="text-xs font-medium text-muted-foreground/60 uppercase tracking-wider">Connected</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {connectedContacts.map((cc) => (
                  <button
                    key={cc.id}
                    onClick={() => onConnectedContactClick?.(cc)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs bg-sky-500/10 text-sky-600 dark:text-sky-300 border border-sky-500/20 hover:bg-sky-500/20 hover:border-sky-400/30 transition-colors cursor-pointer"
                  >
                    <Users className="h-3 w-3 shrink-0" />
                    {cc.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {contact.notes && (
            <div className="rounded-lg bg-accent/50 border border-border p-3 text-sm text-muted-foreground">
              {contact.notes}
            </div>
          )}

          <Separator className="bg-border" />

          <CollapsibleSection
            title="Timeline"
            icon={Clock}
            count={interactions.length}
            expanded={expandedSections.timeline}
            onToggle={() => toggleSection('timeline')}
            action={
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6 !text-muted-foreground hover:!text-foreground"
                onClick={(e) => {
                  e.stopPropagation()
                  if (!showAddInteraction) setExpandedSections((prev) => ({ ...prev, timeline: true }))
                  setShowAddInteraction(!showAddInteraction)
                }}
              >
                {showAddInteraction ? <X className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
              </Button>
            }
          >
            <div
              className="grid transition-[grid-template-rows,opacity] duration-200 ease-[cubic-bezier(0.32,0.72,0,1)]"
              style={{ gridTemplateRows: showAddInteraction ? '1fr' : '0fr', opacity: showAddInteraction ? 1 : 0 }}
            >
              <div className="overflow-hidden">
              <div className="p-2 rounded-lg bg-accent/50 border border-border space-y-2 mb-2">
                <select
                  value={newInteraction.type}
                  onChange={(e) => setNewInteraction((p) => ({ ...p, type: e.target.value }))}
                  className="w-full h-7 text-xs rounded-md border border-input bg-muted/50 px-2 text-foreground cursor-pointer"
                >
                  {INTERACTION_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
                <input
                  type="date"
                  value={newInteraction.date}
                  max={new Date().toISOString().slice(0, 10)}
                  onChange={(e) => setNewInteraction((p) => ({ ...p, date: e.target.value }))}
                  className="w-full h-7 text-xs rounded-md border border-input bg-muted/50 px-2 text-foreground"
                />
                <Input
                  value={newInteraction.notes}
                  onChange={(e) => setNewInteraction((p) => ({ ...p, notes: e.target.value }))}
                  placeholder="Notes..."
                  className="h-7 text-xs bg-muted/50"
                />
                <div className="flex gap-1">
                  <Button size="sm" className="h-6 text-[10px] bg-orange-500 hover:bg-orange-600 text-white" onClick={handleAddInteraction}>Add</Button>
                  <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={() => setShowAddInteraction(false)}>Cancel</Button>
                </div>
              </div>
              </div>
            </div>
            {loadingInteractions ? (
              <div className="space-y-2 py-1">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ) : (
            <div className="space-y-1">
              {interactions.slice(0, 10).map((item) => {
                const Icon = INTERACTION_ICONS[item.type] || MessageSquare
                return (
                  <div key={item.id} className="flex items-start gap-2 py-1">
                    <div className="rounded-md p-1 shrink-0 bg-muted text-muted-foreground">
                      <Icon className="h-3 w-3" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="text-[11px] font-medium text-foreground capitalize">{item.type}</span>
                        <span className="text-[10px] text-muted-foreground/60">{relativeDate(item.date)}</span>
                      </div>
                      {item.notes && <p className="text-[10px] text-muted-foreground truncate">{item.notes}</p>}
                    </div>
                  </div>
                )
              })}
              {interactions.length === 0 && (
                <p className="text-[11px] text-muted-foreground/60 py-1">No interactions yet</p>
              )}
            </div>
            )}
          </CollapsibleSection>

          <CollapsibleSection
            title="Connections"
            icon={Link2}
            count={connections.length}
            expanded={expandedSections.connections}
            onToggle={() => toggleSection('connections')}
            action={
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6 !text-muted-foreground hover:!text-foreground"
                onClick={(e) => {
                  e.stopPropagation()
                  if (!showAddConnection) setExpandedSections((prev) => ({ ...prev, connections: true }))
                  setShowAddConnection(!showAddConnection)
                }}
              >
                {showAddConnection ? <X className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
              </Button>
            }
          >
            <div
              className="grid transition-[grid-template-rows,opacity] duration-200 ease-[cubic-bezier(0.32,0.72,0,1)]"
              style={{ gridTemplateRows: showAddConnection ? '1fr' : '0fr', opacity: showAddConnection ? 1 : 0 }}
            >
              <div className="overflow-hidden">
              <div className="p-2 rounded-lg bg-accent/50 border border-border space-y-2 mb-2">
                <select
                  value={newConnection.targetContactId}
                  onChange={(e) => setNewConnection((p) => ({ ...p, targetContactId: e.target.value }))}
                  className="w-full h-7 text-xs rounded-md border border-input bg-muted/50 px-2 text-foreground cursor-pointer"
                >
                  <option value="">Select contact...</option>
                  {otherContacts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <select
                  value={newConnection.connectionType}
                  onChange={(e) => setNewConnection((p) => ({ ...p, connectionType: e.target.value }))}
                  className="w-full h-7 text-xs rounded-md border border-input bg-muted/50 px-2 text-foreground cursor-pointer"
                >
                  {CONNECTION_TYPES.map((t) => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
                </select>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground">Strength:</span>
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button
                      key={s}
                      onClick={() => setNewConnection((p) => ({ ...p, strength: s }))}
                      className={`w-5 h-5 rounded text-[10px] font-medium cursor-pointer ${
                        s <= newConnection.strength ? 'bg-orange-500 text-white' : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
                <div className="flex gap-1">
                  <Button size="sm" className="h-6 text-[10px] bg-orange-500 hover:bg-orange-600 text-white" onClick={handleAddConnection}>Add</Button>
                  <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={() => setShowAddConnection(false)}>Cancel</Button>
                </div>
              </div>
              </div>
            </div>
            {loadingConnections ? (
              <div className="space-y-2 py-1">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ) : (
            <div className="space-y-1">
              {connections.map((conn) => (
                <div key={conn.id} className="flex items-center gap-2 py-1">
                  <Link2 className="h-3 w-3 text-muted-foreground/60 shrink-0" />
                  <span className="text-[11px] text-foreground font-medium">{getConnectionContactName(conn)}</span>
                  <Badge className="text-[9px] bg-muted text-muted-foreground border-border">
                    {conn.connectionType.replace('_', ' ')}
                  </Badge>
                  <div className="flex gap-0.5 ml-auto">
                    {Array.from({ length: 5 }, (_, i) => (
                      <div key={i} className={`w-1.5 h-1.5 rounded-full ${i < (conn.strength || 0) ? 'bg-orange-500' : 'bg-border'}`} />
                    ))}
                  </div>
                </div>
              ))}
              {connections.length === 0 && (
                <p className="text-[11px] text-muted-foreground/60 py-1">No connections yet</p>
              )}
            </div>
            )}
          </CollapsibleSection>

          <CollapsibleSection
            title="Country Ties"
            icon={Globe}
            count={countryTies.length}
            expanded={expandedSections.countryTies}
            onToggle={() => toggleSection('countryTies')}
            action={
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6 !text-muted-foreground hover:!text-foreground"
                onClick={(e) => {
                  e.stopPropagation()
                  if (!showAddCountryTie) setExpandedSections((prev) => ({ ...prev, countryTies: true }))
                  setShowAddCountryTie(!showAddCountryTie)
                }}
              >
                {showAddCountryTie ? <X className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
              </Button>
            }
          >
            <div
              className="grid transition-[grid-template-rows,opacity] duration-200 ease-[cubic-bezier(0.32,0.72,0,1)]"
              style={{ gridTemplateRows: showAddCountryTie ? '1fr' : '0fr', opacity: showAddCountryTie ? 1 : 0 }}
            >
              <div className="overflow-hidden">
              <div className="p-2 rounded-lg bg-accent/50 border border-border space-y-2 mb-2">
                <Input
                  value={newCountryTie.country}
                  onChange={(e) => setNewCountryTie((p) => ({ ...p, country: e.target.value }))}
                  placeholder="Country name..."
                  className="h-7 text-xs bg-muted/50"
                />
                <Input
                  value={newCountryTie.notes}
                  onChange={(e) => setNewCountryTie((p) => ({ ...p, notes: e.target.value }))}
                  placeholder="Notes (optional)..."
                  className="h-7 text-xs bg-muted/50"
                />
                <div className="flex gap-1">
                  <Button size="sm" className="h-6 text-[10px] bg-purple-500 hover:bg-purple-600 text-white" onClick={handleAddCountryTie}>Add</Button>
                  <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={() => setShowAddCountryTie(false)}>Cancel</Button>
                </div>
              </div>
              </div>
            </div>
            {loadingCountryTies ? (
              <div className="space-y-2 py-1">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ) : (
            <div className="space-y-1">
              {countryTies.map((tie) => (
                <div key={tie.id} className="flex items-center gap-2 py-1 group">
                  <Globe className="h-3 w-3 text-purple-500/60 shrink-0" />
                  <span className="text-[11px] text-foreground font-medium">{tie.country}</span>
                  {tie.notes && <span className="text-[10px] text-muted-foreground truncate flex-1">{tie.notes}</span>}
                  {tie.tags && tie.tags.length > 0 && tie.tags.map((tag) => (
                    <Badge key={tag} className="text-[9px] bg-purple-500/10 text-purple-500 border-purple-500/20">{tag}</Badge>
                  ))}
                  <button
                    onClick={() => handleDeleteCountryTie(tie.id)}
                    className="opacity-0 group-hover:opacity-100 text-muted-foreground/40 hover:text-red-500 transition-opacity ml-auto shrink-0 cursor-pointer"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              {countryTies.length === 0 && (
                <p className="text-[11px] text-muted-foreground/60 py-1">No country ties yet</p>
              )}
            </div>
            )}
          </CollapsibleSection>

          <CollapsibleSection
            title="Favors"
            icon={Gift}
            count={favorsList.length}
            expanded={expandedSections.favors}
            onToggle={() => toggleSection('favors')}
            badge={favorsList.length > 0 ? (
              <span className={`text-[10px] font-medium ${favorNet > 0 ? 'text-green-500' : favorNet < 0 ? 'text-red-400' : 'text-muted-foreground'}`}>
                +{givenCount} / -{receivedCount} = {favorNet >= 0 ? '+' : ''}{favorNet}
              </span>
            ) : undefined}
            action={
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6 !text-muted-foreground hover:!text-foreground"
                onClick={(e) => {
                  e.stopPropagation()
                  if (!showAddFavor) setExpandedSections((prev) => ({ ...prev, favors: true }))
                  setShowAddFavor(!showAddFavor)
                }}
              >
                {showAddFavor ? <X className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
              </Button>
            }
          >
            <div
              className="grid transition-[grid-template-rows,opacity] duration-200 ease-[cubic-bezier(0.32,0.72,0,1)]"
              style={{ gridTemplateRows: showAddFavor ? '1fr' : '0fr', opacity: showAddFavor ? 1 : 0 }}
            >
              <div className="overflow-hidden">
              <div className="p-2 rounded-lg bg-accent/50 border border-border space-y-2 mb-2">
                <div className="flex gap-2">
                  <select
                    value={newFavor.direction}
                    onChange={(e) => setNewFavor((p) => ({ ...p, direction: e.target.value }))}
                    className="w-1/2 h-7 text-xs rounded-md border border-input bg-muted/50 px-2 text-foreground cursor-pointer"
                  >
                    <option value="given">Given</option>
                    <option value="received">Received</option>
                  </select>
                  <select
                    value={newFavor.type}
                    onChange={(e) => setNewFavor((p) => ({ ...p, type: e.target.value }))}
                    className="w-1/2 h-7 text-xs rounded-md border border-input bg-muted/50 px-2 text-foreground cursor-pointer"
                  >
                    {FAVOR_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <Input
                  value={newFavor.description}
                  onChange={(e) => setNewFavor((p) => ({ ...p, description: e.target.value }))}
                  placeholder="Description..."
                  className="h-7 text-xs bg-muted/50"
                />
                <div className="flex gap-1">
                  <Button size="sm" className="h-6 text-[10px] bg-orange-500 hover:bg-orange-600 text-white" onClick={handleAddFavor}>Record</Button>
                  <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={() => setShowAddFavor(false)}>Cancel</Button>
                </div>
              </div>
              </div>
            </div>
            {loadingFavors ? (
              <div className="space-y-2 py-1">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ) : (
            <div className="space-y-1">
              {favorsList.map((f) => (
                <div key={f.id} className="flex items-center gap-2 py-1">
                  <span className={`text-xs font-medium ${f.direction === 'given' ? 'text-green-500' : 'text-red-400'}`}>
                    {f.direction === 'given' ? '+' : '-'}
                  </span>
                  <span className="text-[11px] text-foreground capitalize">{f.type}</span>
                  {f.description && <span className="text-[10px] text-muted-foreground truncate flex-1">{f.description}</span>}
                  <Badge className={`text-[9px] ${
                    f.value === 'critical' ? 'bg-red-500/15 text-red-500' :
                    f.value === 'high' ? 'bg-amber-500/15 text-amber-500' :
                    f.value === 'medium' ? 'bg-blue-500/15 text-blue-500' :
                    'bg-muted text-muted-foreground'
                  } border-0`}>
                    {f.value}
                  </Badge>
                </div>
              ))}
              {favorsList.length === 0 && (
                <p className="text-[11px] text-muted-foreground/60 py-1">No favors recorded</p>
              )}
            </div>
            )}
          </CollapsibleSection>

          <CollapsibleSection
            title="Profile"
            icon={Brain}
            expanded={expandedSections.profile}
            onToggle={() => toggleSection('profile')}
          >
            <div className="space-y-2 text-[11px]">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Response</span>
                {contact.responseSpeed ? (
                  <span className="text-foreground capitalize">{contact.responseSpeed}</span>
                ) : (
                  <span className="text-muted-foreground/30 italic">Not set</span>
                )}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Timezone</span>
                {contact.timezone ? (
                  <span className="text-foreground">{contact.timezone}</span>
                ) : (
                  <span className="text-muted-foreground/30 italic">Not set</span>
                )}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Language</span>
                {contact.language ? (
                  <span className="text-foreground">{contact.language}</span>
                ) : (
                  <span className="text-muted-foreground/30 italic">Not set</span>
                )}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Loyalty</span>
                {contact.loyaltyIndicator ? (
                  <span className="text-foreground capitalize">{contact.loyaltyIndicator}</span>
                ) : (
                  <span className="text-muted-foreground/30 italic">Not set</span>
                )}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Financial</span>
                {contact.financialCapacity ? (
                  <span className="text-foreground capitalize">{contact.financialCapacity}</span>
                ) : (
                  <span className="text-muted-foreground/30 italic">Not set</span>
                )}
              </div>
              <div>
                <span className="text-muted-foreground">Interests</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {contact.personalInterests && contact.personalInterests.length > 0 ? (
                    contact.personalInterests.map((i) => (
                      <Badge key={i} className="text-[9px] bg-accent text-muted-foreground border-border">{i}</Badge>
                    ))
                  ) : (
                    <span className="text-muted-foreground/30 italic">Not set</span>
                  )}
                </div>
              </div>
              <div>
                <span className="text-muted-foreground">Goals</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {contact.professionalGoals && contact.professionalGoals.length > 0 ? (
                    contact.professionalGoals.map((g) => (
                      <Badge key={g} className="text-[9px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border-emerald-500/20">{g}</Badge>
                    ))
                  ) : (
                    <span className="text-muted-foreground/30 italic">Not set</span>
                  )}
                </div>
              </div>
              <div>
                <span className="text-muted-foreground">Pain Points</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {contact.painPoints && contact.painPoints.length > 0 ? (
                    contact.painPoints.map((p) => (
                      <Badge key={p} className="text-[9px] bg-red-500/10 text-red-600 dark:text-red-300 border-red-500/20">{p}</Badge>
                    ))
                  ) : (
                    <span className="text-muted-foreground/30 italic">Not set</span>
                  )}
                </div>
              </div>
              <div>
                <span className="text-muted-foreground">Motivations</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {contact.motivations && contact.motivations.length > 0 ? (
                    contact.motivations.map((m) => (
                      <Badge key={m} className="text-[9px] bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border-emerald-500/20">{m}</Badge>
                    ))
                  ) : (
                    <span className="text-muted-foreground/30 italic">Not set</span>
                  )}
                </div>
              </div>
            </div>
          </CollapsibleSection>
        </div>
      </div>
    </GlobePanel>
  )
}

function ensureUrl(value: string, prefix: string) {
  if (/^https?:\/\//.test(value)) return value
  return prefix + value.replace(/^@/, '')
}

function SocialButton({ href, icon: Icon }: { href: string; icon: React.ComponentType<{ className?: string }> }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="cursor-pointer">
      <Button
        size="icon"
        variant="ghost"
        className="h-9 w-9 !border !border-border !text-muted-foreground !bg-transparent hover:!text-foreground hover:!bg-accent"
      >
        <Icon className="h-4 w-4" />
      </Button>
    </a>
  )
}

function CollapsibleSection({
  title,
  icon: Icon,
  count,
  expanded,
  onToggle,
  action,
  badge,
  children,
}: {
  title: string
  icon: React.ComponentType<{ className?: string }>
  count?: number
  expanded: boolean
  onToggle: () => void
  action?: React.ReactNode
  badge?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        onClick={onToggle}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggle() } }}
        className="w-full flex items-center gap-2 py-1 hover:opacity-80 transition-opacity cursor-pointer"
      >
        <ChevronRight className={`h-3 w-3 text-muted-foreground/60 transition-transform duration-200 ${expanded ? 'rotate-90' : ''}`} />
        <Icon className="h-3.5 w-3.5 text-muted-foreground/60" />
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</span>
        {count !== undefined && count > 0 && (
          <span className="text-[10px] text-muted-foreground/50">{count}</span>
        )}
        {badge}
        <div className="ml-auto" onClick={(e) => e.stopPropagation()}>
          {action}
        </div>
      </div>
      <div
        className="grid transition-[grid-template-rows,opacity] duration-200 ease-[cubic-bezier(0.32,0.72,0,1)]"
        style={{
          gridTemplateRows: expanded ? '1fr' : '0fr',
          opacity: expanded ? 1 : 0,
        }}
      >
        <div className="overflow-hidden">
          <div className="mt-1">{children}</div>
        </div>
      </div>
    </div>
  )
}
