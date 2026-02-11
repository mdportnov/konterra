'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Loader2, Mail, Phone, Linkedin, Twitter, Send, Instagram, Github, Globe,
  User, MapPin, Tag as TagIcon, StickyNote, Handshake, Info, Star,
  ArrowLeft, Brain, Target,
} from 'lucide-react'
import { toast } from 'sonner'
import { StarRating } from '@/components/ui/star-rating'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip'
import { RATING_LABELS } from '@/lib/constants/rating'
import { GenderToggle } from '@/components/ui/gender-toggle'
import GlobePanel from '@/components/globe/GlobePanel'
import { PANEL_WIDTH } from '@/lib/constants/ui'
import {
  COMMUNICATION_STYLES, PREFERRED_CHANNELS, RESPONSE_SPEEDS,
  LOYALTY_INDICATORS, FINANCIAL_CAPACITIES, RELATIONSHIP_TYPES,
} from '@/lib/validation'
import type { Contact, Tag as DbTag } from '@/lib/db/schema'
import {
  SectionLabel, FieldRow, SelectField, RangeField, PrefixInput,
  DatePickerField, CollapsibleSection, TimezoneSelect, LanguageMultiSelect, TagSelector,
} from './contact-edit'

const socialFields = [
  { key: 'email', label: 'Email', icon: Mail, type: 'email', placeholder: 'name@example.com' },
  { key: 'phone', label: 'Phone', icon: Phone, type: 'tel', placeholder: '+1 234 567 8900' },
  { key: 'linkedin', label: 'LinkedIn', icon: Linkedin, type: 'text', placeholder: 'username', prefix: 'linkedin.com/in/' },
  { key: 'twitter', label: 'X / Twitter', icon: Twitter, type: 'text', placeholder: 'handle', prefix: 'x.com/' },
  { key: 'telegram', label: 'Telegram', icon: Send, type: 'text', placeholder: 'username', prefix: '@' },
  { key: 'instagram', label: 'Instagram', icon: Instagram, type: 'text', placeholder: 'username', prefix: 'instagram.com/' },
  { key: 'github', label: 'GitHub', icon: Github, type: 'text', placeholder: 'username', prefix: 'github.com/' },
  { key: 'website', label: 'Website', icon: Globe, type: 'url', placeholder: 'example.com', prefix: 'https://' },
] as const

type FormData = {
  name: string
  photo: string
  company: string
  role: string
  city: string
  country: string
  address: string
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
  timezone: string
  language: string
  birthday: string
  personalInterests: string
  professionalGoals: string
  communicationStyle: string
  preferredChannel: string
  responseSpeed: string
  motivations: string
  painPoints: string
  influenceLevel: number
  networkReach: number
  trustLevel: number
  loyaltyIndicator: string
  financialCapacity: string
}

function toDateStr(d: Date | string | null | undefined): string {
  if (!d) return ''
  const date = d instanceof Date ? d : new Date(d)
  if (isNaN(date.getTime())) return ''
  if (date.getFullYear() < 1900) {
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `0000-${m}-${day}`
  }
  return date.toISOString().slice(0, 10)
}

const prefixMap: Record<string, { prefix: string; urlBase?: string }> = {
  linkedin: { prefix: 'linkedin.com/in/', urlBase: 'https://linkedin.com/in/' },
  twitter: { prefix: 'x.com/', urlBase: 'https://x.com/' },
  telegram: { prefix: '@' },
  instagram: { prefix: 'instagram.com/', urlBase: 'https://instagram.com/' },
  github: { prefix: 'github.com/', urlBase: 'https://github.com/' },
  website: { prefix: 'https://', urlBase: 'https://' },
}

