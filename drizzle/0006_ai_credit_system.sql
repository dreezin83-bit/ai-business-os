-- 0006_ai_credit_system.sql
-- Tenant AI credit system (Phase 2, owner-ratified 2026-09-19).
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
  "allocated" INTEGER NOT NULL DEFAULT 10000,     -- monthly included credits (owner: 10,000/$199)
  "consumed" INTEGER NOT NULL DEFAULT 0,          -- credits consumed this period
  "remaining" INTEGER NOT NULL DEFAULT 10000,     -- allocated - consumed (maintained in same txn; never negative)
  "status" TEXT NOT NULL DEFAULT 'active',        -- active | low | exhausted
  "exhausted_at" TIMESTAMPTZ,                     -- when remaining hit 0 (grace window anchor)
  "grace_until" TIMESTAMPTZ,                      -- 24h grace end for active workflows
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE ("business_id", "period_start_at")       -- one wallet row per business per period; idempotent open
);
CREATE INDEX IF NOT EXISTS "idx_credit_account_business" ON "credit_account" ("business_id");

-- ── Usage event: canonical append-only ledger (per ANALYTICS-DATA-CONTRACT.md) ──
CREATE TABLE IF NOT EXISTS "usage_event" (
  "id" TEXT PRIMARY KEY,
  "business_id" TEXT NOT NULL REFERENCES "business"("id") ON DELETE CASCADE,
  "occurred_at" TIMESTAMPTZ NOT NULL,
  "ingested_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "event_type" TEXT NOT NULL,                     -- ai.completion | ai.lead_extraction | voice.call.minutes | ai.call.completed
  "source" TEXT NOT NULL,                         -- chat | chatbot | commander | email | lead_extractor | voice
  "quantity" INTEGER NOT NULL DEFAULT 1,          -- tokens | calls | seconds (raw provider unit)
  "unit" TEXT NOT NULL,                           -- token | call | second
  "credits" INTEGER NOT NULL DEFAULT 0,           -- credits charged (central cost service output)
  "provider" TEXT NOT NULL,                       -- openai | vapi
  "model" TEXT,                                   -- gpt-4o-mini | gpt-4o | ...
  "correlation_id" TEXT NOT NULL DEFAULT '',      -- groups secondary costs (lead extraction) with the primary turn
  "idempotency_key" TEXT NOT NULL,                -- unique per (business, source, provider external id / turn id)
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
  "amount" INTEGER NOT NULL,                      -- positive = grant, negative = clawback/refund
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
  "included_credits" INTEGER NOT NULL DEFAULT 0,
  "granted_credits" INTEGER NOT NULL DEFAULT 0,
  "consumed_credits" INTEGER NOT NULL DEFAULT 0,
  "remaining_credits" INTEGER NOT NULL DEFAULT 0,
  "calculation_version" TEXT NOT NULL DEFAULT 'v1',
  "generated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE ("business_id", "period_start_at", "period_end_at")  -- idempotent rerun never duplicates
);
CREATE INDEX IF NOT EXISTS "idx_period_snapshot_business" ON "period_snapshot" ("business_id");

-- ENV contract (set in Vercel; documented in .env.example):
--   AI_CREDITS_PER_PERIOD   default 10000 (owner: 10,000 credits/$199/mo)
--   AI_CREDIT_WARN_RATIO    default 0.15 (warn at <=15% remaining)
--   AI_CREDIT_GRACE_MS      default 86400000 (24h grace window)
--   AI_CREDITS_ENFORCEMENT  default off (metering-only first; enforcement gated on)
--   CHATBOT_EMBED_SECRET    required once the public chatbot token path is enabled
--   AI_MODEL_WEIGHT_GPT4O   default 4 (model weight multipliers live in src/lib/credits.ts, config-driven)