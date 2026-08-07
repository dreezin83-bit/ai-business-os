-- Migration: Core operations features — billing/provisioning timeline,
-- AI call history, human handoff/escalation inbox, per-business AI reply
-- templates, and appointment cancel/reschedule fields.
-- All statements use IF NOT EXISTS — safe idempotent re-runs.

-- ── 1. Status timeline (billing + Vapi provisioning) ─────────────
CREATE TABLE IF NOT EXISTS status_timeline (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL REFERENCES business(id) ON DELETE CASCADE,
  scope TEXT NOT NULL DEFAULT 'billing',   -- billing | provisioning
  event TEXT NOT NULL,
  detail TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'info',     -- success | pending | failed | info
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_status_timeline_business_id ON status_timeline (business_id);
CREATE INDEX IF NOT EXISTS idx_status_timeline_biz_created ON status_timeline (business_id, created_at DESC);

-- ── 2. AI voice call history ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_call (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL REFERENCES business(id) ON DELETE CASCADE,
  call_id TEXT NOT NULL UNIQUE,
  customer_phone TEXT DEFAULT '',
  customer_name TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'ended',    -- queued | ringing | in-progress | ended
  ended_reason TEXT DEFAULT '',
  summary TEXT DEFAULT '',
  outcome TEXT NOT NULL DEFAULT 'unknown', -- lead_created | appointment_booked | no_action | unknown
  recording_url TEXT DEFAULT '',
  duration_seconds INTEGER DEFAULT 0,
  message_count INTEGER DEFAULT 0,
  started_at TIMESTAMP,
  ended_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ai_call_business_id ON ai_call (business_id);
CREATE INDEX IF NOT EXISTS idx_ai_call_biz_started ON ai_call (business_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_call_outcome ON ai_call (outcome);

-- ── 3. Human handoff / escalation inbox ─────────────────────────
CREATE TABLE IF NOT EXISTS handoff (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL REFERENCES business(id) ON DELETE CASCADE,
  lead_id TEXT REFERENCES lead(id) ON DELETE SET NULL,
  conversation_id TEXT REFERENCES conversation(id) ON DELETE SET NULL,
  customer_name TEXT DEFAULT '',
  customer_phone TEXT DEFAULT '',
  customer_email TEXT DEFAULT '',
  reason TEXT DEFAULT '',
  summary TEXT DEFAULT '',
  assigned_to TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending',  -- pending | assigned | resolved
  priority TEXT NOT NULL DEFAULT 'normal', -- normal | high
  notes TEXT DEFAULT '',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  resolved_at TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_handoff_business_id ON handoff (business_id);
CREATE INDEX IF NOT EXISTS idx_handoff_biz_status ON handoff (business_id, status);
CREATE INDEX IF NOT EXISTS idx_handoff_biz_created ON handoff (business_id, created_at DESC);

-- ── 4. Per-business editable AI reply templates ────────────────
ALTER TABLE ai_brain_config ADD COLUMN IF NOT EXISTS reply_templates TEXT DEFAULT '';

-- ── 5. Appointment cancel / reschedule fields ───────────────────
ALTER TABLE appointment ADD COLUMN IF NOT EXISTS cancel_reason TEXT DEFAULT '';
ALTER TABLE appointment ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP;

-- ── 6. Last-call tracking on business ───────────────────────────
ALTER TABLE business ADD COLUMN IF NOT EXISTS last_call_at TIMESTAMP;
