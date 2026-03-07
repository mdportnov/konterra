ALTER TABLE "waitlist" ADD COLUMN "admin_note" text;--> statement-breakpoint
ALTER TABLE "waitlist" ADD COLUMN "reviewed_by" text;--> statement-breakpoint
ALTER TABLE "waitlist" ADD COLUMN "reviewed_at" timestamp;--> statement-breakpoint
ALTER TABLE "waitlist" ADD CONSTRAINT "waitlist_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE TYPE "public"."social_preview_status" AS ENUM('pending', 'success', 'failed');--> statement-breakpoint
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
ALTER TABLE "social_previews" ADD CONSTRAINT "social_previews_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "social_previews_contact_id_idx" ON "social_previews" USING btree ("contact_id");--> statement-breakpoint
CREATE UNIQUE INDEX "social_previews_contact_platform_idx" ON "social_previews" USING btree ("contact_id","platform");
