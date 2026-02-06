'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Loader2,
  Mail,
  Phone,
  Linkedin,
  Twitter,
  Send,
  Instagram,
  Github,
  Globe,
  User,
  MapPin,
  Tag,
  StickyNote,
  Handshake,
  Info,
  Star,
  ArrowLeft,
} from 'lucide-react'
import { toast } from 'sonner'
import { StarRating } from '@/components/ui/star-rating'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip'
import { RATING_LABELS } from '@/lib/constants/rating'
import { GenderToggle } from '@/components/ui/gender-toggle'
import GlobePanel from '@/components/globe/GlobePanel'
import { PANEL_WIDTH } from '@/lib/constants/ui'
import type { Contact } from '@/lib/db/schema'

const RELATIONSHIP_TYPES = ['friend', 'business', 'investor', 'conference', 'mentor', 'colleague', 'family', 'dating'] as const

interface ContactEditPanelProps {
  contact: Contact | null
  open: boolean
  onSaved: (contact: Contact) => void
  onCancel: () => void
}

const socialFields = [
  { key: 'email', label: 'Email', icon: Mail, type: 'email', placeholder: 'name@example.com' },
  { key: 'phone', label: 'Phone', icon: Phone, type: 'tel', placeholder: '+1 234 567 8900' },
  { key: 'linkedin', label: 'LinkedIn', icon: Linkedin, type: 'url', placeholder: 'https://linkedin.com/in/...' },
  { key: 'twitter', label: 'X / Twitter', icon: Twitter, type: 'url', placeholder: 'https://x.com/...' },
  { key: 'telegram', label: 'Telegram', icon: Send, type: 'text', placeholder: '@username' },
  { key: 'instagram', label: 'Instagram', icon: Instagram, type: 'url', placeholder: 'https://instagram.com/...' },
  { key: 'github', label: 'GitHub', icon: Github, type: 'url', placeholder: 'https://github.com/...' },
  { key: 'website', label: 'Website', icon: Globe, type: 'url', placeholder: 'https://...' },
] as const

type FormData = {
  name: string
  photo: string
  company: string
  role: string
  city: string
  country: string
  email: string
  phone: string
  linkedin: string
  twitter: string
  telegram: string
  instagram: string
  github: string
  website: string
  tags: string
  notes: string
  rating: number
  gender: string
  relationshipType: string
  metAt: string
  metDate: string
  nextFollowUp: string
}

function toDateStr(d: Date | string | null | undefined): string {
  if (!d) return ''
  const date = d instanceof Date ? d : new Date(d)
  return isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10)
}

function buildFormData(contact: Contact | null): FormData {
  return {
    name: contact?.name || '',
    photo: contact?.photo || '',
    company: contact?.company || '',
    role: contact?.role || '',
    city: contact?.city || '',
    country: contact?.country || '',
    email: contact?.email || '',
    phone: contact?.phone || '',
    linkedin: contact?.linkedin || '',
    twitter: contact?.twitter || '',
    telegram: contact?.telegram || '',
    instagram: contact?.instagram || '',
    github: contact?.github || '',
    website: contact?.website || '',
    tags: contact?.tags?.join(', ') || '',
    notes: contact?.notes || '',
    rating: contact?.rating || 0,
    gender: contact?.gender || '',
    relationshipType: contact?.relationshipType || '',
    metAt: contact?.metAt || '',
    metDate: toDateStr(contact?.metDate),
    nextFollowUp: toDateStr(contact?.nextFollowUp),
  }
}

