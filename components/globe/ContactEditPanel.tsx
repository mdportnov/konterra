'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
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
  Brain,
  Target,
  ChevronRight,
  Search,
  Check,
  ChevronsUpDown,
  X,
} from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { StarRating } from '@/components/ui/star-rating'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { CalendarIcon } from 'lucide-react'
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip'
import { RATING_LABELS } from '@/lib/constants/rating'
import { GenderToggle } from '@/components/ui/gender-toggle'
import GlobePanel from '@/components/globe/GlobePanel'
import { PANEL_WIDTH } from '@/lib/constants/ui'
import type { Contact } from '@/lib/db/schema'

const TIMEZONES = [
  'UTC-12:00', 'UTC-11:00', 'UTC-10:00', 'UTC-09:30', 'UTC-09:00',
  'UTC-08:00', 'UTC-07:00', 'UTC-06:00', 'UTC-05:00', 'UTC-04:00',
  'UTC-03:30', 'UTC-03:00', 'UTC-02:00', 'UTC-01:00', 'UTC+00:00',
  'UTC+01:00', 'UTC+02:00', 'UTC+03:00', 'UTC+03:30', 'UTC+04:00',
  'UTC+04:30', 'UTC+05:00', 'UTC+05:30', 'UTC+05:45', 'UTC+06:00',
  'UTC+06:30', 'UTC+07:00', 'UTC+08:00', 'UTC+08:45', 'UTC+09:00',
  'UTC+09:30', 'UTC+10:00', 'UTC+10:30', 'UTC+11:00', 'UTC+12:00',
  'UTC+12:45', 'UTC+13:00', 'UTC+14:00',
] as const

const TIMEZONE_LABELS: Record<string, string> = {
  'UTC-12:00': 'UTC-12 (Baker Island)',
  'UTC-11:00': 'UTC-11 (Samoa)',
  'UTC-10:00': 'UTC-10 (Hawaii)',
  'UTC-09:00': 'UTC-9 (Alaska)',
  'UTC-08:00': 'UTC-8 (Los Angeles)',
  'UTC-07:00': 'UTC-7 (Denver)',
  'UTC-06:00': 'UTC-6 (Chicago)',
  'UTC-05:00': 'UTC-5 (New York)',
  'UTC-04:00': 'UTC-4 (Santiago)',
  'UTC-03:00': 'UTC-3 (Buenos Aires)',
  'UTC-02:00': 'UTC-2 (South Georgia)',
  'UTC-01:00': 'UTC-1 (Azores)',
  'UTC+00:00': 'UTC+0 (London)',
  'UTC+01:00': 'UTC+1 (Berlin, Paris)',
  'UTC+02:00': 'UTC+2 (Kyiv, Cairo)',
  'UTC+03:00': 'UTC+3 (Moscow, Istanbul)',
  'UTC+03:30': 'UTC+3:30 (Tehran)',
  'UTC+04:00': 'UTC+4 (Dubai)',
  'UTC+04:30': 'UTC+4:30 (Kabul)',
  'UTC+05:00': 'UTC+5 (Karachi)',
  'UTC+05:30': 'UTC+5:30 (Mumbai)',
  'UTC+05:45': 'UTC+5:45 (Kathmandu)',
  'UTC+06:00': 'UTC+6 (Dhaka)',
  'UTC+06:30': 'UTC+6:30 (Yangon)',
  'UTC+07:00': 'UTC+7 (Bangkok)',
  'UTC+08:00': 'UTC+8 (Singapore)',
  'UTC+09:00': 'UTC+9 (Tokyo)',
  'UTC+09:30': 'UTC+9:30 (Adelaide)',
  'UTC+10:00': 'UTC+10 (Sydney)',
  'UTC+11:00': 'UTC+11 (Solomon Is.)',
  'UTC+12:00': 'UTC+12 (Auckland)',
  'UTC+13:00': 'UTC+13 (Samoa)',
  'UTC+14:00': 'UTC+14 (Kiribati)',
}

