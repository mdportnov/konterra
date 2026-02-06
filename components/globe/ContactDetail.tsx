'use client'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Mail, Phone, Linkedin, Twitter, Send, Instagram, Github, Globe, MapPin, Building2, Pencil, X, CalendarDays, Users, Handshake } from 'lucide-react'
import GlobePanel from '@/components/globe/GlobePanel'
import { StarRating } from '@/components/ui/star-rating'
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip'
import { PANEL_WIDTH } from '@/lib/constants/ui'
import { RATING_LABELS } from '@/lib/constants/rating'
import type { Contact } from '@/lib/db/schema'

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
  connectedContacts?: ConnectedContact[]
  onConnectedContactClick?: (c: ConnectedContact) => void
}

export default function ContactDetail({
  contact,
  open,
  onClose,
  onEdit,
  connectedContacts = [],
  onConnectedContactClick,
}: ContactDetailProps) {
  if (!contact) return null

  const initials = contact.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <GlobePanel
      open={open}
      side="right"
      width={PANEL_WIDTH.detail}
      glass="heavy"
      onClose={onClose}
    >
      <div className="relative p-6">
        <div className="absolute top-4 right-4 flex gap-1">
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 !text-muted-foreground hover:!text-foreground hover:!bg-accent"
            onClick={() => onEdit(contact)}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 !text-muted-foreground hover:!text-foreground hover:!bg-accent"
            onClick={(e) => { e.stopPropagation(); onClose() }}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-end gap-4 mb-6 mt-4">
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
            </div>
            {contact.role && (
              <p className="text-muted-foreground text-sm">{contact.role}</p>
            )}
          </div>
        </div>

        <div className="space-y-5">
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

          {(contact.company || contact.city || contact.country) && (
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
            </div>
          )}

          {(contact.email || contact.phone) && (
            <div className="space-y-2">
              {contact.email && (
                <a
                  href={`mailto:${contact.email}`}
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-orange-500 dark:hover:text-orange-300 transition-colors"
                >
                  <Mail className="h-4 w-4 text-muted-foreground/60 shrink-0" />
                  <span>{contact.email}</span>
                </a>
              )}
              {contact.phone && (
                <a
                  href={`tel:${contact.phone}`}
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-orange-500 dark:hover:text-orange-300 transition-colors"
                >
                  <Phone className="h-4 w-4 text-muted-foreground/60 shrink-0" />
                  <span>{contact.phone}</span>
                </a>
              )}
            </div>
          )}

          {(contact.linkedin || contact.twitter || contact.telegram || contact.instagram || contact.github || contact.website) && (
            <div className="flex flex-wrap gap-2">
              {contact.linkedin && (
                <SocialButton href={contact.linkedin} icon={Linkedin} />
              )}
              {contact.twitter && (
                <SocialButton href={contact.twitter} icon={Twitter} />
              )}
              {contact.telegram && (
                <SocialButton href={`https://t.me/${contact.telegram.replace('@', '')}`} icon={Send} />
              )}
              {contact.instagram && (
                <SocialButton href={contact.instagram} icon={Instagram} />
              )}
              {contact.github && (
                <SocialButton href={contact.github} icon={Github} />
              )}
              {contact.website && (
                <SocialButton href={contact.website} icon={Globe} />
              )}
            </div>
          )}

          {contact.tags && contact.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {contact.tags.map((tag) => (
                <Badge
                  key={tag}
                  className="bg-accent text-muted-foreground border-border hover:bg-accent"
                >
                  {tag}
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
        </div>
      </div>
    </GlobePanel>
  )
}

function SocialButton({ href, icon: Icon }: { href: string; icon: React.ComponentType<{ className?: string }> }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer">
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
