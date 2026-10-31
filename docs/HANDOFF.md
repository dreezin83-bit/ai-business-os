# Sagenify AI — Engineering Handoff

**Written 2026-10-31.** This document exists so that anyone picking this project up — a new developer, another AI builder, or a future team — can start from facts instead of guessing. It describes the system as it actually is, including what is broken.

---

## 1. What this product is

A white-label, multi-tenant SaaS for service businesses (HVAC, roofing, plumbing, dental, law firms). Each customer workspace gets: an AI website chatbot, an AI phone receptionist, CRM/lead management, appointment booking, email automation, a knowledge base, reporting, and a credit-metered AI usage system.

Sold at **$199/month early-bird** (6 months = $1,194, yearly = $2,268), with a **$299/month** standard list price shown as a crossed-out anchor. The "first 10,000 users" line is a **promotion, not a cap** — nothing should block or reprice signups at that number.

**No real money has ever moved through this system.** Flutterwave is wired end to end but running on **test keys** only.

---

## 2. Where everything lives

| Thing | Where | Notes |
|---|---|---|
| Application code | GitHub: `dreezin83-bit/ai-business-os` | Next.js 15 (App Router), TypeScript, bun |
| Production hosting | Vercel, project serving `www.sagenifyai.com` | Root domain also answers; `app.sagenifyai.com` does **not** resolve |
| Database | Neon Postgres, `ep-wandering-moon-at69d6x4` (AWS us-east-1) | 7 migrations applied and verified in sync |
| Auth | Clerk | Orgs = tenants. Middleware enforces 307 redirects |
| Payments | Flutterwave (TEST keys) | Checkout, recurring subs, webhooks |
| Voice | Vapi | Paid tenants only, per-workspace isolation |
| Email | Resend | Inbound + outbound |
| File uploads | UploadThing | |
| Marketing landing page | Static front end in the team's workspace | Separate from the Next.js app |

---

## 3. Environment variables

The app reads these via `process.env`. **Names only — no values are recorded here.** Set them in Vercel (Production *and* Preview) and in a local `.env` for development.

### Required for the app to boot
| Variable | Purpose | Where to get it |
|---|---|---|
| `DATABASE_URL` | Postgres connection string | Neon console → Connection string |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk client key | Clerk dashboard → API keys |
| `CLERK_SECRET_KEY` | Clerk server key | Clerk dashboard → API keys |
| `NEXT_PUBLIC_APP_URL` | Canonical app URL (`https://www.sagenifyai.com`) | — |
| `NEXT_PUBLIC_SITE_URL` | Canonical marketing URL | — |

### Clerk URL routing
`NEXT_PUBLIC_CLERK_SIGN_IN_URL`, `NEXT_PUBLIC_CLERK_SIGN_UP_URL`, `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL`, `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL`

### Clerk webhooks
`CLERK_WEBHOOK_SIGNING_SECRET` (the code also reads `CLERK_WEBHOOK_SECRET` as a fallback — keep one name consistent, this duplication is a known rough edge)

### Payments — Flutterwave
`FLUTTERWAVE_SECRET_KEY`, `FLUTTERWAVE_PUBLIC_KEY`, `FLUTTERWAVE_WEBHOOK_SECRET`
**Currently TEST keys. Webhook signatures fail closed — a bad signature is refused.**

### Voice — Vapi
`VAPI_PRIVATE_KEY` (falls back to `VAPI_API_KEY`), `VAPI_WEBHOOK_SECRET`, `VAPI_MODEL_PROVIDER`, `VAPI_MODEL_NAME`

### Email — Resend
`RESEND_API_KEY`, `RESEND_WEBHOOK_SECRET`, `EMAIL_FROM_ADDRESS`

### AI provider
`AI_PROVIDER`, `AI_MODEL`, `OPENAI_API_KEY`

