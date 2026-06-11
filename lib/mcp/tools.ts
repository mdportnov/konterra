import { z } from 'zod'
import {
  getAllContactsByUserId,
  getContactById,
  createContact,
  updateContact,
  deleteContact,
  getInteractionsByContactId,
  createInteraction,
  getRecentInteractions,
  getFavorsByContactId,
  createFavor,
  getConnectionsByContactId,
  getCountryConnectionsByContactId,
  getTripsByUserId,
  createTrip,
  deleteTrip,
  getVisitedCountries,
  addVisitedCountry,
  removeVisitedCountry,
  getWishlistCountries,
  addWishlistCountry,
  removeWishlistCountryByName,
  getAllFavorsByUserId,
} from '@/lib/db/queries'
import {
  validateContact,
  INTERACTION_TYPES,
  FAVOR_DIRECTIONS,
  FAVOR_TYPES,
  FAVOR_VALUES,
  RELATIONSHIP_TYPES,
  WISHLIST_PRIORITIES,
  MAX_NOTES_LENGTH,
} from '@/lib/validation'
import type { Contact } from '@/lib/db/schema'
import type { McpScope } from './scopes'

export type ToolResult = { data: unknown } | { error: string }

export interface McpToolDef {
  name: string
  title: string
  description: string
  scope: McpScope
  inputSchema: z.ZodObject<z.ZodRawShape>
  handler: (userId: string, args: Record<string, unknown>) => Promise<ToolResult>
}

const ok = (data: unknown): ToolResult => ({ data })
const err = (error: string): ToolResult => ({ error })

function compactContact(c: Contact) {
  return {
    id: c.id,
    name: c.name,
    company: c.company,
    role: c.role,
    city: c.city,
    country: c.country,
    email: c.email,
    phone: c.phone,
    tags: c.tags,
    relationshipType: c.relationshipType,
    rating: c.rating,
    lastContactedAt: c.lastContactedAt,
    nextFollowUp: c.nextFollowUp,
  }
}

function parseDateArg(value: string | undefined | null, fieldName: string): Date | null {
  if (!value) return null
  const d = new Date(value)
  if (isNaN(d.getTime())) throw new Error(`Invalid ${fieldName}: ${value}`)
  return d
}

const contactFieldsShape = {
  name: z.string().max(200).optional(),
  company: z.string().max(500).optional().nullable(),
  role: z.string().max(500).optional().nullable(),
  city: z.string().max(500).optional().nullable(),
  country: z.string().max(500).optional().nullable(),
  email: z.string().max(320).optional().nullable(),
  phone: z.string().max(50).optional().nullable(),
  linkedin: z.string().max(500).optional().nullable(),
  twitter: z.string().max(500).optional().nullable(),
  telegram: z.string().max(64).optional().nullable(),
  instagram: z.string().max(500).optional().nullable(),
  github: z.string().max(500).optional().nullable(),
  website: z.string().max(500).optional().nullable(),
  tags: z.array(z.string().max(100)).max(50).optional().nullable(),
  notes: z.string().max(MAX_NOTES_LENGTH).optional().nullable(),
  rating: z.number().int().min(0).max(5).optional().nullable(),
  relationshipType: z.enum(RELATIONSHIP_TYPES).optional().nullable(),
  metAt: z.string().max(500).optional().nullable(),
  timezone: z.string().max(100).optional().nullable(),
  language: z.string().max(200).optional().nullable(),
  lat: z.number().min(-90).max(90).optional().nullable(),
  lng: z.number().min(-180).max(180).optional().nullable(),
  nextFollowUp: z.string().describe('ISO date or null to clear').optional().nullable(),
}

type ContactFieldArgs = {
  [K in keyof typeof contactFieldsShape]?: z.infer<(typeof contactFieldsShape)[K]>
}

function buildContactUpdates(args: ContactFieldArgs): Record<string, unknown> {
  const updates: Record<string, unknown> = {}
  const passthrough = [
    'name', 'company', 'role', 'city', 'country', 'email', 'phone',
    'linkedin', 'twitter', 'telegram', 'instagram', 'github', 'website',
    'tags', 'notes', 'rating', 'relationshipType', 'metAt', 'timezone',
    'language', 'lat', 'lng',
  ] as const
  for (const key of passthrough) {
    if (args[key] !== undefined) updates[key] = args[key]
  }
  if (args.nextFollowUp !== undefined) {
    updates.nextFollowUp = args.nextFollowUp ? parseDateArg(args.nextFollowUp, 'nextFollowUp') : null
  }
  return updates
}

