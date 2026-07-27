import { neon } from "@neondatabase/serverless";
const sql = neon(process.env.DATABASE_URL!);
async function main() {
  await sql`ALTER TABLE business ADD COLUMN IF NOT EXISTS vapi_phone_number_id TEXT`;
  await sql`ALTER TABLE business ADD COLUMN IF NOT EXISTS vapi_phone_number TEXT`;
  await sql`ALTER TABLE business ADD COLUMN IF NOT EXISTS vapi_assistant_id TEXT`;
  console.log("Columns added.");
}
main().catch(console.error);
