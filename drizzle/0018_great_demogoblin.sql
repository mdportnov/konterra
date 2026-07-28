-- Konterra no longer sends any email, so the single-use token tables that backed password
-- reset and address confirmation have no code behind them. They held a user id and an
-- expiring hash per row, so they are dropped rather than left behind.
DROP TABLE IF EXISTS "email_verification_tokens" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "password_reset_tokens" CASCADE;
