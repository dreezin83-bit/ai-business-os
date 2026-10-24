-- 0007_early_bird_pricing
-- Owner pricing decision 2026-10-24 (plan rev 13): $199/mo early-bird from
-- month 1; $1,194 / 6 months; $2,268 / year (5% off); $299/mo standard list.
-- This migration adds:
--   1. Per-tenant price-lock columns on subscription (locked tenants always
--      bill on the early-bird plan; standard activation must skip them).
--   2. A durable single-row early-bird enrollment counter (cap = 10,000).
--      Powerful: the counter is a REAL, enforced supplier of the "first
--      10,000 users — Ending Soon" deadline. Candidate claims atomically
--      (enrolled < cap) so concurrent enrollments cannot overshoot.
--
-- Idempotent: IF NOT EXISTS / ON CONFLICT DO NOTHING (migration runner also
-- tracks the filename, so this file applies once).
--
-- NOTE: keep this file free of dollar-quoted strings — the team migration
-- runner's statement splitter does not support them.

-- ── Per-tenant "for life" price lock ──────────────────────────────────────
ALTER TABLE subscription
  ADD COLUMN IF NOT EXISTS price_locked_at timestamptz,
  ADD COLUMN IF NOT EXISTS locked_plan text;

-- ── Early-bird enrollment counter (single row, id = 1) ─────────────────────
CREATE TABLE IF NOT EXISTS early_bird_counter (
  id         integer PRIMARY KEY CHECK (id = 1),
  enrolled   integer NOT NULL DEFAULT 0,
  cap        integer NOT NULL DEFAULT 10000,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO early_bird_counter (id, enrolled, cap)
VALUES (1, 0, 10000)
ON CONFLICT (id) DO NOTHING;