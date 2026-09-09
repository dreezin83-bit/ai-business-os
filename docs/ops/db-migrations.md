# Ops Runbook — Database Migrations (Neon + Drizzle)

Applies to the production Neon database behind `www.sagenifyai.com`.

## Quick answers

| Question | Answer |
|---|---|
| Migrations already applied (as of 2026-09-09) | `0000_add_missing_ai_brain_columns.sql`, `0002_perf_indexes.sql`, `0003_paystack_subscription.sql`, `0004_core_operations.sql`, `0005_phone_provider_vapi.sql` — all recorded in `schema_migrations` |
| Is 0001 missing? | Yes — there is **no 0001** file. The sequence is `0000, 0002, 0003, 0004, 0005` (0001 was never generated / squashed during history cleanup). Migrations are applied in filename order, so the gap is harmless. The next migration should be `0006_*.sql`. |
| How do I apply pending migrations? | `DATABASE_URL=... bun run db:migrate` (idempotent, tracks in `schema_migrations`) |
| How do I check for drift without applying? | `bun run db:verify` (exit 1 if anything is pending) |
| How do I check schema.ts vs DB? | `bunx drizzle-kit check` (exit non-zero on drift) |
| Is a CI gate wired? | Yes — `.github/workflows/db-verify.yml` runs `db:verify` + `drizzle-kit check` on every PR to `main` **once the repo has a `DATABASE_URL` secret**. |

## When to migrate

Run `db:migrate` **before deploying** any change that adds a new file to
`drizzle/` (a schema change). Sequence for a safe release:

1. Merge the schema change (SQL migration file + code) to `main`.
2. **Before or immediately after** the production deploy, from a machine
   with production DB access:

   ```bash
   DATABASE_URL="postgres://..." bun run db:migrate
   ```

3. Confirm no pending migrations remain:

   ```bash
   DATABASE_URL="postgres://..." bun run db:verify   # should print PASS
   ```

4. If CI's `db-verify` job is enabled (DATABASE_URL secret present), the PR
   already gates this for you.

## Why migrations are NOT run by the build

Running `db:migrate` in the Vercel build, a postinstall hook, or at server
boot was deliberately **not** chosen:

- A failing or slow migration would block / roll back **every** production
  build, including unrelated hotfixes.
- Preview deploys (one per PR/branch) would each attempt migrations against
  the shared production DB — racing each other and mutating prod from
  unreviewed code.
- The audit requirement is that drift **fails loudly without risking the
  deploy path**. That is what `db:verify` + the CI-only gate provide: the
  deploy pipeline stays safe, and drift is caught at PR time or by a human
  runbook step.

## References

- Migration runner: `scripts/migrate.ts` (`bun run db:migrate`)
- Drift check: `scripts/verify_migrations.ts` (`bun run db:verify`)
- CI gate: `.github/workflows/db-verify.yml`
- Schema: `src/db/schema.ts`; Drizzle config: `drizzle.config.ts`