ALTER TABLE "business" ADD COLUMN "vapi_webhook_token" text;--> statement-breakpoint
ALTER TABLE "business" ADD CONSTRAINT "business_vapi_webhook_token_unique" UNIQUE("vapi_webhook_token");