export default function ContactEditPanel({ contact, open, onSaved, onCancel }: ContactEditPanelProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState<FormData>(buildFormData(contact))

  useEffect(() => {
    if (open) setFormData(buildFormData(contact))
  }, [open, contact])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const tags = formData.tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean)

      const body = {
        ...formData,
        tags: tags.length > 0 ? tags : undefined,
        rating: formData.rating || null,
        gender: formData.gender || null,
        relationshipType: formData.relationshipType || null,
        metAt: formData.metAt || null,
        metDate: formData.metDate || null,
        nextFollowUp: formData.nextFollowUp || null,
      }
      const isEdit = !!contact
      const url = isEdit ? `/api/contacts/${contact.id}` : '/api/contacts'
      const method = isEdit ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (res.ok) {
        const saved = await res.json()
        toast.success(isEdit ? 'Contact updated' : 'Contact created')
        onSaved(saved)
      } else {
        toast.error('Failed to save contact')
      }
    } catch {
      toast.error('Failed to save contact')
    } finally {
      setLoading(false)
    }
  }

  return (
    <GlobePanel
      open={open}
      side="right"
      width={PANEL_WIDTH.detail}
      glass="heavy"
      onClose={onCancel}
    >
      <div className="flex items-center gap-2 px-4 pt-4 pb-2">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 !text-muted-foreground hover:!text-foreground hover:!bg-accent"
                onClick={onCancel}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Back</TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <h2 className="text-base font-semibold text-foreground">
          {contact ? 'Edit Contact' : 'New Contact'}
        </h2>
      </div>
      <p className="px-4 pb-2 text-xs text-muted-foreground">
        {contact ? 'Update contact details below.' : 'Fill in the details for your new contact.'}
      </p>

      <ScrollArea className="flex-1">
        <form id="contact-edit-panel-form" onSubmit={handleSubmit} className="px-4 py-3 space-y-5">
          <div className="space-y-3">
            <SectionLabel icon={User} text="Basic Info" />
            <div className="grid grid-cols-2 gap-3">
              <FieldRow label="Name *" name="name" value={formData.name} onChange={handleChange} required />
              <FieldRow label="Photo URL" name="photo" value={formData.photo} onChange={handleChange} placeholder="https://..." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FieldRow label="Company" name="company" value={formData.company} onChange={handleChange} />
              <FieldRow label="Role" name="role" value={formData.role} onChange={handleChange} />
            </div>
          </div>

          <Separator className="bg-border" />

          <div className="space-y-3">
            <SectionLabel icon={MapPin} text="Location" />
            <div className="grid grid-cols-2 gap-3">
              <FieldRow label="City" name="city" value={formData.city} onChange={handleChange} />
              <FieldRow label="Country" name="country" value={formData.country} onChange={handleChange} />
            </div>
          </div>

          <Separator className="bg-border" />

          <div className="space-y-3">
            <SectionLabel icon={Handshake} text="Relationship" />
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <div className="flex items-center gap-1">
                  <Label className="text-xs text-muted-foreground">Rating</Label>
                  <Popover>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <PopoverTrigger asChild>
                            <button type="button" className="text-muted-foreground/50 hover:text-muted-foreground transition-colors">
                              <Info className="h-3 w-3" />
                            </button>
                          </PopoverTrigger>
                        </TooltipTrigger>
                        <TooltipContent>Rating guide</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <PopoverContent className="w-72 p-3 space-y-2" side="top" align="start">
                      <p className="text-xs font-medium text-foreground mb-2">Connection Strength</p>
                      {([1, 2, 3, 4, 5] as const).map((level) => (
                        <div key={level} className="flex gap-2">
                          <div className="flex items-center gap-0.5 shrink-0 pt-0.5">
                            {Array.from({ length: 5 }, (_, i) => (
                              <Star
                                key={i}
                                className={`h-2.5 w-2.5 ${i < level ? 'fill-orange-400 text-orange-400' : 'text-muted-foreground/20'}`}
                              />
                            ))}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-foreground leading-tight">{RATING_LABELS[level].label}</p>
                            <p className="text-[10px] text-muted-foreground leading-snug">{RATING_LABELS[level].description}</p>
                          </div>
                        </div>
                      ))}
                    </PopoverContent>
                  </Popover>
                </div>
                <StarRating
                  value={formData.rating}
                  onChange={(v) => setFormData((prev) => ({ ...prev, rating: v }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Gender</Label>
                <GenderToggle
                  value={formData.gender}
                  onChange={(v) => setFormData((prev) => ({ ...prev, gender: v }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="relationshipType" className="text-xs text-muted-foreground">Type</Label>
                <select
                  id="relationshipType"
                  name="relationshipType"
                  value={formData.relationshipType}
                  onChange={(e) => setFormData((prev) => ({ ...prev, relationshipType: e.target.value }))}
                  className="flex h-8 w-full rounded-md border border-input bg-muted/50 px-3 py-1 text-sm text-foreground"
                >
                  <option value="">Select...</option>
                  {RELATIONSHIP_TYPES.map((t) => (
                    <option key={t} value={t} className="bg-popover text-popover-foreground">{t}</option>
                  ))}
                </select>
              </div>
              <FieldRow label="Met At" name="metAt" value={formData.metAt} onChange={handleChange} placeholder="ETHDenver 2024" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FieldRow label="Met Date" name="metDate" value={formData.metDate} onChange={handleChange} type="date" />
              <FieldRow label="Next Follow-up" name="nextFollowUp" value={formData.nextFollowUp} onChange={handleChange} type="date" />
            </div>
          </div>

          <Separator className="bg-border" />

          <div className="space-y-3">
            <SectionLabel icon={Globe} text="Social & Contact" />
            <div className="grid grid-cols-2 gap-3">
              {socialFields.map((f) => (
                <div key={f.key} className="space-y-1.5">
                  <Label htmlFor={f.key} className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <f.icon className="h-3 w-3" />
                    {f.label}
                  </Label>
                  <Input
                    id={f.key}
                    name={f.key}
                    type={f.type}
                    value={formData[f.key as keyof FormData]}
                    onChange={handleChange}
                    placeholder={f.placeholder}
                    className="bg-muted/50 border-input text-foreground placeholder:text-muted-foreground/40 h-8 text-sm focus-visible:ring-orange-500/30 focus-visible:border-orange-500/50"
                  />
                </div>
              ))}
            </div>
          </div>

          <Separator className="bg-border" />

          <div className="space-y-3">
            <SectionLabel icon={Tag} text="Tags" />
            <Input
              name="tags"
              value={formData.tags}
              onChange={handleChange}
              placeholder="friend, colleague, investor"
              className="bg-muted/50 border-input text-foreground placeholder:text-muted-foreground/40 h-8 text-sm focus-visible:ring-orange-500/30 focus-visible:border-orange-500/50"
            />
          </div>

          <div className="space-y-3">
            <SectionLabel icon={StickyNote} text="Notes" />
            <Textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows={3}
              className="bg-muted/50 border-input text-foreground placeholder:text-muted-foreground/40 text-sm resize-none focus-visible:ring-orange-500/30 focus-visible:border-orange-500/50"
            />
          </div>
        </form>
      </ScrollArea>

      <div className="flex justify-end gap-2 px-4 py-3 border-t border-border">
        <Button
          type="button"
          variant="ghost"
          onClick={onCancel}
          className="text-muted-foreground hover:text-foreground hover:bg-muted"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          form="contact-edit-panel-form"
          disabled={loading}
          className="bg-orange-500 hover:bg-orange-600 text-white"
        >
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {contact ? 'Save' : 'Create'}
        </Button>
      </div>
    </GlobePanel>
  )
}

function SectionLabel({ icon: Icon, text }: { icon: React.ComponentType<{ className?: string }>; text: string }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="h-3.5 w-3.5 text-muted-foreground/60" />
      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{text}</span>
    </div>
  )
}

function FieldRow({
  label,
  name,
  value,
  onChange,
  placeholder,
  required,
  type,
}: {
  label: string
  name: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  placeholder?: string
  required?: boolean
  type?: string
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={name} className="text-xs text-muted-foreground">{label}</Label>
      <Input
        id={name}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        className="bg-muted/50 border-input text-foreground placeholder:text-muted-foreground/40 h-8 text-sm focus-visible:ring-orange-500/30 focus-visible:border-orange-500/50"
      />
    </div>
  )
}
