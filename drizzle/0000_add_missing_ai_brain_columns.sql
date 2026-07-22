ALTER TABLE "ai_brain_config" ADD COLUMN IF NOT EXISTS "lead_collection_rules" text DEFAULT '';
ALTER TABLE "ai_brain_config" ADD COLUMN IF NOT EXISTS "appointment_booking_rules" text DEFAULT '';
ALTER TABLE "ai_brain_config" ADD COLUMN IF NOT EXISTS "response_style" text DEFAULT '';
ALTER TABLE "ai_brain_config" ADD COLUMN IF NOT EXISTS "escalation_rules" text DEFAULT '';
