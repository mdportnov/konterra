CREATE TYPE "public"."communication_style" AS ENUM('direct', 'diplomatic', 'analytical', 'expressive');--> statement-breakpoint
CREATE TYPE "public"."connection_type" AS ENUM('knows', 'introduced_by', 'works_with', 'reports_to', 'invested_in', 'referred_by');--> statement-breakpoint
CREATE TYPE "public"."favor_direction" AS ENUM('given', 'received');--> statement-breakpoint
CREATE TYPE "public"."favor_status" AS ENUM('active', 'resolved', 'expired', 'repaid');--> statement-breakpoint
CREATE TYPE "public"."favor_type" AS ENUM('introduction', 'advice', 'referral', 'money', 'opportunity', 'resource', 'time');--> statement-breakpoint
CREATE TYPE "public"."favor_value" AS ENUM('low', 'medium', 'high', 'critical');--> statement-breakpoint
CREATE TYPE "public"."financial_capacity" AS ENUM('bootstrapper', 'funded', 'wealthy', 'institutional');--> statement-breakpoint
CREATE TYPE "public"."gender" AS ENUM('male', 'female');--> statement-breakpoint
CREATE TYPE "public"."interaction_type" AS ENUM('meeting', 'call', 'message', 'email', 'event', 'introduction', 'deal', 'note');--> statement-breakpoint
CREATE TYPE "public"."introduction_status" AS ENUM('planned', 'introduced', 'connected', 'failed', 'completed', 'made');--> statement-breakpoint
CREATE TYPE "public"."loyalty_indicator" AS ENUM('proven', 'likely', 'neutral', 'unreliable', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."preferred_channel" AS ENUM('email', 'call', 'text', 'in-person', 'linkedin');--> statement-breakpoint
CREATE TYPE "public"."profile_privacy_level" AS ENUM('countries_only', 'full_travel');--> statement-breakpoint
CREATE TYPE "public"."profile_visibility" AS ENUM('private', 'public');--> statement-breakpoint
CREATE TYPE "public"."relationship_type" AS ENUM('friend', 'business', 'investor', 'conference', 'mentor', 'colleague', 'family', 'dating', 'professional', 'acquaintance');--> statement-breakpoint
CREATE TYPE "public"."response_speed" AS ENUM('immediate', 'same-day', 'slow', 'unreliable');--> statement-breakpoint
CREATE TYPE "public"."social_preview_status" AS ENUM('pending', 'success', 'failed');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('user', 'moderator', 'admin');--> statement-breakpoint
CREATE TYPE "public"."waitlist_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."wishlist_priority" AS ENUM('dream', 'high', 'medium', 'low');--> statement-breakpoint
CREATE TYPE "public"."wishlist_status" AS ENUM('idea', 'researching', 'planning', 'ready');--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"type" text NOT NULL,
	"provider" text NOT NULL,
	"provider_account_id" text NOT NULL,
	"refresh_token" text,
	"access_token" text,
	"expires_at" integer,
	"token_type" text,
	"scope" text,
	"id_token" text,
	"session_state" text
);
--> statement-breakpoint
CREATE TABLE "app_settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" text NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "contact_connections" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"source_contact_id" text NOT NULL,
	"target_contact_id" text NOT NULL,
	"connection_type" "connection_type" NOT NULL,
	"strength" integer DEFAULT 3,
	"bidirectional" boolean DEFAULT true,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "contact_country_connections" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"contact_id" text NOT NULL,
	"country" text NOT NULL,
	"notes" text,
	"tags" text[],
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "contacts" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"photo" text,
	"company" text,
	"role" text,
	"city" text,
	"country" text,
	"address" text,
	"lat" double precision,
	"lng" double precision,
	"email" text,
	"phone" text,
	"linkedin" text,
	"twitter" text,
	"telegram" text,
	"instagram" text,
	"github" text,
	"website" text,
	"tags" text[],
	"notes" text,
	"meta" jsonb,
	"secondary_locations" text[],
	"rating" integer,
	"gender" "gender",
	"relationship_type" "relationship_type",
	"met_at" text,
	"met_date" timestamp,
	"last_contacted_at" timestamp,
	"next_follow_up" timestamp,
	"communication_style" "communication_style",
	"preferred_channel" "preferred_channel",
	"response_speed" "response_speed",
	"timezone" text,
	"language" text,
	"birthday" date,
	"personal_interests" text[],
	"professional_goals" text[],
	"pain_points" text[],
	"influence_level" integer,
	"network_reach" integer,
	"trust_level" integer,
	"loyalty_indicator" "loyalty_indicator",
	"financial_capacity" "financial_capacity",
	"motivations" text[],
	"import_source" text,
	"created_at" timestamp DEFAULT now(),
	"is_self" boolean DEFAULT false,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "country_wishlist" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"country" text NOT NULL,
	"priority" "wishlist_priority" DEFAULT 'medium' NOT NULL,
	"status" "wishlist_status" DEFAULT 'idea' NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "favors" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"contact_id" text NOT NULL,
	"direction" "favor_direction" NOT NULL,
	"type" "favor_type" NOT NULL,
	"description" text,
	"value" "favor_value" DEFAULT 'medium' NOT NULL,
	"status" "favor_status" DEFAULT 'active' NOT NULL,
	"date" timestamp,
	"resolved_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "interactions" (
	"id" text PRIMARY KEY NOT NULL,
	"contact_id" text NOT NULL,
	"type" "interaction_type" NOT NULL,
	"date" timestamp NOT NULL,
	"location" text,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "introductions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"contact_a_id" text NOT NULL,
	"contact_b_id" text NOT NULL,
	"initiated_by" text NOT NULL,
	"status" "introduction_status" DEFAULT 'planned' NOT NULL,
	"date" timestamp,
	"outcome" text,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"session_token" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"expires" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "social_previews" (
	"id" text PRIMARY KEY NOT NULL,
	"contact_id" text NOT NULL,
	"platform" text NOT NULL,
	"url" text NOT NULL,
	"title" text,
	"description" text,
	"image_url" text,
	"avatar_url" text,
	"followers" integer,
	"bio" text,
	"extra" jsonb,
	"status" "social_preview_status" DEFAULT 'pending' NOT NULL,
	"fetched_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "tags" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"color" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "trips" (
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
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"password" text NOT NULL,
	"name" text,
	"image" text,
	"role" "user_role" DEFAULT 'user' NOT NULL,
	"email_verified" timestamp,
	"username" text,
	"profile_visibility" "profile_visibility" DEFAULT 'private' NOT NULL,
	"profile_privacy_level" "profile_privacy_level" DEFAULT 'countries_only' NOT NULL,
	"globe_auto_rotate" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "verification_tokens" (
	"identifier" text NOT NULL,
	"token" text NOT NULL,
	"expires" timestamp NOT NULL,
	CONSTRAINT "verification_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "visited_countries" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"country" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "waitlist" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"message" text,
	"status" "waitlist_status" DEFAULT 'pending' NOT NULL,
	"admin_note" text,
	"reviewed_by" text,
	"created_at" timestamp DEFAULT now(),
	"reviewed_at" timestamp,
	CONSTRAINT "waitlist_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_connections" ADD CONSTRAINT "contact_connections_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_connections" ADD CONSTRAINT "contact_connections_source_contact_id_contacts_id_fk" FOREIGN KEY ("source_contact_id") REFERENCES "public"."contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_connections" ADD CONSTRAINT "contact_connections_target_contact_id_contacts_id_fk" FOREIGN KEY ("target_contact_id") REFERENCES "public"."contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_country_connections" ADD CONSTRAINT "contact_country_connections_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_country_connections" ADD CONSTRAINT "contact_country_connections_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "country_wishlist" ADD CONSTRAINT "country_wishlist_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "favors" ADD CONSTRAINT "favors_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "favors" ADD CONSTRAINT "favors_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interactions" ADD CONSTRAINT "interactions_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "introductions" ADD CONSTRAINT "introductions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "introductions" ADD CONSTRAINT "introductions_contact_a_id_contacts_id_fk" FOREIGN KEY ("contact_a_id") REFERENCES "public"."contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "introductions" ADD CONSTRAINT "introductions_contact_b_id_contacts_id_fk" FOREIGN KEY ("contact_b_id") REFERENCES "public"."contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "social_previews" ADD CONSTRAINT "social_previews_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tags" ADD CONSTRAINT "tags_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trips" ADD CONSTRAINT "trips_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visited_countries" ADD CONSTRAINT "visited_countries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "waitlist" ADD CONSTRAINT "waitlist_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "contact_connections_user_id_idx" ON "contact_connections" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "contact_connections_source_idx" ON "contact_connections" USING btree ("source_contact_id");--> statement-breakpoint
CREATE INDEX "contact_connections_target_idx" ON "contact_connections" USING btree ("target_contact_id");--> statement-breakpoint
CREATE UNIQUE INDEX "contact_connections_pair_idx" ON "contact_connections" USING btree ("source_contact_id","target_contact_id");--> statement-breakpoint
CREATE INDEX "contact_country_connections_user_id_idx" ON "contact_country_connections" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "contact_country_connections_contact_id_idx" ON "contact_country_connections" USING btree ("contact_id");--> statement-breakpoint
CREATE UNIQUE INDEX "contact_country_connections_contact_country_idx" ON "contact_country_connections" USING btree ("contact_id","country");--> statement-breakpoint
CREATE INDEX "contacts_user_id_idx" ON "contacts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "contacts_last_contacted_at_idx" ON "contacts" USING btree ("last_contacted_at");--> statement-breakpoint
CREATE INDEX "contacts_next_follow_up_idx" ON "contacts" USING btree ("next_follow_up");--> statement-breakpoint
CREATE INDEX "contacts_updated_at_idx" ON "contacts" USING btree ("updated_at");--> statement-breakpoint
CREATE INDEX "country_wishlist_user_id_idx" ON "country_wishlist" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "country_wishlist_user_country_idx" ON "country_wishlist" USING btree ("user_id","country");--> statement-breakpoint
CREATE INDEX "favors_user_id_idx" ON "favors" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "favors_contact_id_idx" ON "favors" USING btree ("contact_id");--> statement-breakpoint
CREATE INDEX "interactions_contact_id_idx" ON "interactions" USING btree ("contact_id");--> statement-breakpoint
CREATE INDEX "interactions_date_idx" ON "interactions" USING btree ("date");--> statement-breakpoint
CREATE INDEX "introductions_user_id_idx" ON "introductions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "introductions_contact_a_idx" ON "introductions" USING btree ("contact_a_id");--> statement-breakpoint
CREATE INDEX "introductions_contact_b_idx" ON "introductions" USING btree ("contact_b_id");--> statement-breakpoint
CREATE UNIQUE INDEX "introductions_pair_idx" ON "introductions" USING btree ("user_id","contact_a_id","contact_b_id");--> statement-breakpoint
CREATE INDEX "social_previews_contact_id_idx" ON "social_previews" USING btree ("contact_id");--> statement-breakpoint
CREATE UNIQUE INDEX "social_previews_contact_platform_idx" ON "social_previews" USING btree ("contact_id","platform");--> statement-breakpoint
CREATE INDEX "tags_user_id_idx" ON "tags" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "tags_user_name_idx" ON "tags" USING btree ("user_id","name");--> statement-breakpoint
CREATE INDEX "trips_user_id_idx" ON "trips" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "trips_arrival_date_idx" ON "trips" USING btree ("arrival_date");--> statement-breakpoint
CREATE INDEX "visited_countries_user_id_idx" ON "visited_countries" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "visited_countries_user_country_idx" ON "visited_countries" USING btree ("user_id","country");