### Credit system — these change product behaviour
| Variable | Meaning | Correct value |
|---|---|---|
| `CREDITS_INCLUDED_PER_PERIOD` | Paid monthly allowance | **4000** (1 credit = $0.005 ≈ $20 of AI cost) |
| `TRIAL_MESSAGE_LIMIT` | Free trial chat messages | **50** |
| `CREDITS_WARN_REMAINING_PCT` | Warn the tenant at this remaining % | 15 |
| `CREDITS_GRACE_HOURS` | Grace period before a hard stop | 24 |
| `CREDITS_GRACE_OVERDRAFT_CREDITS` | Overdraft allowed during grace | see code |
| `CREDIT_MODEL_WEIGHTS`, `CREDITS_WEIGHTS_VERSION` | Per-model cost weighting | see code |
| `AI_CREDITS_ENFORCEMENT` | Master switch for enforcement | on |

> **Critical:** `CREDITS_INCLUDED_PER_PERIOD` is read at **build time**. Changing it in Vercel does nothing until the app is rebuilt and redeployed. The live build currently still carries the old value of **10000**.

### Other
`CHATBOT_EMBED_SECRET`, `CHATBOT_TOKEN_TTL_MS`, `UPLOADTHING_SECRET`

---

## 4. Running it locally

```bash
bun install
# create .env with the variables above
bun run dev          # http://localhost:3000
bun test             # test suite
bun run db:migrate   # apply migrations (needs DATABASE_URL)
bun run db:verify    # read-only drift check — fails if migrations are missing
bun run build        # production build
```

---

## 5. What is broken right now — fix in this order

1. **A newly created tenant crashes every signed-in `/dashboard` page** (React error digest `783175523`). This is the launch blocker: a customer who signs up gets an error screen instead of a product.
   - Two causes. (a) Migration `0007` was missing from production — **now fixed**, applied and verified. (b) The dashboard layout cannot survive a just-created Clerk organisation; the page tree is client components plus one `await auth()`.
   - A fix (`PR #92`, onboarding gate + error boundary) **is merged to main (`1525264`) but has never been deployed**. Whether it fully removes the crash is unverified — no signed-in test has run against a build containing it.
2. **No deploy has happened since commit `10b1584`.** Live traffic runs a build older than the fix and older than the corrected credit allowance. This single deploy is the highest-value action available.
3. **The live app grants 10,000 credits instead of 4,000** — five times the budgeted AI cost per customer. Fixed by that same deploy.
4. **Payment is on test keys.** No revenue can move until live Flutterwave keys are installed and one small real transaction is verified.
5. **The usage API doesn't match its contract.** It ships as `/api/analytics/usage`; the ratified contract is `/api/usage/current`, `/api/usage/summary`, `/api/usage/history`.
6. **`TS18004` in the stats route** — a `businessId` variable used out of scope inside a catch block.
7. **The CI migration gate is dormant** (no `DATABASE_URL` secret configured), so schema drift can ship without failing the build. This is what let #1(a) happen.

---

## 6. Required before charging anyone

- Deploy main to production.
- Run the signed-in QA pass: signup → onboarding → checkout (trial 50 messages, paid 4,000 credits) → dashboard loads → business name greeting → chat → message cut-off at turn 51 (should 402 without calling the provider) → usage bars → legacy route redirects.
- Swap Flutterwave to live keys, take one small real payment, confirm access and credits are granted, then re-verify a forged webhook is still rejected.
- Remove QA test accounts so no test enrollment can appear as a customer.
- Delete retired settings (the old payment provider key is still present).

---

## 7. Production data (as of 2026-10-31)

| Table | Rows |
|---|---|
| business | 19 |
| conversation | 112 |
| message | 335 |
| usage_event | 242 |
| knowledge_document | 24 |
| communication_log | 25 |
| ai_brain_config | 19 |
| lead | 18 |
| credit_account | 7 |
| automation_rule | 6 |
| early_bird_counter | 1 |
| subscription | **0** |

Almost all of this is **QA test data** — there are no subscriptions, no appointments, no phone numbers, and no revenue. It is safe to treat the schema as the asset and the rows as disposable.

---

## 8. Moving the database from Neon to Supabase

Both are plain Postgres, so this is a copy, not a conversion.

