export type ExportFormat = 'konterra' | 'csv' | 'vcard'

export interface KonterraContactRef {
  _ref: string
  name: string
  email?: string | null
  phone?: string | null
  company?: string | null
  role?: string | null
  city?: string | null
  country?: string | null
  address?: string | null
  photo?: string | null
  lat?: number | null
  lng?: number | null
  linkedin?: string | null
  twitter?: string | null
  telegram?: string | null
  instagram?: string | null
  github?: string | null
  website?: string | null
  tags?: string[] | null
  notes?: string | null
  meta?: unknown
  secondaryLocations?: string[] | null
  rating?: number | null
  gender?: string | null
  relationshipType?: string | null
  metAt?: string | null
  metDate?: string | null
  lastContactedAt?: string | null
  nextFollowUp?: string | null
  communicationStyle?: string | null
  preferredChannel?: string | null
  responseSpeed?: string | null
  timezone?: string | null
  language?: string | null
  birthday?: string | null
  personalInterests?: string[] | null
  professionalGoals?: string[] | null
  painPoints?: string[] | null
  influenceLevel?: number | null
  networkReach?: number | null
  trustLevel?: number | null
  loyaltyIndicator?: string | null
  financialCapacity?: string | null
  motivations?: string[] | null
  isSelf?: boolean
}

export interface KonterraConnection {
  source: string
  target: string
  connectionType: string
  strength?: number | null
  bidirectional?: boolean | null
  notes?: string | null
}

export interface KonterraInteraction {
  contact: string
  type: string
  date: string
  location?: string | null
  notes?: string | null
}

export interface KonterraFavor {
  contact: string
  direction: string
  type: string
  description?: string | null
  value: string
  status: string
  date?: string | null
  resolvedAt?: string | null
}

export interface KonterraIntroduction {
  contactA: string
  contactB: string
  initiatedBy: string
  status: string
  date?: string | null
  outcome?: string | null
  notes?: string | null
}

export interface KonterraCountryConnection {
  contact: string
  country: string
  notes?: string | null
  tags?: string[] | null
}

export interface KonterraTag {
  name: string
  color?: string | null
}

export interface KonterraExport {
  version: 1
  exportedAt: string
  contacts: KonterraContactRef[]
  connections: KonterraConnection[]
  interactions: KonterraInteraction[]
  favors: KonterraFavor[]
  introductions: KonterraIntroduction[]
  countryConnections: KonterraCountryConnection[]
  tags: KonterraTag[]
  visitedCountries: string[]
}
