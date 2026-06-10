ALTER TYPE "public"."audit_action" ADD VALUE IF NOT EXISTS 'token_create';--> statement-breakpoint
ALTER TYPE "public"."audit_action" ADD VALUE IF NOT EXISTS 'token_revoke';
