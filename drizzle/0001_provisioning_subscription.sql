CREATE TABLE "phone_number" (
	"id" text PRIMARY KEY NOT NULL,
	"business_id" text NOT NULL,
	"vapi_phone_number_id" text NOT NULL,
	"number" text NOT NULL,
	"server_url" text,
	"provider" text DEFAULT 'twilio',
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscription" (
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
--> statement-breakpoint
CREATE TABLE "usage_ai_call" (
	"id" text PRIMARY KEY NOT NULL,
	"business_id" text NOT NULL,
	"tokens_in" integer DEFAULT 0,
	"tokens_out" integer DEFAULT 0,
	"model" text DEFAULT 'gpt-4o-mini',
	"source" text DEFAULT 'chat',
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "business" ADD COLUMN "vapi_webhook_token" text;--> statement-breakpoint
ALTER TABLE "business" ADD COLUMN "vapi_assistant_id" text;--> statement-breakpoint
ALTER TABLE "business" ADD COLUMN "voice_setup_ready" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "business" ADD COLUMN "voice_provision_state" text DEFAULT 'idle';--> statement-breakpoint
ALTER TABLE "business" ADD COLUMN "voice_provision_error" text;--> statement-breakpoint
ALTER TABLE "business" ADD COLUMN "voice_provisioned_at" timestamp;--> statement-breakpoint
ALTER TABLE "business" ADD COLUMN "category" text DEFAULT '';--> statement-breakpoint
ALTER TABLE "business" ADD COLUMN "onboarding_complete" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "business" ADD COLUMN "status" text DEFAULT 'active';--> statement-breakpoint
ALTER TABLE "business" ADD COLUMN "suspended_at" timestamp;--> statement-breakpoint
ALTER TABLE "phone_number" ADD CONSTRAINT "phone_number_business_id_business_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."business"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription" ADD CONSTRAINT "subscription_business_id_business_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."business"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usage_ai_call" ADD CONSTRAINT "usage_ai_call_business_id_business_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."business"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business" ADD CONSTRAINT "business_vapi_webhook_token_unique" UNIQUE("vapi_webhook_token");