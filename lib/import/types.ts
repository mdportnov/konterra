import type { Contact } from '@/lib/db/schema'

export interface ParsedContact {
  name: string
  email?: string
  phone?: string
  company?: string
  role?: string
  city?: string
  country?: string
  address?: string
  birthday?: string
  website?: string
  notes?: string
  tags?: string[]
  timezone?: string
  gender?: string
  telegram?: string
  linkedin?: string
  twitter?: string
  instagram?: string
  github?: string
  _konterraRef?: string
  photo?: string
  lat?: number
  lng?: number
  meta?: unknown
  secondaryLocations?: string[]
  rating?: number
  relationshipType?: string
  metAt?: string
  metDate?: string
  lastContactedAt?: string
  nextFollowUp?: string
  communicationStyle?: string
  preferredChannel?: string
  responseSpeed?: string
  language?: string
  personalInterests?: string[]
  professionalGoals?: string[]
  painPoints?: string[]
  influenceLevel?: number
  networkReach?: number
  trustLevel?: number
  loyaltyIndicator?: string
  financialCapacity?: string
  motivations?: string[]
  isSelf?: boolean
}

export type DedupConfidence = 'exact' | 'possible'

export interface DedupMatch {
  existingContact: Contact
  confidence: DedupConfidence
  matchField: 'email' | 'phone' | 'name'
}

export type ImportAction = 'skip' | 'merge' | 'create'

export interface ImportEntry {
  parsed: ParsedContact
  match?: DedupMatch
  action: ImportAction
  mergeFields?: Record<string, 'existing' | 'imported'>
}

export interface BulkImportItem {
  action: 'create' | 'update' | 'skip'
  contact: Partial<ParsedContact> & { name: string }
  existingId?: string
}
