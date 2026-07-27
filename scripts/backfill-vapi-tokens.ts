/**
 * One-off script: add vapi_webhook_token column, backfill existing businesses,
 * and add a unique index.
 */
import { neon } from "@neondatabase/serverless";

const DATABASE_URL = process.env.DATABASE_URL!;
const sql = neon(DATABASE_URL);

async function generateToken(): Promise<string> {
  // Generate a cryptographically random 32-char hex token
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join("");
}

async function main() {
  console.log("[backfill] Starting...");

  // 1. Add column (safe to run if already exists with IF NOT EXISTS)
  try {
    await sql`ALTER TABLE business ADD COLUMN IF NOT EXISTS vapi_webhook_token TEXT`;
    console.log("[backfill] Column added (or already exists)");
  } catch (err: any) {
    console.log("[backfill] Column add error (may already exist):", err.message);
  }

  // 2. Backfill NULL tokens
  const rows = await sql`SELECT id, vapi_webhook_token FROM business WHERE vapi_webhook_token IS NULL`;
  console.log(`[backfill] ${rows.length} businesses need tokens`);

  for (const row of rows as any[]) {
    const token = await generateToken();
    await sql`UPDATE business SET vapi_webhook_token = ${token} WHERE id = ${row.id}`;
    console.log(`[backfill] Business ${row.id} → token: ${token}`);
  }

  // 3. Add unique index (safe if already exists)
  try {
    await sql`CREATE UNIQUE INDEX IF NOT EXISTS business_vapi_webhook_token_unique ON business (vapi_webhook_token)`;
    console.log("[backfill] Unique index created");
  } catch (err: any) {
    console.log("[backfill] Index error (may already exist):", err.message);
  }

  console.log("[backfill] Done.");
}

main().catch(console.error);