export const MCP_TOOLS: McpToolDef[] = [
  {
    name: 'list_contacts',
    title: 'List contacts',
    description: 'List contacts in the Konterra network. Supports free-text search across name/company/email, plus tag and country filters. Returns compact records; use get_contact for full details.',
    scope: 'contacts:read',
    inputSchema: z.object({
      search: z.string().optional().describe('Case-insensitive substring match on name, company, role, email, city'),
      tag: z.string().optional(),
      country: z.string().optional(),
      limit: z.number().int().min(1).max(200).optional(),
      offset: z.number().int().min(0).optional(),
    }),
    handler: async (userId, rawArgs) => {
      const { search, tag, country, limit = 50, offset = 0 } = rawArgs as { search?: string; tag?: string; country?: string; limit?: number; offset?: number }
      let contacts = await getAllContactsByUserId(userId)
      if (search) {
        const q = search.toLowerCase()
        contacts = contacts.filter((c) =>
          [c.name, c.company, c.role, c.email, c.city].some((f) => f?.toLowerCase().includes(q))
        )
      }
      if (tag) contacts = contacts.filter((c) => c.tags?.includes(tag))
      if (country) {
        const q = country.toLowerCase()
        contacts = contacts.filter((c) => c.country?.toLowerCase() === q || c.currentCountry?.toLowerCase() === q)
      }
      const total = contacts.length
      const page = contacts.slice(offset, offset + limit).map(compactContact)
      return ok({ total, offset, limit, contacts: page })
    },
  },
  {
    name: 'get_contact',
    title: 'Get contact details',
    description: 'Fetch full details for a single contact: all profile fields plus interactions, favors, connections, and country ties.',
    scope: 'contacts:read',
    inputSchema: z.object({ id: z.string() }),
    handler: async (userId, rawArgs) => {
      const { id } = rawArgs as { id: string }
      const contact = await getContactById(id, userId)
      if (!contact) return err(`Contact ${id} not found`)
      const [interactions, favors, connections, countryConnections] = await Promise.all([
        getInteractionsByContactId(id, userId),
        getFavorsByContactId(id, userId),
        getConnectionsByContactId(id, userId),
        getCountryConnectionsByContactId(id, userId),
      ])
      return ok({ contact, interactions, favors, connections, countryConnections })
    },
  },
  {
    name: 'create_contact',
    title: 'Create contact',
    description: 'Create a new contact. Only name is required. If city/country are given without lat/lng, the app geocodes them later.',
    scope: 'contacts:write',
    inputSchema: z.object(contactFieldsShape),
    handler: async (userId, rawArgs) => {
      const args = rawArgs as ContactFieldArgs
      if (!args.name?.trim()) return err('name is required')
      const validationError = validateContact(rawArgs, true)
      if (validationError) return err(validationError)
      const updates = buildContactUpdates(args)
      const contact = await createContact({ userId, name: args.name.trim(), ...updates, importSource: 'manual' })
      return ok(contact)
    },
  },
  {
    name: 'update_contact',
    title: 'Update contact',
    description: 'Update fields of an existing contact. Only provided fields are changed; pass null to clear a field.',
    scope: 'contacts:write',
    inputSchema: z.object({ id: z.string(), ...contactFieldsShape }),
    handler: async (userId, rawArgs) => {
      const { id, ...args } = rawArgs as { id: string } & ContactFieldArgs
      const validationError = validateContact(args as Record<string, unknown>, false)
      if (validationError) return err(validationError)
      const updates = buildContactUpdates(args)
      if (Object.keys(updates).length === 0) return err('No fields to update')
      const contact = await updateContact(id, userId, updates)
      if (!contact) return err(`Contact ${id} not found`)
      return ok(contact)
    },
  },
  {
    name: 'delete_contact',
    title: 'Delete contact',
    description: 'Permanently delete a contact and all its interactions, favors, and connections. Requires confirm=true.',
    scope: 'contacts:write',
    inputSchema: z.object({ id: z.string(), confirm: z.boolean().describe('Must be true to actually delete') }),
    handler: async (userId, rawArgs) => {
      const { id, confirm } = rawArgs as { id: string; confirm: boolean }
      if (!confirm) return err('Set confirm=true to delete this contact. This cannot be undone.')
      const contact = await getContactById(id, userId)
      if (!contact) return err(`Contact ${id} not found`)
      await deleteContact(id, userId)
      return ok({ deleted: true, id, name: contact.name })
    },
  },
  {
    name: 'log_interaction',
    title: 'Log interaction',
    description: "Record an interaction (meeting, call, message, etc.) with a contact. Updates the contact's last-contacted date automatically.",
    scope: 'contacts:write',
    inputSchema: z.object({
      contactId: z.string(),
      type: z.enum(INTERACTION_TYPES),
      date: z.string().optional().describe('ISO date; defaults to now'),
      location: z.string().max(500).optional(),
      notes: z.string().max(MAX_NOTES_LENGTH).optional(),
    }),
    handler: async (userId, rawArgs) => {
      const { contactId, type, date, location, notes } = rawArgs as { contactId: string; type: typeof INTERACTION_TYPES[number]; date?: string; location?: string; notes?: string }
      const contact = await getContactById(contactId, userId)
      if (!contact) return err(`Contact ${contactId} not found`)
      const interaction = await createInteraction({
        contactId,
        type,
        date: parseDateArg(date, 'date') ?? new Date(),
        location: location || null,
        notes: notes || null,
      })
      return ok(interaction)
    },
  },
  {
    name: 'list_recent_interactions',
    title: 'List recent interactions',
    description: 'List the most recent interactions across all contacts, newest first.',
    scope: 'contacts:read',
    inputSchema: z.object({
      limit: z.number().int().min(1).max(100).optional(),
      offset: z.number().int().min(0).optional(),
    }),
    handler: async (userId, rawArgs) => {
      const { limit = 15, offset = 0 } = rawArgs as { limit?: number; offset?: number }
      return ok(await getRecentInteractions(userId, limit, offset))
    },
  },
  {
    name: 'log_favor',
    title: 'Log favor',
    description: 'Record a favor given to or received from a contact (the social-capital ledger).',
    scope: 'contacts:write',
    inputSchema: z.object({
      contactId: z.string(),
      direction: z.enum(FAVOR_DIRECTIONS),
      type: z.enum(FAVOR_TYPES),
      description: z.string().max(2000).optional(),
      value: z.enum(FAVOR_VALUES).optional(),
      date: z.string().optional().describe('ISO date; defaults to now'),
    }),
    handler: async (userId, rawArgs) => {
      const { contactId, direction, type, description, value, date } = rawArgs as { contactId: string; direction: typeof FAVOR_DIRECTIONS[number]; type: typeof FAVOR_TYPES[number]; description?: string; value?: typeof FAVOR_VALUES[number]; date?: string }
      const contact = await getContactById(contactId, userId)
      if (!contact) return err(`Contact ${contactId} not found`)
      const favor = await createFavor({
        userId,
        contactId,
        direction,
        type,
        description: description || null,
        value: value ?? 'medium',
        date: parseDateArg(date, 'date') ?? new Date(),
      })
      return ok(favor)
    },
  },
  {
    name: 'list_trips',
    title: 'List trips',
    description: 'List all trips (past, current, and planned), newest arrival first.',
    scope: 'travel:read',
    inputSchema: z.object({}),
    handler: async (userId) => ok(await getTripsByUserId(userId)),
  },
  {
    name: 'create_trip',
    title: 'Create trip',
    description: 'Add a trip. Past trips automatically mark the country as visited. Future arrival dates create planned trips.',
    scope: 'travel:write',
    inputSchema: z.object({
      city: z.string().max(500),
      country: z.string().max(500),
      arrivalDate: z.string().describe('ISO date'),
      departureDate: z.string().optional(),
      notes: z.string().max(MAX_NOTES_LENGTH).optional(),
      lat: z.number().min(-90).max(90).optional(),
      lng: z.number().min(-180).max(180).optional(),
    }),
    handler: async (userId, rawArgs) => {
      const { city, country, arrivalDate, departureDate, notes, lat, lng } = rawArgs as { city: string; country: string; arrivalDate: string; departureDate?: string; notes?: string; lat?: number; lng?: number }
      const arrival = parseDateArg(arrivalDate, 'arrivalDate')
      if (!arrival) return err('arrivalDate is required')
      const departure = parseDateArg(departureDate, 'departureDate')
      if (departure && departure < arrival) return err('departureDate must be on or after arrivalDate')
      const trip = await createTrip({
        userId,
        city,
        country,
        arrivalDate: arrival,
        departureDate: departure,
        notes: notes || null,
        lat: lat ?? null,
        lng: lng ?? null,
      })
      return ok(trip)
    },
  },
  {
    name: 'delete_trip',
    title: 'Delete trip',
    description: 'Delete a trip by id. Derived visited-country status is recalculated automatically.',
    scope: 'travel:write',
    inputSchema: z.object({ id: z.string() }),
    handler: async (userId, rawArgs) => {
      const { id } = rawArgs as { id: string }
      await deleteTrip(id, userId)
      return ok({ deleted: true, id })
    },
  },
  {
    name: 'travel_summary',
    title: 'Travel summary',
    description: 'Overview of travel data: visited countries, wishlist with priorities, trip counts, and upcoming trips.',
    scope: 'travel:read',
    inputSchema: z.object({}),
    handler: async (userId) => {
      const [visited, wishlist, trips] = await Promise.all([
        getVisitedCountries(userId),
        getWishlistCountries(userId),
        getTripsByUserId(userId),
      ])
      const now = new Date()
      const upcoming = trips
        .filter((t) => new Date(t.arrivalDate) > now)
        .map((t) => ({ id: t.id, city: t.city, country: t.country, arrivalDate: t.arrivalDate, departureDate: t.departureDate }))
      return ok({
        visitedCountries: visited.sort(),
        visitedCount: visited.length,
        wishlist: wishlist.map((w) => ({ country: w.country, priority: w.priority, status: w.status, notes: w.notes })),
        totalTrips: trips.length,
        upcomingTrips: upcoming,
      })
    },
  },
  {
    name: 'set_visited_country',
    title: 'Set visited country',
    description: 'Mark a country as visited or remove a manual visited mark. Countries derived from past trips cannot be unmarked.',
    scope: 'travel:write',
    inputSchema: z.object({ country: z.string().max(500), visited: z.boolean() }),
    handler: async (userId, rawArgs) => {
      const { country, visited } = rawArgs as { country: string; visited: boolean }
      const countries = visited
        ? await addVisitedCountry(userId, country)
        : await removeVisitedCountry(userId, country)
      return ok({ visitedCountries: countries.sort() })
    },
  },
  {
    name: 'add_wishlist_country',
    title: 'Add wishlist country',
    description: 'Add a country to the travel wishlist with an optional priority and notes.',
    scope: 'travel:write',
    inputSchema: z.object({
      country: z.string().max(500),
      priority: z.enum(WISHLIST_PRIORITIES).optional(),
      notes: z.string().max(MAX_NOTES_LENGTH).optional(),
    }),
    handler: async (userId, rawArgs) => {
      const { country, priority, notes } = rawArgs as { country: string; priority?: typeof WISHLIST_PRIORITIES[number]; notes?: string }
      const entry = await addWishlistCountry(userId, country, { priority, notes })
      return ok(entry)
    },
  },
  {
    name: 'remove_wishlist_country',
    title: 'Remove wishlist country',
    description: 'Remove a country from the travel wishlist by name.',
    scope: 'travel:write',
    inputSchema: z.object({ country: z.string().max(500) }),
    handler: async (userId, rawArgs) => {
      const { country } = rawArgs as { country: string }
      await removeWishlistCountryByName(userId, country)
      return ok({ removed: true, country })
    },
  },
  {
    name: 'network_stats',
    title: 'Network stats',
    description: 'Aggregate stats: contact counts by country and tag, overdue follow-ups, and the favor balance (given vs received).',
    scope: 'contacts:read',
    inputSchema: z.object({}),
    handler: async (userId) => {
      const [contacts, favors, visited] = await Promise.all([
        getAllContactsByUserId(userId),
        getAllFavorsByUserId(userId),
        getVisitedCountries(userId),
      ])
      const byCountry = new Map<string, number>()
      const byTag = new Map<string, number>()
      const now = new Date()
      const overdueFollowUps: { id: string; name: string; nextFollowUp: Date }[] = []
      for (const c of contacts) {
        if (c.country) byCountry.set(c.country, (byCountry.get(c.country) || 0) + 1)
        for (const t of c.tags ?? []) byTag.set(t, (byTag.get(t) || 0) + 1)
        if (c.nextFollowUp && c.nextFollowUp <= now) {
          overdueFollowUps.push({ id: c.id, name: c.name, nextFollowUp: c.nextFollowUp })
        }
      }
      const sortDesc = (m: Map<string, number>) =>
        [...m.entries()].sort((a, b) => b[1] - a[1]).map(([name, count]) => ({ name, count }))
      const given = favors.filter((f) => f.direction === 'given').length
      const received = favors.filter((f) => f.direction === 'received').length
      return ok({
        totalContacts: contacts.length,
        contactsByCountry: sortDesc(byCountry).slice(0, 25),
        contactsByTag: sortDesc(byTag).slice(0, 25),
        overdueFollowUps: overdueFollowUps.sort((a, b) => a.nextFollowUp.getTime() - b.nextFollowUp.getTime()),
        favorBalance: { given, received, activeTotal: favors.filter((f) => f.status === 'active').length },
        visitedCountryCount: visited.length,
      })
    },
  },
]

export const MCP_TOOL_MAP = new Map(MCP_TOOLS.map((t) => [t.name, t]))
