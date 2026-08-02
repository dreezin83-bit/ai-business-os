# Database Migrations

## Workflow

### 1. Edit schema
Modify `src/db/schema.ts` with new tables, columns, or changes.

### 2. Generate migration
```bash
npm run db:generate -- --name <descriptive-name>
```
This creates a new `.sql` file in `drizzle/` with the diff.

### 3. Apply migrations
```bash
DATABASE_URL="..." npm run db:migrate
```

For dry-run (preview without applying):
```bash
DATABASE_URL="..." npm run db:migrate -- --dry-run
```

## How it works
- `drizzle-kit generate` diffs the current schema against the migration snapshot in `drizzle/meta/` and produces a `.sql` file.
- `scripts/migrate.ts` reads all `.sql` files in `drizzle/`, checks `_drizzle_migrations` table, and applies pending migrations in filename order inside transactions.
- Each migration is applied atomically: BEGIN → SQL → INSERT tracking → COMMIT. On failure: ROLLBACK.

## Migration tracking
The table `_drizzle_migrations` records which migrations have been applied. Safe to re-run — already-applied migrations are skipped.

## Production
For the initial production deploy, run all migrations before the first deploy:
```bash
DATABASE_URL="<neon-url>" npm run db:migrate
```

Subsequent deploys should run migrations as part of the deploy pipeline (e.g., Vercel build step or post-deploy script).
