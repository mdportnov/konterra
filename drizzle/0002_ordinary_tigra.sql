CREATE TYPE "public"."wishlist_priority" AS ENUM('dream', 'high', 'medium', 'low');--> statement-breakpoint
CREATE TYPE "public"."wishlist_status" AS ENUM('idea', 'researching', 'planning', 'ready');--> statement-breakpoint
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
ALTER TABLE "country_wishlist" ADD CONSTRAINT "country_wishlist_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "country_wishlist_user_id_idx" ON "country_wishlist" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "country_wishlist_user_country_idx" ON "country_wishlist" USING btree ("user_id","country");