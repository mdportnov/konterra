import { pgTable, text, timestamp, doublePrecision, jsonb, integer } from 'drizzle-orm/pg-core'

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name'),
  image: text('image'),
  emailVerified: timestamp('email_verified', { mode: 'date' }),
  createdAt: timestamp('created_at').defaultNow()
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
  session_state: text('session_state')
})

export const sessions = pgTable('sessions', {
  sessionToken: text('session_token').primaryKey(),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  expires: timestamp('expires', { mode: 'date' }).notNull()
})

export const verificationTokens = pgTable('verification_tokens', {
  identifier: text('identifier').notNull(),
  token: text('token').notNull().unique(),
  expires: timestamp('expires', { mode: 'date' }).notNull()
})

export const contacts = pgTable('contacts', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').references(() => users.id).notNull(),
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
  gender: text('gender'),
  relationshipType: text('relationship_type'),
  metAt: text('met_at'),
  metDate: timestamp('met_date', { mode: 'date' }),
  lastContactedAt: timestamp('last_contacted_at', { mode: 'date' }),
  nextFollowUp: timestamp('next_follow_up', { mode: 'date' }),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
})

export const interactions = pgTable('interactions', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  contactId: text('contact_id').references(() => contacts.id, { onDelete: 'cascade' }).notNull(),
  type: text('type').notNull(),
  date: timestamp('date').notNull(),
  location: text('location'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow()
})

export type User = typeof users.$inferSelect
export type Contact = typeof contacts.$inferSelect
export type NewContact = typeof contacts.$inferInsert
export type Interaction = typeof interactions.$inferSelect
