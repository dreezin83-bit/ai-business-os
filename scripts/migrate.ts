/**
 * db:migrate — apply Drizzle SQL migrations (drizzle/0000–0004) to the target database.
 *
 * Usage:
 *   DATABASE_URL="postgresql://..." bun run db:migrate
 *
 * For production (Neon):
 *   - Pull env:  `vercel env pull .env.production.local` (or export DATABASE_URL directly)
 *   - Run:       `DATABASE_URL="$(grep DATABASE_URL .env.production.local | cut -d= -f2-)" bun run db:migrate`
 *
 * Behavior:
 *   - Applies every `drizzle/*.sql` migration in filename order (0000, 0002, 0003, 0004).
 *   - Tracks applied files in a `schema_migrations` table, so re-runs are no-ops for
 *     already-applied migrations.
 *   - The migration files themselves are idempotent (IF NOT EXISTS), so even a
 *     partially-failed run can be safely re-applied.
 */
import { neon } from "@neondatabase/serverless";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("db:migrate requires DATABASE_URL (e.g. DATABASE_URL=postgres://... bun run db:migrate)");
  process.exit(1);
}

const MIGRATIONS_DIR = path.join(process.cwd(), "drizzle");

function splitStatements(sqlText: string): string[] {
  // Safe for the current migrations: they contain only ALTER/CREATE statements with
  // no semicolons inside string literals.
  return sqlText
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

async function main(): Promise<void> {
  const sql = neon(DATABASE_URL);
  console.log("db:migrate — target:", new URL(DATABASE_URL).host);

  // Tracking table (safe to run every time)
  await sql.query(
    "CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())"
  );
  const appliedRows = (await sql.query(
    "SELECT name FROM schema_migrations"
  )) as unknown as { name: string }[];
  const applied = new Set(appliedRows.map((r) => r.name));

  const files = (await readdir(MIGRATIONS_DIR)).filter((f) => f.endsWith(".sql")).sort();
  if (files.length === 0) {
    console.log("No SQL migrations found in", MIGRATIONS_DIR);
    return;
  }

  let appliedCount = 0;
  let skippedCount = 0;

  for (const file of files) {
    if (applied.has(file)) {
      skippedCount += 1;
      console.log(`SKIP  ${file} (already applied)`);
      continue;
    }
    const content = await readFile(path.join(MIGRATIONS_DIR, file), "utf-8");
    const statements = splitStatements(content);
    console.log(`APPLY ${file} (${statements.length} statement${statements.length === 1 ? "" : "s"}) ...`);
    for (const statement of statements) {
      await sql.query(statement);
    }
    await sql.query("INSERT INTO schema_migrations (name) VALUES ($1)", [file]);
    appliedCount += 1;
    console.log(`  ✓ ${file} applied`);
  }

  console.log(`\ndb:migrate complete — ${appliedCount} applied, ${skippedCount} skipped (total ${files.length}).`);
  if (appliedCount === 0) console.log("Database is up to date.");
}

main().catch((err: unknown) => {
  const e = err instanceof Error ? err : new Error(String(err));
  console.error("db:migrate FAILED:", e.message);
  process.exit(1);
});
