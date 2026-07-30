-- Migration: Performance indexes for backend optimization
-- Accelerates the most common query patterns across all API routes.

-- Foreign key indexes (for JOINs and lookups)
CREATE INDEX IF NOT EXISTS idx_lead_business_id ON lead (business_id);
CREATE INDEX IF NOT EXISTS idx_appointment_business_id ON appointment (business_id);
CREATE INDEX IF NOT EXISTS idx_conversation_business_id ON conversation (business_id);
CREATE INDEX IF NOT EXISTS idx_message_conversation_id ON message (conversation_id);
CREATE INDEX IF NOT EXISTS idx_usage_ai_call_business_id ON usage_ai_call (business_id);
CREATE INDEX IF NOT EXISTS idx_communication_log_business_id ON communication_log (business_id);
CREATE INDEX IF NOT EXISTS idx_ai_brain_config_business_id ON ai_brain_config (business_id);
CREATE INDEX IF NOT EXISTS idx_subscription_business_id ON subscription (business_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_document_business_id ON knowledge_document (business_id);

-- Date/status indexes for filtered queries (dashboard stats, lead lists)
CREATE INDEX IF NOT EXISTS idx_lead_status ON lead (status);
CREATE INDEX IF NOT EXISTS idx_lead_created_at ON lead (created_at);
CREATE INDEX IF NOT EXISTS idx_appointment_date ON appointment (date);
CREATE INDEX IF NOT EXISTS idx_appointment_status ON appointment (status);
CREATE INDEX IF NOT EXISTS idx_conversation_created_at ON conversation (created_at);
CREATE INDEX IF NOT EXISTS idx_conversation_status ON conversation (status);
CREATE INDEX IF NOT EXISTS idx_usage_ai_call_created_at ON usage_ai_call (created_at);
CREATE INDEX IF NOT EXISTS idx_communication_log_sent_at ON communication_log (sent_at);
CREATE INDEX IF NOT EXISTS idx_communication_log_type ON communication_log (type);

-- Composite indexes for frequent combined filters
CREATE INDEX IF NOT EXISTS idx_appointment_biz_date_status ON appointment (business_id, date, status);
CREATE INDEX IF NOT EXISTS idx_lead_biz_status ON lead (business_id, status);
