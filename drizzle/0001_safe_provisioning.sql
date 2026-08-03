-- Incremental migration: Vapi provisioning + business metadata columns.
-- These columns are NEW additions to the existing business table.
-- All tables (business, phone_number, subscription, etc.) already exist
-- from the initial schema push and prior migrations.
-- Every statement uses IF NOT EXISTS — safe idempotent re-runs.

ALTER TABLE "business" ADD COLUMN IF NOT EXISTS "vapi_webhook_token" text;
ALTER TABLE "business" ADD COLUMN IF NOT EXISTS "vapi_assistant_id" text;
ALTER TABLE "business" ADD COLUMN IF NOT EXISTS "voice_setup_ready" boolean DEFAULT false;
ALTER TABLE "business" ADD COLUMN IF NOT EXISTS "voice_provision_state" text DEFAULT 'idle';
ALTER TABLE "business" ADD COLUMN IF NOT EXISTS "voice_provision_error" text;
ALTER TABLE "business" ADD COLUMN IF NOT EXISTS "voice_provisioned_at" timestamp;
ALTER TABLE "business" ADD COLUMN IF NOT EXISTS "category" text DEFAULT '';
ALTER TABLE "business" ADD COLUMN IF NOT EXISTS "onboarding_complete" boolean DEFAULT false;
ALTER TABLE "business" ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'active';
ALTER TABLE "business" ADD COLUMN IF NOT EXISTS "suspended_at" timestamp;

-- Unique constraint on vapi_webhook_token (for webhook URL security)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'business_vapi_webhook_token_unique'
  ) THEN
    ALTER TABLE "business" ADD CONSTRAINT "business_vapi_webhook_token_unique" UNIQUE("vapi_webhook_token");
  END IF;
END $$;
