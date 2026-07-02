ALTER TABLE "users" ADD COLUMN "onboarded_at" timestamp;--> statement-breakpoint
UPDATE "users" SET "onboarded_at" = now() WHERE "onboarded_at" IS NULL;
