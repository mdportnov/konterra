import {
  pgTable, pgEnum, text, timestamp, doublePrecision,
  jsonb, integer, boolean, date, index, uniqueIndex,
} from 'drizzle-orm/pg-core'

export const interactionTypeEnum = pgEnum('interaction_type', [
  'meeting', 'call', 'message', 'email', 'event', 'introduction', 'deal', 'note',
])

export const connectionTypeEnum = pgEnum('connection_type', [
  'knows', 'introduced_by', 'works_with', 'reports_to', 'invested_in', 'referred_by',
])

export const favorDirectionEnum = pgEnum('favor_direction', ['given', 'received'])

export const favorTypeEnum = pgEnum('favor_type', [
  'introduction', 'advice', 'referral', 'money', 'opportunity', 'resource', 'time',
])

export const favorValueEnum = pgEnum('favor_value', ['low', 'medium', 'high', 'critical'])

export const favorStatusEnum = pgEnum('favor_status', ['active', 'resolved', 'expired', 'repaid'])

export const introductionStatusEnum = pgEnum('introduction_status', [
  'planned', 'introduced', 'connected', 'failed', 'completed', 'made',
])

export const relationshipTypeEnum = pgEnum('relationship_type', [
  'friend', 'business', 'investor', 'conference', 'mentor', 'colleague', 'family', 'dating', 'professional', 'acquaintance',
])

export const genderEnum = pgEnum('gender', ['male', 'female'])

export const communicationStyleEnum = pgEnum('communication_style', [
  'direct', 'diplomatic', 'analytical', 'expressive',
])

export const preferredChannelEnum = pgEnum('preferred_channel', [
  'email', 'call', 'text', 'in-person', 'linkedin',
])

export const responseSpeedEnum = pgEnum('response_speed', [
  'immediate', 'same-day', 'slow', 'unreliable',
])

export const loyaltyIndicatorEnum = pgEnum('loyalty_indicator', [
  'proven', 'likely', 'neutral', 'unreliable', 'unknown',
])

export const financialCapacityEnum = pgEnum('financial_capacity', [
  'bootstrapper', 'funded', 'wealthy', 'institutional',
])

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  password: text('password').notNull(),
  name: text('name'),
  image: text('image'),
  emailVerified: timestamp('email_verified', { mode: 'date' }),
  createdAt: timestamp('created_at').defaultNow(),
})

export const accounts = pgTable('accounts', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  type: text('type').notNull(),
  provider: text('provider').notNull(),
  providerAccountId: text('provider_account_id').notNull(),
  refresh_token: text('refresh_token'),
  access_token: text('access_token'),
  expires_at: integer('expires_at'),
  token_type: text('token_type'),
  scope: text('scope'),
  id_token: text('id_token'),
  session_state: text('session_state'),
})

export const sessions = pgTable('sessions', {
  sessionToken: text('session_token').primaryKey(),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  expires: timestamp('expires', { mode: 'date' }).notNull(),
})

export const verificationTokens = pgTable('verification_tokens', {
  identifier: text('identifier').notNull(),
  token: text('token').notNull().unique(),
  expires: timestamp('expires', { mode: 'date' }).notNull(),
})

