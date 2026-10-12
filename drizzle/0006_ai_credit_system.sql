-- 0006_ai_credit_system.sql
-- Tenant AI credit system (Phase 2, owner-ratified 2026-09-19).
-- WEIGHTS/SCALE reconciled to CREDIT-CALIBRATION.md 2026-10-07 (owner-ratified):
--   1 credit ≙ $0.005 blended provider list-price cost; balances are INTEGER
--   milli-credits (1 credit = 1,000 milli); included allowance = 10,000 credits =
--   10,000,000 milli per $199/mo subscription. Weights version: 2026-09-cal-v1.
-- Creates the credit wallet, canonical append-only usage ledger, credit grants,
-- and idempotent period snapshots. No changes to existing tables.
-- Applied via the ops runbook (bun run db:migrate), never in the build path.
-- Safe to re-run (all statements are idempotent).

-- ── Credit account: one wallet row per business per billing period ──────────
CREATE TABLE IF NOT EXISTS "credit_account" (
  "id" TEXT PRIMARY KEY,
  "business_id" TEXT NOT NULL REFERENCES "business"("id") ON DELETE CASCADE,
  "period_start_at" TIMESTAMPTZ NOT NULL,
  "period_end_at" TIMESTAMPTZ NOT NULL,
  "allocated" INTEGER NOT NULL DEFAULT 10000000,    -- milli-credits: 10,000 credits × 1000 (owner: 10,000/$199)
  "consumed" INTEGER NOT NULL DEFAULT 0,            -- milli-credits consumed this period (monotonic; can exceed allocated only during the bounded grace overdraft)
  "remaining" INTEGER NOT NULL DEFAULT 10000000,    -- milli-credits remaining; guarded UPDATE never goes below -500,000 (500-credit bounded grace overdraft)
  "status" TEXT NOT NULL DEFAULT 'active',          -- active | low | exhausted_grace | exhausted
  "exhausted_at" TIMESTAMPTZ,                       -- when remaining first hit 0 (grace window anchor)
  "grace_until" TIMESTAMPTZ,                        -- 24h grace end (CREDITS_GRACE_HOURS); hard stop after
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE ("business_id", "period_start_at")         -- one wallet row per business per period; idempotent open
);
CREATE INDEX IF NOT EXISTS "idx_credit_account_business" ON "credit_account" ("business_id");

-- ── Usage event: canonical append-only ledger (per ANALYTICS-DATA-CONTRACT.md; spec §5) ──
CREATE TABLE IF NOT EXISTS "usage_event" (
  "id" TEXT PRIMARY KEY,
  "business_id" TEXT NOT NULL REFERENCES "business"("id") ON DELETE CASCADE,
  "occurred_at" TIMESTAMPTZ NOT NULL,
  "ingested_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "event_type" TEXT NOT NULL,                     -- ai.completion | ai.lead_extraction | voice.call.minutes
  "source" TEXT NOT NULL,                         -- chat | chatbot | commander | email | lead_extractor | voice
  "quantity" INTEGER NOT NULL DEFAULT 1,          -- text: tokens_in + tokens_out; voice: minutes (ceil of seconds/60)
  "unit" TEXT NOT NULL,                           -- token | minute
  "credits_milli" INTEGER NOT NULL DEFAULT 0,     -- milli-credits charged (central cost service output; 1 credit = 1000 milli)
  "provider" TEXT NOT NULL,                       -- openai | vapi
  "model" TEXT,                                   -- gpt-4o-mini | gpt-4o | ... (as billed)
  "tokens_in" INTEGER NOT NULL DEFAULT 0,         -- actual input tokens (0 for voice events)
  "tokens_out" INTEGER NOT NULL DEFAULT 0,        -- actual output tokens (0 for voice events)
  "period_start_at" TIMESTAMPTZ NOT NULL,         -- copy of the locked credit_account period start (queryable without a join)
  "weights_version" TEXT NOT NULL DEFAULT '2026-09-cal-v1', -- cost-weight provenance; recalibration never rewrites settled rows
  "external_id" TEXT,                             -- OpenAI response id / Vapi call id (provider reference)
  "correlation_id" TEXT NOT NULL DEFAULT '',      -- groups secondary costs (lead extraction) with the primary turn
  "idempotency_key" TEXT NOT NULL,                -- unique per (business, source, provider external id / turn id); retries/double-delivery cannot double-charge
  "metadata" JSONB,                               -- allowlisted, redacted (conversation id, call id) — no PII/body
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE ("business_id", "idempotency_key")       -- dedupe: retries/double-delivery cannot double-charge
);
CREATE INDEX IF NOT EXISTS "idx_usage_biz_time_type" ON "usage_event" ("business_id", "occurred_at", "event_type");
CREATE INDEX IF NOT EXISTS "idx_usage_biz_period" ON "usage_event" ("business_id", "occurred_at");

