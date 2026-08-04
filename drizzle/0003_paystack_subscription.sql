-- Incremental: add Paystack subscription columns.
-- All columns use IF NOT EXISTS — safe idempotent re-runs.

ALTER TABLE "subscription" ADD COLUMN IF NOT EXISTS "paystack_sub_id" text;
ALTER TABLE "subscription" ADD COLUMN IF NOT EXISTS "payment_provider" text DEFAULT 'paystack';