const LANGUAGES = [
  'Afrikaans', 'Albanian', 'Amharic', 'Arabic', 'Armenian', 'Azerbaijani',
  'Basque', 'Belarusian', 'Bengali', 'Bosnian', 'Bulgarian', 'Burmese',
  'Cantonese', 'Catalan', 'Chinese (Mandarin)', 'Croatian', 'Czech',
  'Danish', 'Dutch', 'English', 'Estonian', 'Filipino', 'Finnish', 'French',
  'Galician', 'Georgian', 'German', 'Greek', 'Gujarati', 'Hausa', 'Hebrew',
  'Hindi', 'Hungarian', 'Icelandic', 'Igbo', 'Indonesian', 'Irish', 'Italian',
  'Japanese', 'Javanese', 'Kannada', 'Kazakh', 'Khmer', 'Korean', 'Kurdish',
  'Kyrgyz', 'Lao', 'Latvian', 'Lithuanian', 'Luxembourgish', 'Macedonian',
  'Malagasy', 'Malay', 'Malayalam', 'Maltese', 'Mandarin', 'Marathi',
  'Mongolian', 'Nepali', 'Norwegian', 'Pashto', 'Persian', 'Polish',
  'Portuguese', 'Punjabi', 'Romanian', 'Russian', 'Serbian', 'Sinhala',
  'Slovak', 'Slovenian', 'Somali', 'Spanish', 'Swahili', 'Swedish',
  'Tagalog', 'Tamil', 'Telugu', 'Thai', 'Tibetan', 'Turkish', 'Ukrainian',
  'Urdu', 'Uzbek', 'Vietnamese', 'Welsh', 'Wolof', 'Xhosa', 'Yoruba', 'Zulu',
] as const

const RELATIONSHIP_TYPES = ['friend', 'business', 'investor', 'conference', 'mentor', 'colleague', 'family', 'dating'] as const

const COMMUNICATION_STYLES = ['direct', 'diplomatic', 'analytical', 'expressive'] as const
const PREFERRED_CHANNELS = ['email', 'call', 'text', 'in-person', 'linkedin'] as const
const RESPONSE_SPEEDS = ['immediate', 'same-day', 'slow', 'unreliable'] as const
const LOYALTY_INDICATORS = ['proven', 'likely', 'neutral', 'unreliable', 'unknown'] as const
const FINANCIAL_CAPACITIES = ['bootstrapper', 'funded', 'wealthy', 'institutional'] as const

interface ContactEditPanelProps {
  contact: Contact | null
  open: boolean
  onSaved: (contact: Contact) => void
  onCancel: () => void
}

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
  return isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10)
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

