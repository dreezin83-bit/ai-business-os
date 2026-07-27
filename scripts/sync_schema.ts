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
}
main().catch(console.error);