-- ── Credit grant: credit injections (monthly refill, admin adjustment, future top-up) ──
CREATE TABLE IF NOT EXISTS "credit_grant" (
  "id" TEXT PRIMARY KEY,
  "business_id" TEXT NOT NULL REFERENCES "business"("id") ON DELETE CASCADE,
  "amount" INTEGER NOT NULL,                      -- milli-credits: positive = grant, negative = clawback/refund
  "reason" TEXT NOT NULL,                         -- monthly_included | topup | owner_adjustment | refund
  "external_reference" TEXT,                      -- paystack sub id / txn (dedupe webhook-driven grants)
  "period_start_at" TIMESTAMPTZ NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE ("reason", "external_reference")         -- monthly_included refill idempotent per period
);
CREATE INDEX IF NOT EXISTS "idx_credit_grant_business" ON "credit_grant" ("business_id");

-- ── Period snapshot: idempotent close of a settled period ──
CREATE TABLE IF NOT EXISTS "period_snapshot" (
  "id" TEXT PRIMARY KEY,
  "business_id" TEXT NOT NULL REFERENCES "business"("id") ON DELETE CASCADE,
  "period_start_at" TIMESTAMPTZ NOT NULL,
  "period_end_at" TIMESTAMPTZ NOT NULL,
  "ledger_high_watermark" TEXT,                   -- last usage_event.id included in this snapshot
  "included_credits" INTEGER NOT NULL DEFAULT 0,  -- milli-credits allocated that period
  "granted_credits" INTEGER NOT NULL DEFAULT 0,    -- milli-credits granted that period
  "consumed_credits" INTEGER NOT NULL DEFAULT 0, -- milli-credits consumed that period (incl. grace overdraft)
  "remaining_credits" INTEGER NOT NULL DEFAULT 0, -- milli-credits remaining at close (floor 0)
  "calculation_version" TEXT NOT NULL DEFAULT 'v1',
  "generated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE ("business_id", "period_start_at", "period_end_at")  -- idempotent rerun never duplicates
);
CREATE INDEX IF NOT EXISTS "idx_period_snapshot_business" ON "period_snapshot" ("business_id");

-- ENV contract (set in Vercel; defaults + parsing live in src/lib/credits.ts — spec §6 keys):
--   CREDITS_INCLUDED_PER_PERIOD     default 10000 (10,000 credits/$199/mo; allocated milli = 10,000,000)
--   CREDITS_WARN_REMAINING_PCT        default 15 (status 'low' at <=15% remaining = 1,500 credits = 1,500,000 milli)
--   CREDITS_GRACE_HOURS              default 24 (grace window 24h when remaining hits 0, plus bounded 500-credit overdraft)
--   CREDITS_GRACE_OVERDRAFT_CREDITS  default 500 (max overdraft ≈ $2.50 exposure during grace; overdraft_milli = 500,000)
--   CREDIT_MODEL_WEIGHTS             JSON override of model weights (credits per 1K tokens; unknown model => gpt-4o weights, fail closed)
--   CREDIT_VOICE_WEIGHTS             JSON override of voice weights (credits per call-minute; unknown stack => 26, fail closed)
--   CREDITS_WEIGHTS_VERSION          default 2026-09-cal-v1 (stamped on every usage_event)
--   AI_CREDITS_ENFORCEMENT           default off (metering-only first; enforcement gated on)
--   CHATBOT_EMBED_SECRET              required once the public chatbot token path is enabled