export default function ContactEditPanel({ contact, open, onSaved, onCancel }: ContactEditPanelProps) {
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
    if (formData.phone && !/^\+?[\d\s\-().]{7,20}$/.test(formData.phone)) errors.push('Invalid phone format')
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
              <div className="space-y-1.5">
                <Label htmlFor="relationshipType" className="text-xs text-muted-foreground">Type</Label>
                <select
                  id="relationshipType"
                  name="relationshipType"
                  value={formData.relationshipType}
                  onChange={(e) => handleSelectChange('relationshipType', e.target.value)}
                  className="flex h-8 w-full rounded-md border border-input bg-muted/50 px-3 py-1 text-sm text-foreground cursor-pointer"
                >
                  <option value="">Select...</option>
                  {RELATIONSHIP_TYPES.map((t) => (
                    <option key={t} value={t} className="bg-popover text-popover-foreground">{t}</option>
                  ))}
                </select>
              </div>
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
                    <Input
                      id={f.key}
                      name={f.key}
                      type={f.type}
                      value={formData[f.key as keyof FormData]}
                      onChange={handleChange}
                      placeholder={f.placeholder}
                      className="bg-muted/50 border-input text-foreground placeholder:text-muted-foreground/40 h-8 text-sm focus-visible:ring-orange-500/30 focus-visible:border-orange-500/50"
                    />
                  )}
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
              <div className="space-y-1.5">
                <Label htmlFor="personalInterests" className="text-xs text-muted-foreground">Personal Interests</Label>
                <Input
                  id="personalInterests"
                  name="personalInterests"
                  value={formData.personalInterests}
                  onChange={handleChange}
                  placeholder="surfing, chess, cooking"
                  className="bg-muted/50 border-input text-foreground placeholder:text-muted-foreground/40 h-8 text-sm focus-visible:ring-orange-500/30 focus-visible:border-orange-500/50"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="professionalGoals" className="text-xs text-muted-foreground">Professional Goals</Label>
                <Input
                  id="professionalGoals"
                  name="professionalGoals"
                  value={formData.professionalGoals}
                  onChange={handleChange}
                  placeholder="raise Series A, scale team"
                  className="bg-muted/50 border-input text-foreground placeholder:text-muted-foreground/40 h-8 text-sm focus-visible:ring-orange-500/30 focus-visible:border-orange-500/50"
                />
              </div>
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <SelectField
                  label="Response Speed"
                  name="responseSpeed"
                  value={formData.responseSpeed}
                  onChange={handleSelectChange}
                  options={RESPONSE_SPEEDS}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="motivations" className="text-xs text-muted-foreground">Motivations</Label>
                <Input
                  id="motivations"
                  name="motivations"
                  value={formData.motivations}
                  onChange={handleChange}
                  placeholder="wealth, impact, recognition"
                  className="bg-muted/50 border-input text-foreground placeholder:text-muted-foreground/40 h-8 text-sm focus-visible:ring-orange-500/30 focus-visible:border-orange-500/50"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="painPoints" className="text-xs text-muted-foreground">Pain Points</Label>
                <Input
                  id="painPoints"
                  name="painPoints"
                  value={formData.painPoints}
                  onChange={handleChange}
                  placeholder="hiring, fundraising, burnout"
                  className="bg-muted/50 border-input text-foreground placeholder:text-muted-foreground/40 h-8 text-sm focus-visible:ring-orange-500/30 focus-visible:border-orange-500/50"
                />
              </div>
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

function SelectField({
  label,
  name,
  value,
  onChange,
  options,
}: {
  label: string
  name: string
  value: string
  onChange: (name: string, value: string) => void
  options: readonly string[]
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={name} className="text-xs text-muted-foreground">{label}</Label>
      <select
        id={name}
        name={name}
        value={value}
        onChange={(e) => onChange(name, e.target.value)}
        className="flex h-8 w-full rounded-md border border-input bg-muted/50 px-3 py-1 text-sm text-foreground cursor-pointer"
      >
        <option value="">Select...</option>
        {options.map((opt) => (
          <option key={opt} value={opt} className="bg-popover text-popover-foreground">{opt}</option>
        ))}
      </select>
    </div>
  )
}

function RangeField({
  label,
  name,
  value,
  min,
  max,
  onChange,
}: {
  label: string
  name: string
  value: number
  min: number
  max: number
  onChange: (value: number) => void
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label htmlFor={name} className="text-xs text-muted-foreground">{label}</Label>
        <span className="text-xs text-muted-foreground tabular-nums">{value}/{max}</span>
      </div>
      <input
        id={name}
        name={name}
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-2 rounded-full appearance-none cursor-pointer bg-muted accent-orange-500"
      />
    </div>
  )
}

function PrefixInput({
  id,
  prefix,
  value,
  onChange,
  placeholder,
}: {
  id: string
  prefix: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
}) {
  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData('text')
    if (pasted && pasted !== value) {
      e.preventDefault()
      onChange(pasted)
    }
  }

  return (
    <div className="flex h-8 w-full rounded-md border border-input bg-muted/50 text-sm focus-within:ring-1 focus-within:ring-orange-500/30 focus-within:border-orange-500/50 overflow-hidden">
      <span className="flex items-center pl-2.5 text-muted-foreground/50 text-sm select-none shrink-0 pointer-events-none">
        {prefix}
      </span>
      <input
        id={id}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onPaste={handlePaste}
        placeholder={placeholder}
        className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground/40 h-full pr-2.5 text-sm outline-none min-w-0"
      />
    </div>
  )
}