export const contacts = pgTable('contacts', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  name: text('name').notNull(),
  photo: text('photo'),
  company: text('company'),
  role: text('role'),
  city: text('city'),
  country: text('country'),
  lat: doublePrecision('lat'),
  lng: doublePrecision('lng'),
  email: text('email'),
  phone: text('phone'),
  linkedin: text('linkedin'),
  twitter: text('twitter'),
  telegram: text('telegram'),
  instagram: text('instagram'),
  github: text('github'),
  website: text('website'),
  tags: text('tags').array(),
  notes: text('notes'),
  meta: jsonb('meta'),
  secondaryLocations: text('secondary_locations').array(),
  rating: integer('rating'),
  gender: genderEnum('gender'),
  relationshipType: relationshipTypeEnum('relationship_type'),
  metAt: text('met_at'),
  metDate: timestamp('met_date', { mode: 'date' }),
  lastContactedAt: timestamp('last_contacted_at', { mode: 'date' }),
  nextFollowUp: timestamp('next_follow_up', { mode: 'date' }),
  communicationStyle: communicationStyleEnum('communication_style'),
  preferredChannel: preferredChannelEnum('preferred_channel'),
  responseSpeed: responseSpeedEnum('response_speed'),
  timezone: text('timezone'),
  language: text('language'),
  birthday: date('birthday', { mode: 'date' }),
  personalInterests: text('personal_interests').array(),
  professionalGoals: text('professional_goals').array(),
  painPoints: text('pain_points').array(),
  influenceLevel: integer('influence_level'),
  networkReach: integer('network_reach'),
  trustLevel: integer('trust_level'),
  loyaltyIndicator: loyaltyIndicatorEnum('loyalty_indicator'),
  financialCapacity: financialCapacityEnum('financial_capacity'),
  motivations: text('motivations').array(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (t) => [
  index('contacts_user_id_idx').on(t.userId),
  index('contacts_last_contacted_at_idx').on(t.lastContactedAt),
  index('contacts_next_follow_up_idx').on(t.nextFollowUp),
  index('contacts_updated_at_idx').on(t.updatedAt),
])

export const interactions = pgTable('interactions', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  contactId: text('contact_id').references(() => contacts.id, { onDelete: 'cascade' }).notNull(),
  type: interactionTypeEnum('type').notNull(),
  date: timestamp('date').notNull(),
  location: text('location'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (t) => [
  index('interactions_contact_id_idx').on(t.contactId),
  index('interactions_date_idx').on(t.date),
])

export const contactConnections = pgTable('contact_connections', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  sourceContactId: text('source_contact_id').references(() => contacts.id, { onDelete: 'cascade' }).notNull(),
  targetContactId: text('target_contact_id').references(() => contacts.id, { onDelete: 'cascade' }).notNull(),
  connectionType: connectionTypeEnum('connection_type').notNull(),
  strength: integer('strength').default(3),
  bidirectional: boolean('bidirectional').default(true),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (t) => [
  index('contact_connections_user_id_idx').on(t.userId),
  index('contact_connections_source_idx').on(t.sourceContactId),
  index('contact_connections_target_idx').on(t.targetContactId),
  uniqueIndex('contact_connections_pair_idx').on(t.sourceContactId, t.targetContactId),
])

export const introductions = pgTable('introductions', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  contactAId: text('contact_a_id').references(() => contacts.id, { onDelete: 'cascade' }).notNull(),
  contactBId: text('contact_b_id').references(() => contacts.id, { onDelete: 'cascade' }).notNull(),
  initiatedBy: text('initiated_by').notNull(),
  status: introductionStatusEnum('status').notNull().default('planned'),
  date: timestamp('date'),
  outcome: text('outcome'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (t) => [
  index('introductions_user_id_idx').on(t.userId),
  index('introductions_contact_a_idx').on(t.contactAId),
  index('introductions_contact_b_idx').on(t.contactBId),
])

export const favors = pgTable('favors', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  contactId: text('contact_id').references(() => contacts.id, { onDelete: 'cascade' }).notNull(),
  direction: favorDirectionEnum('direction').notNull(),
  type: favorTypeEnum('type').notNull(),
  description: text('description'),
  value: favorValueEnum('value').notNull().default('medium'),
  status: favorStatusEnum('status').notNull().default('active'),
  date: timestamp('date'),
  resolvedAt: timestamp('resolved_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (t) => [
  index('favors_user_id_idx').on(t.userId),
  index('favors_contact_id_idx').on(t.contactId),
])

export const visitedCountries = pgTable('visited_countries', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  country: text('country').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
}, (t) => [
  index('visited_countries_user_id_idx').on(t.userId),
  uniqueIndex('visited_countries_user_country_idx').on(t.userId, t.country),
])

export type User = typeof users.$inferSelect
export type Contact = typeof contacts.$inferSelect
export type NewContact = typeof contacts.$inferInsert
export type Interaction = typeof interactions.$inferSelect
export type ContactConnection = typeof contactConnections.$inferSelect
export type NewContactConnection = typeof contactConnections.$inferInsert
export type Introduction = typeof introductions.$inferSelect
export type NewIntroduction = typeof introductions.$inferInsert
export type Favor = typeof favors.$inferSelect
export type NewFavor = typeof favors.$inferInsert

export const waitlistStatusEnum = pgEnum('waitlist_status', ['pending', 'approved', 'rejected'])

export const waitlist = pgTable('waitlist', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  message: text('message'),
  status: waitlistStatusEnum('status').notNull().default('pending'),
  createdAt: timestamp('created_at').defaultNow(),
})

export type WaitlistEntry = typeof waitlist.$inferSelect
export type NewWaitlistEntry = typeof waitlist.$inferInsert
