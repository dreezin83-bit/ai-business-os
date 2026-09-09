/**
 * db:verify — fail-loudly migration drift check (read-only).
 *
 * Purpose:
 *   The deploy pipeline should never silently ship code that expects a newer
 *   schema than the database has. This script verifies that every migration
 *   file in drizzle/ has been recorded as applied in the target database and
 *   exits non-zero otherwise, so CI or a human can gate a deploy on it.
 *
 * Usage:
 *   DATABASE_URL=postgres://... bun run db:verify
 *
 * Behavior:
 *   - READ-ONLY: never creates tables, never writes rows.
 *   - Fails (exit 1) if:
 *       • DATABASE_URL is missing
 *       • the database is unreachable
 *       • schema_migrations does not exist (migrations were never run)
 *       • any drizzle/*.sql file has NOT been applied yet (pending drift)
 *   - Warns (but does not fail) if schema_migrations records a file that is no
 *     longer present in drizzle/ (deleted migration) — surface it for review.
 *   - Prints a summary and exits 0 when everything is in sync.
 *
 * This is deliberately separate from scripts/migrate.ts: migrate applies,
 * verify checks. Keep it dependency-light (only @neondatabase/serverless,
 * already a production dependency).
 */
import { neon } from "@neondatabase/serverless";
import { readdir } from "node:fs/promises";
import path from "node:path";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("db:verify requires DATABASE_URL (e.g. DATABASE_URL=postgres://... bun run db:verify)");
  process.exit(1);
}

const MIGRATIONS_DIR = path.join(process.cwd(), "drizzle");

async function main(): Promise<void> {
  const sql = neon(DATABASE_URL);
  console.log("db:verify — target:", new URL(DATABASE_URL).host);

  const files = (await readdir(MIGRATIONS_DIR)).filter((f) => f.endsWith(".sql")).sort();
  if (files.length === 0) {
    console.error("FAIL — no migration files found in", MIGRATIONS_DIR);
    process.exit(1);
  }

  // Read-only check: does the tracking table exist at all?
  const tracking = (await sql.query(
    "SELECT to_regclass('public.schema_migrations') AS tbl"
  )) as unknown as { tbl: string | null }[];
  if (!tracking[0]?.tbl) {
    console.error(
      `FAIL — schema_migrations table does not exist on ${new URL(DATABASE_URL).host}. ` +
        "Migrations have never been applied here. Run: DATABASE_URL=... bun run db:migrate"
    );
    process.exit(1);
  }

  const appliedRows = (await sql.query("SELECT name FROM schema_migrations")) as unknown as {
    name: string;
  }[];
  const applied = new Set(appliedRows.map((r) => r.name));

  const pending = files.filter((f) => !applied.has(f));
  const orphaned = [...applied].filter((f) => !files.includes(f)); // recorded but file gone

  for (const f of files) {
    console.log(applied.has(f) ? `  OK    ${f}` : `  PEND  ${f}`);
  }

  if (orphaned.length > 0) {
    console.warn(`WARN — recorded in schema_migrations but missing from drizzle/: ${orphaned.join(", ")}`);
    console.warn("      (a migration file was deleted/renamed after being applied; please review history)");
  }

  if (pending.length > 0) {
    console.error(
      `FAIL — ${pending.length} pending migration(s): ${pending.join(", ")}. ` +
        "The database is behind the migration files. Apply them first: DATABASE_URL=... bun run db:migrate"
    );
    process.exit(1);
  }

  console.log(`PASS — ${files.length} migration(s) applied, database is in sync with drizzle/.`);
}

main().catch((err: unknown) => {
  const e = err instanceof Error ? err : new Error(String(err));
  console.error("db:verify FAILED:", e.message);
  process.exit(1);
});