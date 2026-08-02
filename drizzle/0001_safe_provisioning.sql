-- Safe incremental migration: Vapi provisioning + subscription + phone_number + usage tracking
-- All statements use IF NOT EXISTS — safe to run against any state of the DB.
-- Generated from drizzle-kit, then hardened for production safety.

-- ── New tables (only created if not already present) ──────────────────────

CREATE TABLE IF NOT EXISTS "phone_number" (
  "id" text PRIMARY KEY NOT NULL,
  "business_id" text NOT NULL,
  "vapi_phone_number_id" text NOT NULL,
  "number" text NOT NULL,
  "server_url" text,
  "provider" text DEFAULT 'twilio',
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "subscription" (
  "id" text PRIMARY KEY NOT NULL,
  "business_id" text NOT NULL,
  "plan" text DEFAULT 'starter',
  "status" text DEFAULT 'active',
  "amount" integer DEFAULT 0,
  "currency" text DEFAULT 'usd',
  "interval" text DEFAULT 'month',
  "flutterwave_sub_id" text,
  "current_period_start" timestamp,
  "current_period_end" timestamp,
  "canceled_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "usage_ai_call" (
  "id" text PRIMARY KEY NOT NULL,
  "business_id" text NOT NULL,
  "tokens_in" integer DEFAULT 0,
  "tokens_out" integer DEFAULT 0,
  "model" text DEFAULT 'gpt-4o-mini',
  "source" text DEFAULT 'chat',
  "created_at" timestamp DEFAULT now() NOT NULL
);

-- ── New business columns (Vapi provisioning) ──────────────────────────────

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

-- ── Foreign keys (safe: skipped if constraint already exists) ────────────

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'phone_number_business_id_business_id_fk'
  ) THEN
    ALTER TABLE "phone_number" ADD CONSTRAINT "phone_number_business_id_business_id_fk"
      FOREIGN KEY ("business_id") REFERENCES "public"."business"("id") ON DELETE cascade ON UPDATE no action;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'subscription_business_id_business_id_fk'
  ) THEN
    ALTER TABLE "subscription" ADD CONSTRAINT "subscription_business_id_business_id_fk"
      FOREIGN KEY ("business_id") REFERENCES "public"."business"("id") ON DELETE cascade ON UPDATE no action;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'usage_ai_call_business_id_business_id_fk'
  ) THEN
    ALTER TABLE "usage_ai_call" ADD CONSTRAINT "usage_ai_call_business_id_business_id_fk"
      FOREIGN KEY ("business_id") REFERENCES "public"."business"("id") ON DELETE cascade ON UPDATE no action;
  END IF;
END $$;

-- ── Unique constraints ────────────────────────────────────────────────────

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'business_vapi_webhook_token_unique'
  ) THEN
    ALTER TABLE "business" ADD CONSTRAINT "business_vapi_webhook_token_unique" UNIQUE("vapi_webhook_token");
  END IF;
END $$;