1. **Create the Supabase project.** Choose a **paid tier** — the free tier pauses inactive projects, which is unacceptable for a product you charge for.
2. **Apply the schema.** Run the seven files in `drizzle/` against the new database. They are written to be idempotent (additive DDL only), so they apply cleanly to an empty database: `DATABASE_URL=<supabase-direct-url> bun run db:migrate`.
3. **Copy the data** (optional, given the rows are test data). `pg_dump --data-only` from Neon, restore into Supabase. Verify row counts table by table afterwards — this is how partial copies get caught.
4. **Swap the driver in code.** Six files reference `@neondatabase/serverless`: `src/db/index.ts`, `src/proxy.ts`, `scripts/migrate.ts`, `scripts/verify_migrations.ts`, `scripts/sync_schema.ts`, and `src/lib/__tests__/vapi-master-key.test.ts`. Replace with `postgres` (postgres.js) + `drizzle-orm/postgres-js`. The Neon HTTP driver will not talk to Supabase.
5. **Use two connection strings, and don't mix them up:**
   - App runtime (serverless): Supabase **pooled** connection, port `6543`, transaction mode — and set `prepare: false` on the client, because transaction-mode pooling breaks prepared statements.
   - Migrations and scripts: **direct** connection, port `5432`.
6. **Update environment variables** in Vercel (Production and Preview) and locally. Keep the Neon string until the new setup is proven, then remove it.
7. **Do not enable Supabase Auth.** Authentication is Clerk and is woven through the app. Supabase is the database here, nothing more.

---

## 9. Design — current state and what to do

The visual design is the weakest part of the product, and this is the honest diagnosis:

- **No design system exists.** No defined accent colour, no type scale, no spacing scale, no consistent component set. Each screen was decided in isolation by whoever was doing a functional task, so the result looks assembled rather than designed.
- **The landing page is a text-only hero on near-black with purple gradient headline text and three competing buttons** ("Get Started", "Subscribe Now", "See how it works"). No product visual, no proof, no logos. It reads as a template because it is one — purple-on-black gradient is the most overused AI-startup treatment in the market.
- **No visual review loop.** Nobody screenshotted pages at real breakpoints and compared them against a quality bar, which is also how functional defects shipped unseen.

**What fixes it, in order:**

1. Decide three things on paper: one accent colour, two typefaces, and a reference product whose craft level you want to match. Everything else follows from this.
2. Build the design system once — colour tokens, type scale, spacing scale, one component library — and make every screen draw from it. No per-screen invention.
3. Rebuild the hero around an actual product visual, and collapse to **one primary call to action**.
4. Apply the same tokens to the dashboard so the app and the site stop looking like different products.
5. Hold a visual bar: every page screenshotted at desktop, tablet and phone, compared against the reference, gaps fixed before shipping.

This needs **a designer who owns visual direction** and an engineer who implements it. It is not a task to hand to a general-purpose model with the instruction "make it look good" — that is precisely how the current look happened.

---

## 10. Key files

| Path | What it does |
|---|---|
| `src/app/(app)/dashboard/(auth)/layout.tsx` | Dashboard shell — the one server component with `await auth()`; site of the current crash |
| `src/app/(app)/dashboard/(auth)/error.tsx` | Error boundary added in #92 |
| `src/db/index.ts` | Database client (Neon driver — swap this for Supabase) |
| `src/db/schema.ts` | Drizzle schema, source of truth for the database shape |
| `drizzle/*.sql` | 7 migrations, all applied in production |
| `scripts/migrate.ts` | Migration runner |
| `scripts/verify_migrations.ts` | Read-only drift check |
| `src/proxy.ts` | Auth / routing middleware |
| `src/app/api/subscription/route.ts` | Subscription state endpoint |
| `src/lib/ai-templates.ts` **and** `src/lib/ai-templates/` | **Gotcha:** a file and a directory share a name. A bare `@/lib/ai-templates` import resolves to the file and breaks the build. Always import `@/lib/ai-templates/index`. |

---

## 11. Things that will bite you

- **Env values are baked at build time** for anything read in server components or at module scope. Changing a setting without a redeploy does nothing.
- **`next.config` has `ignoreBuildErrors` enabled.** TypeScript errors do not fail the build — which is why `TS18004` is still sitting there. Treat `bun run build` output as advisory, not a guarantee.
- **Migration drift is not gated in CI.** Run `bun run db:verify` manually before every deploy.
- **The dashboard was rebuilt once without a signed-in test against the new build.** Any change to the dashboard layout should be tested with a genuinely new account, not an existing session.
