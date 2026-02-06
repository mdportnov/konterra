import type { Contact, Interaction } from './db/schema'

const contacts = new Map<string, Contact>()
const interactionsStore = new Map<string, Interaction>()

const _RELATIONSHIP_TYPES = ['friend', 'business', 'investor', 'conference', 'mentor', 'colleague', 'family', 'dating'] as const

const demoContacts: Omit<Contact, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    userId: 'demo@example.com',
    name: 'John Doe',
    gender: 'male',
    company: 'Google',
    role: 'Software Engineer',
    city: 'San Francisco',
    country: 'USA',
    lat: 37.7749,
    lng: -122.4194,
    email: 'john@google.com',
    phone: '+1 415 555 0100',
    photo: null,
    linkedin: 'https://linkedin.com/in/johndoe',
    twitter: null,
    telegram: null,
    instagram: null,
    github: 'https://github.com/johndoe',
    website: null,
    tags: ['tech', 'friend'],
    notes: 'Met at a conference',
    meta: null,
    rating: 4,
    relationshipType: 'friend',
    metAt: 'Google I/O 2023',
    metDate: new Date('2023-05-10'),
    lastContactedAt: new Date('2025-12-15'),
    nextFollowUp: new Date('2026-03-01'),
    secondaryLocations: ['New York, USA', 'London, UK'],
  },
  {
    userId: 'demo@example.com',
    name: 'Marie Curie',
    gender: 'female',
    company: 'CERN',
    role: 'Researcher',
    city: 'Paris',
    country: 'France',
    lat: 48.8566,
    lng: 2.3522,
    email: 'marie@cern.ch',
    phone: null,
    photo: null,
    linkedin: null,
    twitter: null,
    telegram: null,
    instagram: null,
    github: null,
    website: null,
    tags: ['science', 'friend'],
    notes: null,
    meta: null,
    rating: 5,
    relationshipType: 'colleague',
    metAt: 'CERN Open Days',
    metDate: new Date('2022-09-15'),
    lastContactedAt: new Date('2025-08-20'),
    nextFollowUp: null,
    secondaryLocations: ['Geneva, Switzerland'],
  },
  {
    userId: 'demo@example.com',
    name: 'Satoshi Nakamoto',
    gender: 'male',
    company: 'Bitcoin',
    role: 'Founder',
    city: 'Tokyo',
    country: 'Japan',
    lat: 35.6762,
    lng: 139.6503,
    email: null,
    phone: null,
    photo: null,
    linkedin: null,
    twitter: null,
    telegram: '@satoshi',
    instagram: null,
    github: null,
    website: null,
    tags: ['crypto', 'tech'],
    notes: 'Anonymous',
    meta: null,
    rating: 5,
    relationshipType: 'conference',
    metAt: 'ETHDenver 2024',
    metDate: new Date('2024-02-29'),
    lastContactedAt: new Date('2025-06-01'),
    nextFollowUp: new Date('2026-02-15'),
    secondaryLocations: ['Denver, USA', 'Singapore'],
  },
  {
    userId: 'demo@example.com',
    name: 'Elon Musk',
    gender: 'male',
    company: 'SpaceX',
    role: 'CEO',
    city: 'Austin',
    country: 'USA',
    lat: 30.2672,
    lng: -97.7431,
    email: null,
    phone: null,
    photo: null,
    linkedin: null,
    twitter: 'https://twitter.com/elonmusk',
    telegram: null,
    instagram: 'https://instagram.com/elonmusk',
    github: null,
    website: null,
    tags: ['tech', 'investor'],
    notes: null,
    meta: null,
    rating: 3,
    relationshipType: 'investor',
    metAt: 'Startup pitch event',
    metDate: new Date('2024-06-15'),
    lastContactedAt: new Date('2025-04-10'),
    nextFollowUp: null,
    secondaryLocations: ['Los Angeles, USA', 'Boca Chica, USA'],
  },
  {
    userId: 'demo@example.com',
    name: 'Ada Lovelace',
    gender: 'female',
    company: 'Babbage Ltd',
    role: 'Mathematician',
    city: 'London',
    country: 'UK',
    lat: 51.5074,
    lng: -0.1278,
    email: 'ada@babbage.uk',
    phone: null,
    photo: null,
    linkedin: null,
    twitter: null,
    telegram: null,
    instagram: null,
    github: null,
    website: 'https://ada-lovelace.com',
    tags: ['tech', 'science'],
    notes: 'First programmer',
    meta: null,
    rating: 5,
    relationshipType: 'mentor',
    metAt: 'Royal Society Talk',
    metDate: new Date('2023-03-08'),
    lastContactedAt: new Date('2025-11-05'),
    nextFollowUp: new Date('2026-04-01'),
    secondaryLocations: ['Oxford, UK', 'Cambridge, UK'],
  },
  {
    userId: 'demo@example.com',
    name: 'Carlos Mendez',
    gender: 'male',
    company: 'MercadoLibre',
    role: 'VP Engineering',
    city: 'Buenos Aires',
    country: 'Argentina',
    lat: -34.6037,
    lng: -58.3816,
    email: 'carlos@mercadolibre.com',
    phone: null,
    photo: null,
    linkedin: 'https://linkedin.com/in/carlosmendez',
    twitter: null,
    telegram: null,
    instagram: null,
    github: 'https://github.com/carlosmendez',
    website: null,
    tags: ['tech', 'investor'],
    notes: 'LatAm tech scene',
    meta: null,
    rating: 4,
    relationshipType: 'business',
    metAt: 'Web Summit 2023',
    metDate: new Date('2023-11-14'),
    lastContactedAt: new Date('2025-07-22'),
    nextFollowUp: new Date('2026-01-15'),
    secondaryLocations: ['Mexico City, Mexico'],
  },
  {
    userId: 'demo@example.com',
    name: 'Aisha Patel',
    gender: 'female',
    company: 'Flipkart',
    role: 'Product Lead',
    city: 'Bangalore',
    country: 'India',
    lat: 12.9716,
    lng: 77.5946,
    email: 'aisha@flipkart.com',
    phone: null,
    photo: null,
    linkedin: null,
    twitter: null,
    telegram: '@aishap',
    instagram: 'https://instagram.com/aishapatel',
    github: null,
    website: null,
    tags: ['tech', 'friend'],
    notes: 'Introduced by John',
    meta: null,
    rating: 4,
    relationshipType: 'friend',
    metAt: 'Intro from John Doe',
    metDate: new Date('2024-01-20'),
    lastContactedAt: new Date('2025-10-30'),
    nextFollowUp: null,
    secondaryLocations: ['Mumbai, India', 'San Francisco, USA'],
  },
  {
    userId: 'demo@example.com',
    name: 'Oleksii Koval',
    gender: 'male',
    company: 'Grammarly',
    role: 'Staff Engineer',
    city: 'Kyiv',
    country: 'Ukraine',
    lat: 50.4501,
    lng: 30.5234,
    email: 'oleksii@grammarly.com',
    phone: null,
    photo: null,
    linkedin: null,
    twitter: null,
    telegram: '@oleksii_k',
    instagram: null,
    github: 'https://github.com/oleksii-koval',
    website: null,
    tags: ['tech', 'crypto'],
    notes: null,
    meta: null,
    rating: 3,
    relationshipType: 'colleague',
    metAt: 'Grammarly meetup',
    metDate: new Date('2024-04-12'),
    lastContactedAt: new Date('2025-03-15'),
    nextFollowUp: null,
    secondaryLocations: ['San Francisco, USA'],
  },
  {
    userId: 'demo@example.com',
    name: 'Yuki Tanaka',
    gender: 'female',
    company: 'Sony',
    role: 'Design Director',
    city: 'Osaka',
    country: 'Japan',
    lat: 34.6937,
    lng: 135.5023,
    email: 'yuki@sony.co.jp',
    phone: null,
    photo: null,
    linkedin: null,
    twitter: null,
    telegram: null,
    instagram: 'https://instagram.com/yukitanaka',
    github: null,
    website: 'https://yukitanaka.design',
    tags: ['design', 'friend'],
    notes: null,
    meta: null,
    rating: 4,
    relationshipType: 'friend',
    metAt: 'Design Conference Tokyo',
    metDate: new Date('2023-10-05'),
    lastContactedAt: new Date('2025-09-18'),
    nextFollowUp: new Date('2026-03-15'),
    secondaryLocations: ['Tokyo, Japan'],
  },
  {
    userId: 'demo@example.com',
    name: 'Fatima Al-Rashid',
    gender: 'female',
    company: 'Careem',
    role: 'CTO',
    city: 'Dubai',
    country: 'UAE',
    lat: 25.2048,
    lng: 55.2708,
    email: 'fatima@careem.com',
    phone: null,
    photo: null,
    linkedin: 'https://linkedin.com/in/fatima-alrashid',
    twitter: null,
    telegram: null,
    instagram: null,
    github: null,
    website: 'https://fatima-alrashid.com',
    tags: ['tech', 'investor'],
    notes: 'MENA tech ecosystem',
    meta: null,
    rating: 5,
    relationshipType: 'investor',
    metAt: 'STEP Conference Dubai',
    metDate: new Date('2024-02-14'),
    lastContactedAt: new Date('2025-12-01'),
    nextFollowUp: null,
    secondaryLocations: ['Riyadh, Saudi Arabia', 'London, UK'],
  },
  {
    userId: 'demo@example.com',
    name: 'Lars Eriksson',
    gender: 'male',
    company: 'Spotify',
    role: 'Principal Engineer',
    city: 'Stockholm',
    country: 'Sweden',
    lat: 59.3293,
    lng: 18.0686,
    email: 'lars@spotify.com',
    phone: null,
    photo: null,
    linkedin: null,
    twitter: null,
    telegram: null,
    instagram: null,
    github: 'https://github.com/larseriksson',
    website: null,
    tags: ['tech', 'design'],
    notes: null,
    meta: null,
    rating: 3,
    relationshipType: 'colleague',
    metAt: 'Spotify HQ visit',
    metDate: new Date('2024-08-20'),
    lastContactedAt: new Date('2025-05-10'),
    nextFollowUp: null,
    secondaryLocations: ['Berlin, Germany'],
  },
  {
    userId: 'demo@example.com',
    name: 'Chen Wei',
    gender: 'male',
    company: 'ByteDance',
    role: 'ML Researcher',
    city: 'Beijing',
    country: 'China',
    lat: 39.9042,
    lng: 116.4074,
    email: null,
    phone: null,
    photo: null,
    linkedin: null,
    twitter: null,
    telegram: null,
    instagram: null,
    github: 'https://github.com/chenwei',
    website: null,
    tags: ['tech', 'science'],
    notes: 'AI/ML expert',
    meta: null,
    rating: 4,
    relationshipType: 'conference',
    metAt: 'NeurIPS 2023',
    metDate: new Date('2023-12-11'),
    lastContactedAt: new Date('2025-02-28'),
    nextFollowUp: new Date('2026-01-10'),
    secondaryLocations: ['Shanghai, China', 'San Francisco, USA'],
  },
  {
    userId: 'demo@example.com',
    name: 'Amara Osei',
    gender: 'female',
    company: 'Andela',
    role: 'Engineering Manager',
    city: 'Lagos',
    country: 'Nigeria',
    lat: 6.5244,
    lng: 3.3792,
    email: 'amara@andela.com',
    phone: null,
    photo: null,
    linkedin: null,
    twitter: null,
    telegram: '@amara_osei',
    instagram: null,
    github: null,
    website: null,
    tags: ['tech', 'friend'],
    notes: 'Africa tech community',
    meta: null,
    rating: 4,
    relationshipType: 'friend',
    metAt: 'AfricaTech 2024',
    metDate: new Date('2024-11-13'),
    lastContactedAt: new Date('2025-11-20'),
    nextFollowUp: null,
    secondaryLocations: ['Nairobi, Kenya', 'London, UK'],
  },
  {
    userId: 'demo@example.com',
    name: 'Sofia Rivera',
    gender: 'female',
    company: 'Nubank',
    role: 'Head of Data',
    city: 'Sao Paulo',
    country: 'Brazil',
    lat: -23.5505,
    lng: -46.6333,
    email: 'sofia@nubank.com',
    phone: null,
    photo: null,
    linkedin: null,
    twitter: null,
    telegram: null,
    instagram: null,
    github: null,
    website: 'https://sofiarivera.dev',
    tags: ['crypto', 'investor'],
    notes: 'Fintech connections',
    meta: null,
    rating: 3,
    relationshipType: 'business',
    metAt: 'Fintech Summit Sao Paulo',
    metDate: new Date('2024-07-22'),
    lastContactedAt: new Date('2025-01-15'),
    nextFollowUp: null,
    secondaryLocations: ['Miami, USA'],
  },
  {
    userId: 'demo@example.com',
    name: 'James Cook',
    gender: 'male',
    company: 'Atlassian',
    role: 'VP Product',
    city: 'Sydney',
    country: 'Australia',
    lat: -33.8688,
    lng: 151.2093,
    email: 'james@atlassian.com',
    phone: null,
    photo: null,
    linkedin: 'https://linkedin.com/in/jamescook',
    twitter: null,
    telegram: null,
    instagram: null,
    github: null,
    website: null,
    tags: ['tech', 'design'],
    notes: null,
    meta: null,
    rating: 2,
    relationshipType: 'conference',
    metAt: 'Atlassian Summit',
    metDate: new Date('2024-04-30'),
    lastContactedAt: new Date('2024-08-10'),
    nextFollowUp: null,
    secondaryLocations: ['San Francisco, USA'],
  },
  {
    userId: 'demo@example.com',
    name: 'Sarah Chen',
    gender: 'female',
    company: 'Stripe',
    role: 'Staff Engineer',
    city: 'San Francisco',
    country: 'USA',
    lat: 37.7749,
    lng: -122.4194,
    email: 'sarah@stripe.com',
    phone: null,
    photo: null,
    linkedin: 'https://linkedin.com/in/sarahchen',
    twitter: null,
    telegram: null,
    instagram: null,
    github: 'https://github.com/sarahchen',
    website: null,
    tags: ['tech', 'friend'],
    notes: 'Stripe payments expert',
    meta: null,
    rating: 5,
    relationshipType: 'friend',
    metAt: 'Stripe Sessions 2023',
    metDate: new Date('2023-04-26'),
    lastContactedAt: new Date('2026-01-05'),
    nextFollowUp: null,
    secondaryLocations: ['New York, USA'],
  },
  {
    userId: 'demo@example.com',
    name: 'Mike Rodriguez',
    gender: 'male',
    company: 'Figma',
    role: 'Design Engineer',
    city: 'San Francisco',
    country: 'USA',
    lat: 37.7749,
    lng: -122.4194,
    email: 'mike@figma.com',
    phone: null,
    photo: null,
    linkedin: null,
    twitter: null,
    telegram: null,
    instagram: 'https://instagram.com/mikerod',
    github: 'https://github.com/mikerodriguez',
    website: 'https://mikerod.design',
    tags: ['design', 'tech'],
    notes: null,
    meta: null,
    rating: 3,
    relationshipType: 'colleague',
    metAt: 'Figma Config',
    metDate: new Date('2024-06-26'),
    lastContactedAt: new Date('2025-10-01'),
    nextFollowUp: null,
    secondaryLocations: null,
  },
  {
    userId: 'demo@example.com',
    name: 'Kenji Yamamoto',
    gender: 'male',
    company: 'LINE',
    role: 'Backend Lead',
    city: 'Tokyo',
    country: 'Japan',
    lat: 35.6762,
    lng: 139.6503,
    email: 'kenji@line.me',
    phone: null,
    photo: null,
    linkedin: null,
    twitter: null,
    telegram: '@kenji_y',
    instagram: null,
    github: 'https://github.com/kenjiy',
    website: null,
    tags: ['tech', 'crypto'],
    notes: 'Met at DevCon Tokyo',
    meta: null,
    rating: 4,
    relationshipType: 'conference',
    metAt: 'DevCon Tokyo 2024',
    metDate: new Date('2024-03-15'),
    lastContactedAt: new Date('2025-08-05'),
    nextFollowUp: new Date('2026-02-28'),
    secondaryLocations: ['Osaka, Japan'],
  },
]

