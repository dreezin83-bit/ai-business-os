-- Migration: Add indexes for cross-tenant analytics queries
-- These indexes accelerate the Super Admin dashboard queries
-- which aggregate across all tenants without business_id filtering.

-- Business table: accelerate status/category/date filtering
CREATE INDEX IF NOT EXISTS idx_business_status ON business (status);
CREATE INDEX IF NOT EXISTS idx_business_category ON business (category);
CREATE INDEX IF NOT EXISTS idx_business_created_at ON business (created_at);
CREATE INDEX IF NOT EXISTS idx_business_onboarding_complete ON business (onboarding_complete);

-- Subscription: accelerate active subscription queries and plan grouping
CREATE INDEX IF NOT EXISTS idx_subscription_status ON subscription (status);
CREATE INDEX IF NOT EXISTS idx_subscription_plan ON subscription (plan);

-- Usage AI calls: accelerate date-range scans and per-business aggregation
CREATE INDEX IF NOT EXISTS idx_usage_ai_call_created_at ON usage_ai_call (created_at);
CREATE INDEX IF NOT EXISTS idx_usage_ai_call_business_id ON usage_ai_call (business_id);

-- Communication log: accelerate date-range and type filtering
CREATE INDEX IF NOT EXISTS idx_communication_log_sent_at ON communication_log (sent_at);
CREATE INDEX IF NOT EXISTS idx_communication_log_type ON communication_log (type);

-- Lead: accelerate date-range and status filtering
CREATE INDEX IF NOT EXISTS idx_lead_created_at ON lead (created_at);
CREATE INDEX IF NOT EXISTS idx_lead_status ON lead (status);

-- Appointment: accelerate date-range and status filtering
CREATE INDEX IF NOT EXISTS idx_appointment_created_at ON appointment (created_at);
CREATE INDEX IF NOT EXISTS idx_appointment_status ON appointment (status);

-- Conversation: accelerate date-range and status filtering
CREATE INDEX IF NOT EXISTS idx_conversation_created_at ON conversation (created_at);
CREATE INDEX IF NOT EXISTS idx_conversation_status ON conversation (status);
