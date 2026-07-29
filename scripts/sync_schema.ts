import { neon } from "@neondatabase/serverless";
const sql = neon(process.env.DATABASE_URL!);

async function main() {
  // Create phone_number table
  await sql`
    CREATE TABLE IF NOT EXISTS phone_number (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL REFERENCES business(id) ON DELETE CASCADE,
      vapi_phone_number_id TEXT NOT NULL,
      number TEXT NOT NULL,
      server_url TEXT,
      provider TEXT DEFAULT 'twilio',
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;
  console.log("phone_number table ready.");

  // Add voice_setup_ready to business table
  await sql`ALTER TABLE business ADD COLUMN IF NOT EXISTS voice_setup_ready BOOLEAN DEFAULT FALSE`;
  console.log("voice_setup_ready column ready.");

  // Add onboarding columns to business table
  await sql`ALTER TABLE business ADD COLUMN IF NOT EXISTS category TEXT DEFAULT ''`;
  console.log("category column ready.");

  await sql`ALTER TABLE business ADD COLUMN IF NOT EXISTS onboarding_complete BOOLEAN DEFAULT FALSE`;
  console.log("onboarding_complete column ready.");

  // ── New: admin-related columns & tables ──────────────────
  await sql`ALTER TABLE business ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active'`;
  console.log("business.status column ready.");

  await sql`ALTER TABLE business ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMP`;
  console.log("business.suspended_at column ready.");

  // Subscription table
  await sql`
    CREATE TABLE IF NOT EXISTS subscription (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL REFERENCES business(id) ON DELETE CASCADE,
      plan TEXT DEFAULT 'starter',
      status TEXT DEFAULT 'active',
      amount INTEGER DEFAULT 0,
      currency TEXT DEFAULT 'usd',
      interval TEXT DEFAULT 'month',
      flutterwave_sub_id TEXT,
      current_period_start TIMESTAMP,
      current_period_end TIMESTAMP,
      canceled_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `;
  console.log("subscription table ready.");

  // Usage AI calls table
  await sql`
    CREATE TABLE IF NOT EXISTS usage_ai_call (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL REFERENCES business(id) ON DELETE CASCADE,
      tokens_in INTEGER DEFAULT 0,
      tokens_out INTEGER DEFAULT 0,
      model TEXT DEFAULT 'gpt-4o-mini',
      source TEXT DEFAULT 'chat',
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;
  console.log("usage_ai_call table ready.");
}

main().catch(console.error);
