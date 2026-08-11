-- Incremental: align phone_number.provider default with the Vapi-only voice scope.
-- Safe to re-run (ALTER ... SET DEFAULT is idempotent).
ALTER TABLE "phone_number" ALTER COLUMN "provider" SET DEFAULT 'vapi';
