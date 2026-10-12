/**
 * db:migrate — apply Drizzle SQL migrations (drizzle/0000–0005) to the target database.
 *
 * Usage:
 *   DATABASE_URL="postgresql://..." bun run db:migrate
 *
 * For production (Neon):
 *   - Pull env:  `vercel env pull .env.production.local` (or export DATABASE_URL directly)
 *   - Run:       `DATABASE_URL="$(grep DATABASE_URL .env.production.local | cut -d= -f2-)" bun run db:migrate`
 *
 * Behavior:
 *   - Applies every `drizzle/*.sql` migration in filename order (0000, 0002, 0003, 0004, 0005;
 *     there is no 0001 file — the gap is historical and harmless).
 *   - Tracks applied files in a `schema_migrations` table, so re-runs are no-ops for
 *     already-applied migrations.
 *   - The migration files themselves are idempotent (IF NOT EXISTS), so even a
 *     partially-failed run can be safely re-applied.
 *   - Statement splitting is comment/quote-aware: semicolons inside `--` comments
 *     or single-quoted literals never terminate a statement (migration 0006
 *     relies on this). Pure-comment fragments are dropped, not sent to the DB.
 *
 * To CHECK for drift without applying, use `bun run db:verify` (scripts/verify_migrations.ts).
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
  // Splits on top-level semicolons only. Semicolons inside single-quoted string
  // literals (e.g. DEFAULT '') or `--` line comments are legal PostgreSQL and
  // must not terminate a statement — migration 0006 uses them in its header and
  // column comments. Standard SQL quote escaping ('' inside a literal) is
  // handled, so both DEFAULT '' and 'it''s' parse correctly.
  // NOTE: dollar-quoted strings are not supported — keep them out of new
  // migrations. Pure-comment chunks (no-op fragments) are dropped rather than
  // sent to the server as empty queries.
  const statements: string[] = [];
  let current = "";
  let inString = false;
  let i = 0;
  const n = sqlText.length;

  const push = () => {
    const stmt = current.trim();
    if (stmt.length > 0 && !isCommentOnly(stmt)) statements.push(stmt);
    current = "";
  };

  while (i < n) {
    const ch = sqlText[i];
    const next = sqlText[i + 1];

    if (inString) {
      current += ch;
      if (ch === "'") {
        if (next === "'") {
          current += next; // escaped quote ('' inside a literal)
          i += 2;
          continue;
        }
        inString = false;
      }
      i += 1;
      continue;
    }

    if (ch === "-" && next === "-") {
      // `--` line comment: copied verbatim (comments are valid SQL text) but a
      // semicolon inside one is never treated as a statement boundary.
      current += ch + next;
      i += 2;
      while (i < n && sqlText[i] !== "\n") {
        current += sqlText[i];
        i += 1;
      }
      continue;
    }

    if (ch === "'") {
      inString = true;
      current += ch;
      i += 1;
      continue;
    }

    if (ch === ";") {
      push();
      i += 1;
      continue;
    }

    current += ch;
    i += 1;
  }
  push();
  return statements;
}

function isCommentOnly(stmt: string): boolean {
  // True when every non-blank line starts with `--` (a harmless no-op chunk).
  return stmt.split("\n").every((line) => {
    const trimmed = line.trim();
    return trimmed.length === 0 || trimmed.startsWith("--");
  });
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