let initialized = false

const _INTERACTION_TYPES = ['meeting', 'call', 'message', 'email', 'event', 'introduction', 'deal', 'note'] as const

const demoInteractionTemplates: { type: string; notes: string }[] = [
  { type: 'meeting', notes: 'Coffee catch-up' },
  { type: 'call', notes: 'Quick sync about project' },
  { type: 'message', notes: 'Shared article' },
  { type: 'email', notes: 'Follow-up from meeting' },
  { type: 'event', notes: 'Conference panel together' },
  { type: 'introduction', notes: 'Introduced to new contact' },
  { type: 'call', notes: 'Brainstormed ideas' },
  { type: 'meeting', notes: 'Lunch meeting downtown' },
  { type: 'email', notes: 'Sent proposal doc' },
  { type: 'message', notes: 'Congratulated on new role' },
  { type: 'deal', notes: 'Partnership discussion' },
  { type: 'note', notes: 'Remembered birthday' },
  { type: 'meeting', notes: 'Strategy session' },
  { type: 'call', notes: 'Discussed market trends' },
  { type: 'event', notes: 'Attended product launch' },
  { type: 'email', notes: 'Shared quarterly update' },
  { type: 'message', notes: 'Planned next meetup' },
  { type: 'introduction', notes: 'Connected with investor' },
  { type: 'call', notes: 'Technical deep dive' },
  { type: 'meeting', notes: 'Team dinner' },
  { type: 'email', notes: 'Sent whitepaper' },
  { type: 'note', notes: 'Added to VIP list' },
  { type: 'message', notes: 'Shared job posting' },
  { type: 'call', notes: 'Quarterly check-in' },
  { type: 'meeting', notes: 'Demo session' },
  { type: 'event', notes: 'Hackathon co-sponsor' },
  { type: 'email', notes: 'NDA exchange' },
  { type: 'introduction', notes: 'Warm intro to CTO' },
  { type: 'call', notes: 'Onboarding walkthrough' },
  { type: 'meeting', notes: 'Wrapped up project review' },
]

