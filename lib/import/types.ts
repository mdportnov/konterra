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
