-- drizzle-check: allow-manual
--
-- Written to be idempotent. An earlier revision of this migration had already been applied
-- to production before the digest feature was cut, so this file must both bring a fresh
-- database up to date and reconcile one that already has most of it, then remove the
-- digest columns and enum that no longer have any code behind them.
--> statement-breakpoint
ALTER TYPE "public"."audit_action" ADD VALUE IF NOT EXISTS 'account_delete';--> statement-breakpoint
ALTER TYPE "public"."audit_action" ADD VALUE IF NOT EXISTS 'password_reset_request';--> statement-breakpoint
ALTER TYPE "public"."audit_action" ADD VALUE IF NOT EXISTS 'password_reset_complete';--> statement-breakpoint
ALTER TYPE "public"."audit_action" ADD VALUE IF NOT EXISTS 'email_verification_request';--> statement-breakpoint
ALTER TYPE "public"."audit_action" ADD VALUE IF NOT EXISTS 'email_verification_complete';--> statement-breakpoint
ALTER TYPE "public"."audit_action" ADD VALUE IF NOT EXISTS 'bulk_delete';--> statement-breakpoint
ALTER TYPE "public"."audit_action" ADD VALUE IF NOT EXISTS 'public_profile_enable';--> statement-breakpoint
ALTER TYPE "public"."audit_action" ADD VALUE IF NOT EXISTS 'public_profile_disable';--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "contact_location_history" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"contact_id" text NOT NULL,
	"city" text,
	"country" text,
	"lat" double precision,
	"lng" double precision,
	"source" text DEFAULT 'manual' NOT NULL,
	"observed_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "email_verification_tokens" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"email" text NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"used_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "email_verification_tokens_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "geocode_cache" (
	"query" text PRIMARY KEY NOT NULL,
	"lat" double precision,
	"lng" double precision,
	"formatted" text,
	"hits" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "onboarding_progress" (
	"user_id" text PRIMARY KEY NOT NULL,
	"completed_steps" text[] DEFAULT '{}' NOT NULL,
	"dismissed_at" timestamp,
	"wizard_step" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "password_reset_tokens" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"used_at" timestamp,
	"requested_ip" text,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "password_reset_tokens_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "rate_limit_buckets" (
	"key" text PRIMARY KEY NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	"reset_at" timestamp NOT NULL
);
--> statement-breakpoint
ALTER TABLE "introductions" ADD COLUMN IF NOT EXISTS "draft_text" text;--> statement-breakpoint
ALTER TABLE "introductions" ADD COLUMN IF NOT EXISTS "draft_generated_at" timestamp;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "public_profile_consent_at" timestamp;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "public_profile_indexable" boolean DEFAULT false NOT NULL;--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'contact_location_history_user_id_users_id_fk') THEN
    ALTER TABLE "contact_location_history" ADD CONSTRAINT "contact_location_history_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'contact_location_history_contact_id_contacts_id_fk') THEN
    ALTER TABLE "contact_location_history" ADD CONSTRAINT "contact_location_history_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE cascade ON UPDATE no action;
  END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'email_verification_tokens_user_id_users_id_fk') THEN
    ALTER TABLE "email_verification_tokens" ADD CONSTRAINT "email_verification_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'onboarding_progress_user_id_users_id_fk') THEN
    ALTER TABLE "onboarding_progress" ADD CONSTRAINT "onboarding_progress_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'password_reset_tokens_user_id_users_id_fk') THEN
    ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  END IF;
END $$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "contact_location_history_contact_id_idx" ON "contact_location_history" USING btree ("contact_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "contact_location_history_user_id_idx" ON "contact_location_history" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "contact_location_history_observed_at_idx" ON "contact_location_history" USING btree ("observed_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "email_verification_tokens_user_id_idx" ON "email_verification_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "email_verification_tokens_expires_at_idx" ON "email_verification_tokens" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "password_reset_tokens_user_id_idx" ON "password_reset_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "password_reset_tokens_expires_at_idx" ON "password_reset_tokens" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "rate_limit_buckets_reset_at_idx" ON "rate_limit_buckets" USING btree ("reset_at");--> statement-breakpoint
-- Tags are deliberately absent from this expression: array_to_string() is STABLE rather
-- than IMMUTABLE, so Postgres refuses it in an index. Tags are searched separately with
-- the array overlap operator, backed by contacts_tags_idx below.
CREATE INDEX IF NOT EXISTS "contacts_search_idx" ON "contacts" USING gin (
  to_tsvector('simple',
    coalesce("name", '') || ' ' ||
    coalesce("company", '') || ' ' ||
    coalesce("role", '') || ' ' ||
    coalesce("city", '') || ' ' ||
    coalesce("country", '') || ' ' ||
    coalesce("notes", '') || ' ' ||
    coalesce("met_at", '')
  )
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "contacts_tags_idx" ON "contacts" USING gin ("tags");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "contacts_name_trgm_idx" ON "contacts" USING btree (lower("name") text_pattern_ops);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "interactions_search_idx" ON "interactions" USING gin (
  to_tsvector('simple', coalesce("notes", '') || ' ' || coalesce("location", ''))
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "trips_search_idx" ON "trips" USING gin (
  to_tsvector('simple', coalesce("city", '') || ' ' || coalesce("country", '') || ' ' || coalesce("notes", ''))
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "trips_user_arrival_idx" ON "trips" USING btree ("user_id", "arrival_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "contact_connections_user_source_idx" ON "contact_connections" USING btree ("user_id", "source_contact_id");
--> statement-breakpoint
-- Konterra sends no newsletters or digests; these columns and their enum are removed so
-- the schema cannot outlive the feature.
ALTER TABLE "users" DROP COLUMN IF EXISTS "digest_frequency";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN IF EXISTS "digest_last_sent_at";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN IF EXISTS "unsubscribe_token";--> statement-breakpoint
DROP TYPE IF EXISTS "public"."digest_frequency";
