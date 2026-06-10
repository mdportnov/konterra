import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import {
  getUserByEmail,
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

let cachedUserId: string | null = null

async function requireUserId(): Promise<string> {
  if (cachedUserId) return cachedUserId
  const email = process.env.KONTERRA_USER_EMAIL
  if (!email) {
    throw new Error('KONTERRA_USER_EMAIL is not set. Set it to the email of the Konterra account this server should operate on.')
  }
  const user = await getUserByEmail(email.toLowerCase().trim())
  if (!user) throw new Error(`No Konterra user found for email ${email}`)
  cachedUserId = user.id
  return user.id
}

function json(data: unknown) {
  return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] }
}

function fail(message: string) {
  return { content: [{ type: 'text' as const, text: message }], isError: true as const }
}

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

function parseDateArg(value: string | undefined, fieldName: string): Date | null {
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

export function createKonterraServer(): McpServer {
  const server = new McpServer({ name: 'konterra', version: '1.0.0' })

  server.registerTool('list_contacts', {
    title: 'List contacts',
    description: 'List contacts in the Konterra network. Supports free-text search across name/company/email, plus tag and country filters. Returns compact records; use get_contact for full details.',
    inputSchema: {
      search: z.string().optional().describe('Case-insensitive substring match on name, company, role, email, city'),
      tag: z.string().optional(),
      country: z.string().optional(),
      limit: z.number().int().min(1).max(200).optional(),
      offset: z.number().int().min(0).optional(),
    },
  }, async ({ search, tag, country, limit = 50, offset = 0 }) => {
    const userId = await requireUserId()
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
    return json({ total, offset, limit, contacts: page })
  })

  server.registerTool('get_contact', {
    title: 'Get contact details',
    description: 'Fetch full details for a single contact: all profile fields plus interactions, favors, connections, and country ties.',
    inputSchema: { id: z.string() },
  }, async ({ id }) => {
    const userId = await requireUserId()
    const contact = await getContactById(id, userId)
    if (!contact) return fail(`Contact ${id} not found`)
    const [interactions, favors, connections, countryConnections] = await Promise.all([
      getInteractionsByContactId(id, userId),
      getFavorsByContactId(id, userId),
      getConnectionsByContactId(id, userId),
      getCountryConnectionsByContactId(id, userId),
    ])
    return json({ contact, interactions, favors, connections, countryConnections })
  })

  server.registerTool('create_contact', {
    title: 'Create contact',
    description: 'Create a new contact. Only name is required. If city/country are given without lat/lng, the app geocodes them later.',
    inputSchema: contactFieldsShape,
  }, async (args) => {
    const userId = await requireUserId()
    if (!args.name?.trim()) return fail('name is required')
    const validationError = validateContact(args as Record<string, unknown>, true)
    if (validationError) return fail(validationError)
    const updates = buildContactUpdates(args)
    const contact = await createContact({ userId, name: args.name.trim(), ...updates, importSource: 'manual' })
    return json(contact)
  })

  server.registerTool('update_contact', {
    title: 'Update contact',
    description: 'Update fields of an existing contact. Only provided fields are changed; pass null to clear a field.',
    inputSchema: { id: z.string(), ...contactFieldsShape },
  }, async ({ id, ...args }) => {
    const userId = await requireUserId()
    const validationError = validateContact(args as Record<string, unknown>, false)
    if (validationError) return fail(validationError)
    const updates = buildContactUpdates(args)
    if (Object.keys(updates).length === 0) return fail('No fields to update')
    const contact = await updateContact(id, userId, updates)
    if (!contact) return fail(`Contact ${id} not found`)
    return json(contact)
  })

  server.registerTool('delete_contact', {
    title: 'Delete contact',
    description: 'Permanently delete a contact and all its interactions, favors, and connections. Requires confirm=true.',
    inputSchema: { id: z.string(), confirm: z.boolean().describe('Must be true to actually delete') },
  }, async ({ id, confirm }) => {
    const userId = await requireUserId()
    if (!confirm) return fail('Set confirm=true to delete this contact. This cannot be undone.')
    const contact = await getContactById(id, userId)
    if (!contact) return fail(`Contact ${id} not found`)
    await deleteContact(id, userId)
    return json({ deleted: true, id, name: contact.name })
  })

  server.registerTool('log_interaction', {
    title: 'Log interaction',
    description: 'Record an interaction (meeting, call, message, etc.) with a contact. Updates the contact\'s last-contacted date automatically.',
    inputSchema: {
      contactId: z.string(),
      type: z.enum(INTERACTION_TYPES),
      date: z.string().optional().describe('ISO date; defaults to now'),
      location: z.string().max(500).optional(),
      notes: z.string().max(MAX_NOTES_LENGTH).optional(),
    },
  }, async ({ contactId, type, date, location, notes }) => {
    const userId = await requireUserId()
    const contact = await getContactById(contactId, userId)
    if (!contact) return fail(`Contact ${contactId} not found`)
    const interaction = await createInteraction({
      contactId,
      type,
      date: parseDateArg(date, 'date') ?? new Date(),
      location: location || null,
      notes: notes || null,
    })
    return json(interaction)
  })

  server.registerTool('list_recent_interactions', {
    title: 'List recent interactions',
    description: 'List the most recent interactions across all contacts, newest first.',
    inputSchema: {
      limit: z.number().int().min(1).max(100).optional(),
      offset: z.number().int().min(0).optional(),
    },
  }, async ({ limit = 15, offset = 0 }) => {
    const userId = await requireUserId()
    return json(await getRecentInteractions(userId, limit, offset))
  })

  server.registerTool('log_favor', {
    title: 'Log favor',
    description: 'Record a favor given to or received from a contact (the social-capital ledger).',
    inputSchema: {
      contactId: z.string(),
      direction: z.enum(FAVOR_DIRECTIONS),
      type: z.enum(FAVOR_TYPES),
      description: z.string().max(2000).optional(),
      value: z.enum(FAVOR_VALUES).optional(),
      date: z.string().optional().describe('ISO date; defaults to now'),
    },
  }, async ({ contactId, direction, type, description, value, date }) => {
    const userId = await requireUserId()
    const contact = await getContactById(contactId, userId)
    if (!contact) return fail(`Contact ${contactId} not found`)
    const favor = await createFavor({
      userId,
      contactId,
      direction,
      type,
      description: description || null,
      value: value ?? 'medium',
      date: parseDateArg(date, 'date') ?? new Date(),
    })
    return json(favor)
  })

  server.registerTool('list_trips', {
    title: 'List trips',
    description: 'List all trips (past, current, and planned), newest arrival first.',
    inputSchema: {},
  }, async () => {
    const userId = await requireUserId()
    return json(await getTripsByUserId(userId))
  })

  server.registerTool('create_trip', {
    title: 'Create trip',
    description: 'Add a trip. Past trips automatically mark the country as visited. Future arrival dates create planned trips.',
    inputSchema: {
      city: z.string().max(500),
      country: z.string().max(500),
      arrivalDate: z.string().describe('ISO date'),
      departureDate: z.string().optional(),
      notes: z.string().max(MAX_NOTES_LENGTH).optional(),
      lat: z.number().min(-90).max(90).optional(),
      lng: z.number().min(-180).max(180).optional(),
    },
  }, async ({ city, country, arrivalDate, departureDate, notes, lat, lng }) => {
    const userId = await requireUserId()
    const arrival = parseDateArg(arrivalDate, 'arrivalDate')
    if (!arrival) return fail('arrivalDate is required')
    const departure = parseDateArg(departureDate, 'departureDate')
    if (departure && departure < arrival) return fail('departureDate must be on or after arrivalDate')
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
    return json(trip)
  })

  server.registerTool('delete_trip', {
    title: 'Delete trip',
    description: 'Delete a trip by id. Derived visited-country status is recalculated automatically.',
    inputSchema: { id: z.string() },
  }, async ({ id }) => {
    const userId = await requireUserId()
    await deleteTrip(id, userId)
    return json({ deleted: true, id })
  })

  server.registerTool('travel_summary', {
    title: 'Travel summary',
    description: 'Overview of travel data: visited countries, wishlist with priorities, trip counts, and upcoming trips.',
    inputSchema: {},
  }, async () => {
    const userId = await requireUserId()
    const [visited, wishlist, trips] = await Promise.all([
      getVisitedCountries(userId),
      getWishlistCountries(userId),
      getTripsByUserId(userId),
    ])
    const now = new Date()
    const upcoming = trips
      .filter((t) => new Date(t.arrivalDate) > now)
      .map((t) => ({ id: t.id, city: t.city, country: t.country, arrivalDate: t.arrivalDate, departureDate: t.departureDate }))
    return json({
      visitedCountries: visited.sort(),
      visitedCount: visited.length,
      wishlist: wishlist.map((w) => ({ country: w.country, priority: w.priority, status: w.status, notes: w.notes })),
      totalTrips: trips.length,
      upcomingTrips: upcoming,
    })
  })

  server.registerTool('set_visited_country', {
    title: 'Set visited country',
    description: 'Mark a country as visited or remove a manual visited mark. Countries derived from past trips cannot be unmarked.',
    inputSchema: { country: z.string().max(500), visited: z.boolean() },
  }, async ({ country, visited }) => {
    const userId = await requireUserId()
    const countries = visited
      ? await addVisitedCountry(userId, country)
      : await removeVisitedCountry(userId, country)
    return json({ visitedCountries: countries.sort() })
  })

  server.registerTool('add_wishlist_country', {
    title: 'Add wishlist country',
    description: 'Add a country to the travel wishlist with an optional priority and notes.',
    inputSchema: {
      country: z.string().max(500),
      priority: z.enum(WISHLIST_PRIORITIES).optional(),
      notes: z.string().max(MAX_NOTES_LENGTH).optional(),
    },
  }, async ({ country, priority, notes }) => {
    const userId = await requireUserId()
    const entry = await addWishlistCountry(userId, country, { priority, notes })
    return json(entry)
  })

  server.registerTool('remove_wishlist_country', {
    title: 'Remove wishlist country',
    description: 'Remove a country from the travel wishlist by name.',
    inputSchema: { country: z.string().max(500) },
  }, async ({ country }) => {
    const userId = await requireUserId()
    await removeWishlistCountryByName(userId, country)
    return json({ removed: true, country })
  })

  server.registerTool('network_stats', {
    title: 'Network stats',
    description: 'Aggregate stats: contact counts by country and tag, overdue follow-ups, and the favor balance (given vs received).',
    inputSchema: {},
  }, async () => {
    const userId = await requireUserId()
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
    return json({
      totalContacts: contacts.length,
      contactsByCountry: sortDesc(byCountry).slice(0, 25),
      contactsByTag: sortDesc(byTag).slice(0, 25),
      overdueFollowUps: overdueFollowUps.sort((a, b) => a.nextFollowUp.getTime() - b.nextFollowUp.getTime()),
      favorBalance: { given, received, activeTotal: favors.filter((f) => f.status === 'active').length },
      visitedCountryCount: visited.length,
    })
  })

  return server
}