function DatePickerField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false)

  const date = value ? new Date(value + 'T00:00:00') : undefined
  const valid = date && !isNaN(date.getTime()) ? date : undefined

  const formatDate = (d: Date) =>
    d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="flex h-8 w-full items-center justify-between rounded-md border border-input bg-muted/50 px-3 text-sm cursor-pointer hover:bg-accent/50 transition-colors"
          >
            <span className={valid ? 'text-foreground' : 'text-muted-foreground/40'}>
              {valid ? formatDate(valid) : 'Pick a date...'}
            </span>
            <CalendarIcon className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0 ml-1" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" side="bottom" align="start">
          <Calendar
            mode="single"
            selected={valid}
            defaultMonth={valid || new Date()}
            onSelect={(d) => {
              if (d) {
                const y = d.getFullYear()
                const m = String(d.getMonth() + 1).padStart(2, '0')
                const day = String(d.getDate()).padStart(2, '0')
                onChange(`${y}-${m}-${day}`)
              } else {
                onChange('')
              }
              setOpen(false)
            }}
            captionLayout="dropdown"
            fromYear={1930}
            toYear={2035}
          />
          {value && (
            <div className="border-t border-border px-3 py-2">
              <button
                type="button"
                onClick={() => { onChange(''); setOpen(false) }}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Clear date
              </button>
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  )
}

function CollapsibleSection({
  title,
  icon: Icon,
  expanded,
  onToggle,
  children,
}: {
  title: string
  icon: React.ComponentType<{ className?: string }>
  expanded: boolean
  onToggle: () => void
  children: React.ReactNode
}) {
  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-2 py-1 hover:opacity-80 transition-opacity cursor-pointer"
      >
        <ChevronRight className={`h-3 w-3 text-muted-foreground/60 transition-transform duration-200 ${expanded ? 'rotate-90' : ''}`} />
        <Icon className="h-3.5 w-3.5 text-muted-foreground/60" />
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</span>
      </button>
      <div
        className="grid transition-[grid-template-rows,opacity] duration-200 ease-[cubic-bezier(0.32,0.72,0,1)]"
        style={{
          gridTemplateRows: expanded ? '1fr' : '0fr',
          opacity: expanded ? 1 : 0,
        }}
      >
        <div className="overflow-hidden">
          <div className="mt-2">{children}</div>
        </div>
      </div>
    </div>
  )
}

function TimezoneSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const filtered = search
    ? TIMEZONES.filter((tz) => {
        const label = TIMEZONE_LABELS[tz] || tz
        return label.toLowerCase().includes(search.toLowerCase()) || tz.toLowerCase().includes(search.toLowerCase())
      })
    : [...TIMEZONES]

  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">Timezone</Label>
      <Popover open={open} onOpenChange={(v) => { setOpen(v); if (v) setTimeout(() => inputRef.current?.focus(), 0) }}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="flex h-8 w-full items-center justify-between rounded-md border border-input bg-muted/50 px-3 text-sm text-foreground cursor-pointer hover:bg-accent/50 transition-colors"
          >
            <span className={value ? 'truncate' : 'text-muted-foreground/40 truncate'}>
              {value ? (TIMEZONE_LABELS[value] || value) : 'Select...'}
            </span>
            <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0 ml-1" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-[260px] p-0" side="bottom" align="start">
          <div className="flex items-center border-b border-border px-2">
            <Search className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
            <input
              ref={inputRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search timezone..."
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/40 h-9 px-2 outline-none"
            />
            {search && (
              <button type="button" onClick={() => setSearch('')} className="text-muted-foreground/50 hover:text-muted-foreground">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <ScrollArea className="h-[200px]">
            <div className="p-1">
              {value && (
                <button
                  type="button"
                  onClick={() => { onChange(''); setOpen(false); setSearch('') }}
                  className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-xs text-muted-foreground hover:bg-accent cursor-pointer"
                >
                  Clear
                </button>
              )}
              {filtered.map((tz) => {
                const label = TIMEZONE_LABELS[tz] || tz
                const selected = value === tz
                return (
                  <button
                    key={tz}
                    type="button"
                    onClick={() => { onChange(tz); setOpen(false); setSearch('') }}
                    className={`flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-xs cursor-pointer transition-colors ${
                      selected ? 'bg-accent text-foreground' : 'text-foreground hover:bg-accent/50'
                    }`}
                  >
                    <Check className={`h-3 w-3 shrink-0 ${selected ? 'opacity-100' : 'opacity-0'}`} />
                    <span className="truncate">{label}</span>
                  </button>
                )
              })}
              {filtered.length === 0 && (
                <p className="text-xs text-muted-foreground/60 text-center py-4">No timezones found</p>
              )}
            </div>
          </ScrollArea>
        </PopoverContent>
      </Popover>
    </div>
  )
}

function LanguageMultiSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const selected = value ? value.split(',').map((s) => s.trim()).filter(Boolean) : []
  const selectedSet = new Set(selected)

  const filtered = search
    ? LANGUAGES.filter((l) => l.toLowerCase().includes(search.toLowerCase()))
    : [...LANGUAGES]

  const toggle = (lang: string) => {
    const next = new Set(selectedSet)
    if (next.has(lang)) next.delete(lang)
    else next.add(lang)
    onChange(Array.from(next).join(', '))
  }

  const remove = (lang: string) => {
    const next = selected.filter((s) => s !== lang)
    onChange(next.join(', '))
  }

  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">Languages</Label>
      <Popover open={open} onOpenChange={(v) => { setOpen(v); if (v) setTimeout(() => inputRef.current?.focus(), 0) }}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="flex h-auto min-h-8 w-full items-center gap-1 flex-wrap rounded-md border border-input bg-muted/50 px-2 py-1 text-sm text-foreground cursor-pointer hover:bg-accent/50 transition-colors"
          >
            {selected.length > 0 ? (
              <>
                {selected.map((lang) => (
                  <Badge
                    key={lang}
                    variant="secondary"
                    className="text-[10px] h-5 gap-0.5 px-1.5 bg-accent"
                  >
                    {lang}
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => { e.stopPropagation(); remove(lang) }}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); remove(lang) } }}
                      className="ml-0.5 hover:text-foreground text-muted-foreground cursor-pointer"
                    >
                      <X className="h-2.5 w-2.5" />
                    </span>
                  </Badge>
                ))}
              </>
            ) : (
              <span className="text-muted-foreground/40 px-1">Select...</span>
            )}
            <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0 ml-auto" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-[220px] p-0" side="bottom" align="start">
          <div className="flex items-center border-b border-border px-2">
            <Search className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
            <input
              ref={inputRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search language..."
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/40 h-9 px-2 outline-none"
            />
            {search && (
              <button type="button" onClick={() => setSearch('')} className="text-muted-foreground/50 hover:text-muted-foreground">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <ScrollArea className="h-[200px]">
            <div className="p-1 space-y-0.5">
              {filtered.map((lang) => (
                <label
                  key={lang}
                  className="flex items-center gap-2 rounded-sm px-2 py-1.5 text-xs cursor-pointer hover:bg-accent/50 transition-colors"
                >
                  <Checkbox
                    checked={selectedSet.has(lang)}
                    onCheckedChange={() => toggle(lang)}
                    className="h-3.5 w-3.5"
                  />
                  <span className="text-foreground">{lang}</span>
                </label>
              ))}
              {filtered.length === 0 && (
                <p className="text-xs text-muted-foreground/60 text-center py-4">No languages found</p>
              )}
            </div>
          </ScrollArea>
        </PopoverContent>
      </Popover>
    </div>
  )
}