function initDemoData() {
  if (initialized) return
  const contactIds: string[] = []
  demoContacts.forEach((c) => {
    const id = crypto.randomUUID()
    contactIds.push(id)
    contacts.set(id, {
      ...c,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as Contact)
  })

  demoInteractionTemplates.forEach((tmpl, i) => {
    const contactId = contactIds[i % contactIds.length]
    const monthsAgo = Math.floor(i * 0.4)
    const date = new Date()
    date.setMonth(date.getMonth() - monthsAgo)
    date.setDate(Math.max(1, date.getDate() - (i * 3) % 28))

    const id = crypto.randomUUID()
    interactionsStore.set(id, {
      id,
      contactId,
      type: tmpl.type,
      date,
      location: null,
      notes: tmpl.notes,
      createdAt: new Date(),
    })
  })

  initialized = true
}

export function getContacts(userId: string): Contact[] {
  initDemoData()
  return Array.from(contacts.values())
    .filter((c) => c.userId === userId || c.userId === 'demo@example.com')
    .sort((a, b) => (b.updatedAt?.getTime() || 0) - (a.updatedAt?.getTime() || 0))
}

export function getContact(id: string, userId: string): Contact | undefined {
  initDemoData()
  const contact = contacts.get(id)
  if (contact && (contact.userId === userId || contact.userId === 'demo@example.com')) {
    return contact
  }
  return undefined
}

export function createContact(data: Omit<Contact, 'id' | 'createdAt' | 'updatedAt'>): Contact {
  const id = crypto.randomUUID()
  const contact: Contact = {
    ...data,
    id,
    createdAt: new Date(),
    updatedAt: new Date(),
  }
  contacts.set(id, contact)
  return contact
}

export function updateContact(id: string, userId: string, data: Partial<Contact>): Contact | undefined {
  const contact = getContact(id, userId)
  if (!contact) return undefined
  const updated = { ...contact, ...data, updatedAt: new Date() }
  contacts.set(id, updated)
  return updated
}

export function deleteContactById(id: string, userId: string): boolean {
  const contact = getContact(id, userId)
  if (!contact) return false
  contacts.delete(id)
  return true
}

export function getInteractions(contactId: string): Interaction[] {
  initDemoData()
  return Array.from(interactionsStore.values())
    .filter((i) => i.contactId === contactId)
    .sort((a, b) => b.date.getTime() - a.date.getTime())
}

export function getRecentInteractions(userId: string, limit: number = 15): (Interaction & { contactName: string })[] {
  initDemoData()
  const userContactIds = new Set(
    Array.from(contacts.values())
      .filter((c) => c.userId === userId || c.userId === 'demo@example.com')
      .map((c) => c.id)
  )
  const contactNameMap = new Map(
    Array.from(contacts.values()).map((c) => [c.id, c.name])
  )
  return Array.from(interactionsStore.values())
    .filter((i) => userContactIds.has(i.contactId))
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .slice(0, limit)
    .map((i) => ({ ...i, contactName: contactNameMap.get(i.contactId) || 'Unknown' }))
}

export function createInteraction(data: Omit<Interaction, 'id' | 'createdAt'>): Interaction {
  const id = crypto.randomUUID()
  const interaction: Interaction = {
    ...data,
    id,
    createdAt: new Date(),
  }
  interactionsStore.set(id, interaction)

  const contact = contacts.get(data.contactId)
  if (contact) {
    const current = contact.lastContactedAt?.getTime() || 0
    if (data.date.getTime() > current) {
      contacts.set(contact.id, { ...contact, lastContactedAt: data.date, updatedAt: new Date() })
    }
  }

  return interaction
}

export function deleteInteraction(id: string): boolean {
  return interactionsStore.delete(id)
}

const usersStore = new Map<string, { name: string; image: string | null }>()

export function getUser(userId: string): { name: string; image: string | null } | undefined {
  return usersStore.get(userId)
}

export function updateUser(userId: string, data: { name?: string; image?: string | null }): { name: string; image: string | null } {
  const existing = usersStore.get(userId)
  const updated = {
    name: data.name ?? existing?.name ?? '',
    image: data.image !== undefined ? data.image : (existing?.image ?? null),
  }
  usersStore.set(userId, updated)
  return updated
}

const visitedCountriesStore = new Map<string, Set<string>>()

export function getVisitedCountries(userId: string): string[] {
  return Array.from(visitedCountriesStore.get(userId) || [])
}

export function addVisitedCountry(userId: string, country: string): string[] {
  if (!visitedCountriesStore.has(userId)) visitedCountriesStore.set(userId, new Set())
  visitedCountriesStore.get(userId)!.add(country)
  return getVisitedCountries(userId)
}

export function removeVisitedCountry(userId: string, country: string): string[] {
  visitedCountriesStore.get(userId)?.delete(country)
  return getVisitedCountries(userId)
}

export function setVisitedCountries(userId: string, countries: string[]): string[] {
  visitedCountriesStore.set(userId, new Set(countries))
  return getVisitedCountries(userId)
}
