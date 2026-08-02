#!/usr/bin/env tsx
/**
 * Drizzle migration runner for Neon (serverless PostgreSQL).
 * 
 * Usage:
 *   bun run db:migrate              # apply all pending migrations
 *   bun run db:migrate -- --dry-run  # preview without applying
 *
 * Prerequisites:
 *   DATABASE_URL must be set in the environment.
 *   Migrations live in ./drizzle/ as .sql files, sorted by filename.
 */
import { readdirSync, readFileSync } from "fs";
import { join } from "path";
import { Pool } from "@neondatabase/serverless";

const DRY_RUN = process.argv.includes("--dry-run");
const MIGRATIONS_DIR = join(import.meta.dirname || __dirname, "..", "drizzle");

async function main() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error("❌ DATABASE_URL not set");
    process.exit(1);
  }

  const pool = new Pool({ connectionString: dbUrl });

  // Find all .sql migration files, sorted
  const files = readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith(".sql"))
    .sort();

  if (files.length === 0) {
    console.log("No migrations found.");
    await pool.end();
    return;
  }

  // Ensure migrations tracking table exists
  await pool.query(`
    CREATE TABLE IF NOT EXISTS _drizzle_migrations (
      name TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  // Get already-applied migrations
  const { rows: applied } = await pool.query(
    "SELECT name FROM _drizzle_migrations"
  );
  const appliedSet = new Set(applied.map(r => r.name as string));

  let appliedCount = 0;

  for (const file of files) {
    if (appliedSet.has(file)) {
      console.log(`⏭️  Skipped (already applied): ${file}`);
      continue;
    }

    const sql = readFileSync(join(MIGRATIONS_DIR, file), "utf-8");

    if (DRY_RUN) {
      console.log(`📋 [DRY RUN] Would apply: ${file} (${sql.split("\n").length} statements)`);
      continue;
    }

    try {
      await pool.query("BEGIN");
      await pool.query(sql);
      await pool.query(
        "INSERT INTO _drizzle_migrations (name) VALUES ($1)",
        [file]
      );
      await pool.query("COMMIT");
      console.log(`✅ Applied: ${file}`);
      appliedCount++;
    } catch (err) {
      await pool.query("ROLLBACK");
      console.error(`❌ Failed: ${file} — ${err instanceof Error ? err.message : err}`);
      await pool.end();
      process.exit(1);
    }
  }

  if (appliedCount === 0 && !DRY_RUN) {
    console.log("All migrations already applied.");
  }

  if (DRY_RUN) {
    console.log(`📋 Dry run complete — ${files.filter(f => !appliedSet.has(f)).length} pending`);
  } else {
    console.log(`✅ Done — ${appliedCount} migration(s) applied`);
  }

  await pool.end();
}

main().catch(err => {
  console.error("❌ Migration failed:", err);
  process.exit(1);
});
