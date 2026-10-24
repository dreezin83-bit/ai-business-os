# Ops Runbook — AI Credit System Environment (Vercel Production)

Applies to the Vercel project behind `www.sagenifyai.com` (project `ai-business-os`,
team `contractor-ai`). Set via `bunx vercel env add <NAME> production --token $VERCEL_TOKEN
--project ai-business-os`; values bind at **next deploy**, not immediately.

## Runtime configuration (all optional — code defaults live in `src/lib/credits.ts`)

| Env var | Prod value (2026-10-14) | Meaning |
|---|---|---|
| `CREDITS_INCLUDED_PER_PERIOD` | `10000` | Monthly included credits per business (owner-approved: 10,000). |
| `CREDITS_WARN_REMAINING_PCT` | `15` | Warn threshold — remaining balance ≤ 15% of the period allowance. |
| `CREDITS_GRACE_HOURS` | `24` | Grace window after exhaustion before hard stop on new billable AI. |
| `CREDITS_GRACE_OVERDRAFT_CREDITS` | `500` | Max negative balance allowed during the grace window (milli-credits safe headroom). |
| `CREDITS_WEIGHTS_VERSION` | `2026-09-cal-v1` | Cost-weights version stamped on every ledger row (`weights_version`). |
| `CHATBOT_EMBED_SECRET` | random 64-hex (created 2026-10-14) | HMAC key for tenant-signed chatbot embed tokens. Regenerate = all embeds must be re-copied. |
| `AI_CREDITS_ENFORCEMENT` | **NOT SET** | `true` = hard enforcement (warn → grace → block). Unset/`false` = **metering-only** (ledger records, no blocks). |

## Enforcement rollout (gated, deliberate)

- Phase 2 shipped in **metering-only** mode: `AI_CREDITS_ENFORCEMENT` is unset in
  production, so `usage_event` rows and balances are recorded but nothing is blocked.
- Before flipping enforcement on:
  1. Confirm 0006 is applied (`bun run db:verify`), real usage has been captured,
     and margin math on real provider costs looks right (KPI: provider cost per
     tenant safely below $199/mo).
  2. Set `AI_CREDITS_ENFORCEMENT=true` in the Vercel prod env and deploy.
  3. Verify the warn/grace/stop ladder on a test tenant before broad rollout.
- Active calls are **never** dropped mid-conversation on exhaustion (business-plan
  rule) — enforcement only stops *new* expensive AI work.
- Authorized credit grants (owner/admin) are the only refill path; Flutterwave
  top-up purchasing is explicitly out of scope until usage data exists.

## Ledger audit columns

`usage_event` rows must include: tokens, voice usage, provider, model, operation,
cost weight + `weights_version`, tenant, billing period, idempotency/correlation id.
Balances are stored as integer **milli-credits**; consumption is atomic, concurrency-safe,
and idempotent (retries never double-charge).

## Verify state quickly

```bash
DATABASE_URL="$DATABASE_URL" bun run db:verify          # PASS = migrations in sync
DATABASE_URL="$DATABASE_URL" bunx drizzle-kit check      # schema.ts == live DB
```