-- drizzle-check: allow-manual
-- Repair schema drift: objects that exist in production (applied via db:push)
-- but were missing from the migration chain (snapshots 0003-0005 were lost).
-- Every statement is idempotent so this is a no-op on databases that already
-- have the objects, and repairs fresh databases built from migrations alone.
DO $$ BEGIN
	CREATE TYPE "public"."user_role" AS ENUM('user', 'moderator', 'admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN
	CREATE TYPE "public"."profile_visibility" AS ENUM('private', 'public');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN
	CREATE TYPE "public"."profile_privacy_level" AS ENUM('countries_only', 'full_travel');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN
	CREATE TYPE "public"."audit_action" AS ENUM('login_success', 'login_failure', 'password_change', 'user_create', 'user_update', 'user_delete', 'role_change', 'invite_create', 'invite_use', 'waitlist_approve', 'waitlist_reject', 'export_data');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "password" text NOT NULL DEFAULT '';--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "password" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "role" "user_role" NOT NULL DEFAULT 'user';--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "username" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "profile_visibility" "profile_visibility" NOT NULL DEFAULT 'private';--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "profile_privacy_level" "profile_privacy_level" NOT NULL DEFAULT 'countries_only';--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "globe_auto_rotate" boolean NOT NULL DEFAULT true;--> statement-breakpoint
DO $$ BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_username_unique') THEN
		ALTER TABLE "users" ADD CONSTRAINT "users_username_unique" UNIQUE("username");
	END IF;
END $$;--> statement-breakpoint
ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "address" text;--> statement-breakpoint
ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "is_self" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "visited_countries" ADD COLUMN IF NOT EXISTS "source" text NOT NULL DEFAULT 'manual';--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tags" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"color" text,
	"created_at" timestamp DEFAULT now()
);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "trips" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"arrival_date" date NOT NULL,
	"departure_date" date,
	"duration_days" integer,
	"city" text NOT NULL,
	"country" text NOT NULL,
	"lat" double precision,
	"lng" double precision,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "contact_country_connections" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"contact_id" text NOT NULL,
	"country" text NOT NULL,
	"notes" text,
	"tags" text[],
	"created_at" timestamp DEFAULT now()
);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "audit_log" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text,
	"action" "audit_action" NOT NULL,
	"target_id" text,
	"target_type" text,
	"ip" text,
	"detail" text,
	"created_at" timestamp DEFAULT now()
);--> statement-breakpoint
DO $$ BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tags_user_id_users_id_fk') THEN
		ALTER TABLE "tags" ADD CONSTRAINT "tags_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
	END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'trips_user_id_users_id_fk') THEN
		ALTER TABLE "trips" ADD CONSTRAINT "trips_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
	END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'contact_country_connections_user_id_users_id_fk') THEN
		ALTER TABLE "contact_country_connections" ADD CONSTRAINT "contact_country_connections_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
	END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'contact_country_connections_contact_id_contacts_id_fk') THEN
		ALTER TABLE "contact_country_connections" ADD CONSTRAINT "contact_country_connections_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE cascade ON UPDATE no action;
	END IF;
END $$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tags_user_id_idx" ON "tags" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "tags_user_name_idx" ON "tags" USING btree ("user_id","name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "trips_user_id_idx" ON "trips" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "trips_arrival_date_idx" ON "trips" USING btree ("arrival_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "contact_country_connections_user_id_idx" ON "contact_country_connections" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "contact_country_connections_contact_id_idx" ON "contact_country_connections" USING btree ("contact_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "contact_country_connections_contact_country_idx" ON "contact_country_connections" USING btree ("contact_id","country");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_log_user_id_idx" ON "audit_log" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_log_action_idx" ON "audit_log" USING btree ("action");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_log_created_at_idx" ON "audit_log" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "introductions_pair_idx" ON "introductions" USING btree ("user_id","contact_a_id","contact_b_id");