function stripPrefix(key: string, value: string | null | undefined): string {
  if (!value) return ''
  const cfg = prefixMap[key]
  if (!cfg) return value
  if (cfg.urlBase && value.startsWith(cfg.urlBase)) return value.slice(cfg.urlBase.length)
  const httpsVariant = 'https://' + cfg.prefix
  if (cfg.urlBase !== 'https://' && value.startsWith(httpsVariant)) return value.slice(httpsVariant.length)
  if (value.startsWith(cfg.prefix)) return value.slice(cfg.prefix.length)
  if (value.startsWith('http://') || value.startsWith('https://')) {
    const withoutProto = value.replace(/^https?:\/\//, '')
    if (withoutProto.startsWith(cfg.prefix)) return withoutProto.slice(cfg.prefix.length)
  }
  return value
}

function addPrefix(key: string, value: string): string {
  if (!value) return ''
  const cfg = prefixMap[key]
  if (!cfg) return value
  if (cfg.urlBase) return cfg.urlBase + value
  return cfg.prefix + value
}

function buildFormData(contact: Contact | null): FormData {
  return {
    name: contact?.name || '',
    photo: contact?.photo || '',
    company: contact?.company || '',
    role: contact?.role || '',
    city: contact?.city || '',
    country: contact?.country || '',
    address: contact?.address || '',
    email: contact?.email || '',
    phone: contact?.phone || '',
    linkedin: stripPrefix('linkedin', contact?.linkedin),
    twitter: stripPrefix('twitter', contact?.twitter),
    telegram: stripPrefix('telegram', contact?.telegram),
    instagram: stripPrefix('instagram', contact?.instagram),
    github: stripPrefix('github', contact?.github),
    website: stripPrefix('website', contact?.website),
    tags: contact?.tags?.join(', ') || '',
    notes: contact?.notes || '',
    rating: contact?.rating || 0,
    gender: contact?.gender || '',
    relationshipType: contact?.relationshipType || '',
    metAt: contact?.metAt || '',
    metDate: toDateStr(contact?.metDate),
    nextFollowUp: toDateStr(contact?.nextFollowUp),
    timezone: contact?.timezone || '',
    language: contact?.language || '',
    birthday: toDateStr(contact?.birthday),
    personalInterests: contact?.personalInterests?.join(', ') || '',
    professionalGoals: contact?.professionalGoals?.join(', ') || '',
    communicationStyle: contact?.communicationStyle || '',
    preferredChannel: contact?.preferredChannel || '',
    responseSpeed: contact?.responseSpeed || '',
    motivations: contact?.motivations?.join(', ') || '',
    painPoints: contact?.painPoints?.join(', ') || '',
    influenceLevel: contact?.influenceLevel || 0,
    networkReach: contact?.networkReach || 0,
    trustLevel: contact?.trustLevel || 0,
    loyaltyIndicator: contact?.loyaltyIndicator || '',
    financialCapacity: contact?.financialCapacity || '',
  }
}

function splitCommaSeparated(value: string): string[] | undefined {
  const arr = value.split(',').map((s) => s.trim()).filter(Boolean)
  return arr.length > 0 ? arr : undefined
}

interface ContactEditPanelProps {
  contact: Contact | null
  open: boolean
  onSaved: (contact: Contact) => void
  onCancel: () => void
  availableTags?: DbTag[]
  onTagCreated?: (tag: DbTag) => void
}

export default function ContactEditPanel({ contact, open, onSaved, onCancel, availableTags = [], onTagCreated }: ContactEditPanelProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState<FormData>(buildFormData(contact))
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    profile: false,
    psychology: false,
    strategic: false,
  })

  const toggleSection = useCallback((key: string) => {
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }))
  }, [])

  useEffect(() => {
    if (open) setFormData(buildFormData(contact))
  }, [open, contact])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSocialChange = (key: string, raw: string) => {
    setFormData((prev) => ({ ...prev, [key]: stripPrefix(key, raw) }))
  }

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const errors: string[] = []
    if (!formData.name.trim()) errors.push('Name is required')
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) errors.push('Invalid email format')
    if (formData.phone && !/^\+?[\d\s\-().]{7,30}$/.test(formData.phone)) errors.push('Invalid phone format')
    if (formData.photo && !/^https?:\/\/.+/.test(formData.photo)) errors.push('Photo must be a valid URL')
    if (errors.length > 0) {
      errors.forEach(e => toast.error(e))
      setLoading(false)
      return
    }

    try {
      const tags = formData.tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean)

      const body = {
        ...formData,
        linkedin: addPrefix('linkedin', formData.linkedin),
        twitter: addPrefix('twitter', formData.twitter),
        telegram: addPrefix('telegram', formData.telegram),
        instagram: addPrefix('instagram', formData.instagram),
        github: addPrefix('github', formData.github),
        website: addPrefix('website', formData.website),
        tags: tags.length > 0 ? tags : undefined,
        rating: formData.rating || null,
        gender: formData.gender || null,
        relationshipType: formData.relationshipType || null,
        metAt: formData.metAt || null,
        metDate: formData.metDate || null,
        nextFollowUp: formData.nextFollowUp || null,
        timezone: formData.timezone || null,
        language: formData.language || null,
        address: formData.address || null,
        birthday: formData.birthday || null,
        personalInterests: splitCommaSeparated(formData.personalInterests),
        professionalGoals: splitCommaSeparated(formData.professionalGoals),
        communicationStyle: formData.communicationStyle || null,
        preferredChannel: formData.preferredChannel || null,
        responseSpeed: formData.responseSpeed || null,
        motivations: splitCommaSeparated(formData.motivations),
        painPoints: splitCommaSeparated(formData.painPoints),
        influenceLevel: formData.influenceLevel || null,
        networkReach: formData.networkReach || null,
        trustLevel: formData.trustLevel || null,
        loyaltyIndicator: formData.loyaltyIndicator || null,
        financialCapacity: formData.financialCapacity || null,
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FieldRow label="Name *" name="name" value={formData.name} onChange={handleChange} required />
              <FieldRow label="Photo URL" name="photo" value={formData.photo} onChange={handleChange} placeholder="https://..." />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FieldRow label="Company" name="company" value={formData.company} onChange={handleChange} />
              <FieldRow label="Role" name="role" value={formData.role} onChange={handleChange} />
            </div>
          </div>

          <Separator className="bg-border" />

          <div className="space-y-3">
            <SectionLabel icon={MapPin} text="Location" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FieldRow label="City" name="city" value={formData.city} onChange={handleChange} />
              <FieldRow label="Country" name="country" value={formData.country} onChange={handleChange} />
            </div>
            <FieldRow label="Address" name="address" value={formData.address} onChange={handleChange} placeholder="Full address" />
          </div>

          <Separator className="bg-border" />

          <div className="space-y-3">
            <SectionLabel icon={Handshake} text="Relationship" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <SelectField
                label="Type"
                name="relationshipType"
                value={formData.relationshipType}
                onChange={handleSelectChange}
                options={RELATIONSHIP_TYPES}
              />
              <FieldRow label="Met At" name="metAt" value={formData.metAt} onChange={handleChange} placeholder="ETHDenver 2024" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <DatePickerField
                label="Met Date"
                value={formData.metDate}
                onChange={(v) => setFormData((prev) => ({ ...prev, metDate: v }))}
              />
              <DatePickerField
                label="Next Follow-up"
                value={formData.nextFollowUp}
                onChange={(v) => setFormData((prev) => ({ ...prev, nextFollowUp: v }))}
              />
            </div>
          </div>

          <Separator className="bg-border" />

          <div className="space-y-3">
            <SectionLabel icon={Globe} text="Social & Contact" />
            <div className="grid grid-cols-1 gap-3">
              {socialFields.map((f) => (
                <div key={f.key} className="space-y-1.5">
                  <Label htmlFor={f.key} className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <f.icon className="h-3 w-3" />
                    {f.label}
                  </Label>
                  {'prefix' in f && f.prefix ? (
                    <PrefixInput
                      id={f.key}
                      prefix={f.prefix}
                      value={String(formData[f.key as keyof FormData] || '')}
                      onChange={(val) => handleSocialChange(f.key, val)}
                      placeholder={f.placeholder}
                    />
                  ) : (
                    <input
                      id={f.key}
                      name={f.key}
                      type={f.type}
                      value={formData[f.key as keyof FormData] as string}
                      onChange={handleChange}
                      placeholder={f.placeholder}
                      className="flex h-8 w-full rounded-md border border-input bg-muted/50 px-3 py-1 text-sm text-foreground placeholder:text-muted-foreground/40 focus-visible:ring-1 focus-visible:ring-orange-500/30 focus-visible:border-orange-500/50 outline-none"
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          <Separator className="bg-border" />

          <div className="space-y-3">
            <SectionLabel icon={TagIcon} text="Tags" />
            <TagSelector
              value={formData.tags}
              onChange={(v) => setFormData((prev) => ({ ...prev, tags: v }))}
              availableTags={availableTags}
              onTagCreated={onTagCreated}
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

          <Separator className="bg-border" />

          <CollapsibleSection
            title="Profile"
            icon={User}
            expanded={expandedSections.profile}
            onToggle={() => toggleSection('profile')}
          >
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <TimezoneSelect
                  value={formData.timezone}
                  onChange={(v) => setFormData((prev) => ({ ...prev, timezone: v }))}
                />
                <LanguageMultiSelect
                  value={formData.language}
                  onChange={(v) => setFormData((prev) => ({ ...prev, language: v }))}
                />
              </div>
              <DatePickerField
                label="Birthday"
                value={formData.birthday}
                onChange={(v) => setFormData((prev) => ({ ...prev, birthday: v }))}
              />
              <FieldRow
                label="Personal Interests"
                name="personalInterests"
                value={formData.personalInterests}
                onChange={handleChange}
                placeholder="surfing, chess, cooking"
              />
              <FieldRow
                label="Professional Goals"
                name="professionalGoals"
                value={formData.professionalGoals}
                onChange={handleChange}
                placeholder="raise Series A, scale team"
              />
            </div>
          </CollapsibleSection>

          <CollapsibleSection
            title="Psychology"
            icon={Brain}
            expanded={expandedSections.psychology}
            onToggle={() => toggleSection('psychology')}
          >
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <SelectField
                  label="Communication Style"
                  name="communicationStyle"
                  value={formData.communicationStyle}
                  onChange={handleSelectChange}
                  options={COMMUNICATION_STYLES}
                />
                <SelectField
                  label="Preferred Channel"
                  name="preferredChannel"
                  value={formData.preferredChannel}
                  onChange={handleSelectChange}
                  options={PREFERRED_CHANNELS}
                />
              </div>
              <SelectField
                label="Response Speed"
                name="responseSpeed"
                value={formData.responseSpeed}
                onChange={handleSelectChange}
                options={RESPONSE_SPEEDS}
              />
              <FieldRow
                label="Motivations"
                name="motivations"
                value={formData.motivations}
                onChange={handleChange}
                placeholder="wealth, impact, recognition"
              />
              <FieldRow
                label="Pain Points"
                name="painPoints"
                value={formData.painPoints}
                onChange={handleChange}
                placeholder="hiring, fundraising, burnout"
              />
            </div>
          </CollapsibleSection>

          <CollapsibleSection
            title="Strategic Assessment"
            icon={Target}
            expanded={expandedSections.strategic}
            onToggle={() => toggleSection('strategic')}
          >
            <div className="space-y-3">
              <RangeField
                label="Influence Level"
                name="influenceLevel"
                value={formData.influenceLevel}
                min={0}
                max={10}
                onChange={(v) => setFormData((prev) => ({ ...prev, influenceLevel: v }))}
              />
              <RangeField
                label="Network Reach"
                name="networkReach"
                value={formData.networkReach}
                min={0}
                max={10}
                onChange={(v) => setFormData((prev) => ({ ...prev, networkReach: v }))}
              />
              <RangeField
                label="Trust Level"
                name="trustLevel"
                value={formData.trustLevel}
                min={0}
                max={5}
                onChange={(v) => setFormData((prev) => ({ ...prev, trustLevel: v }))}
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <SelectField
                  label="Loyalty Indicator"
                  name="loyaltyIndicator"
                  value={formData.loyaltyIndicator}
                  onChange={handleSelectChange}
                  options={LOYALTY_INDICATORS}
                />
                <SelectField
                  label="Financial Capacity"
                  name="financialCapacity"
                  value={formData.financialCapacity}
                  onChange={handleSelectChange}
                  options={FINANCIAL_CAPACITIES}
                />
              </div>
            </div>
          </CollapsibleSection>
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
