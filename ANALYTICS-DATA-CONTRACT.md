# Analytics and usage data contracts

**Status:** Working engineering contract (not a financial forecast or owner-ratified policy). Scope is tenant-safe reporting and usage/billing controls; no dashboard implementation.

## Audit baseline
The PostgreSQL/Drizzle schema uses `business.id` as tenant key. Directly scoped operational sources: `lead`, `appointment`, `conversation`, `communication_log`, `missed_call`, `subscription`, `usage_ai_call`, `status_timeline`, `ai_call`, and `handoff`. `message` is scoped indirectly through `conversation`; every join must constrain `conversation.business_id`. Existing `/api/dashboard/stats` calls `ensureBusiness()` and is real-data snapshot, but failed communications are not missed calls, appointment date is text, and AI usage is not written by every AI path. Label these fallbacks `partial` rather than complete.

## Tenant/access rules
* Resolve business from authenticated actor; never trust a business ID from query/body.
* Platform admin cross-tenant views require an explicit admin service and rows grouped by businessId; business users only see their own tenant.
* Every fact has immutable `business_id` (or documented parent join). Tenant-owned facts use cascade FK.
* Never expose another tenant's IDs, contact data, message bodies, phone/recording URLs, or payment identifiers.
* Windows are UTC half-open intervals `[from,to)` ISO-8601. Responses include `asOf`, window, timezone, and `dataQuality` (`complete|partial|unavailable`). Empty periods are zero, not null.

## Canonical usage event ledger (migration required)
Add append-only `usage_event`: `id` text PK; `business_id` FK/index; `occurred_at` UTC; `ingested_at`; `event_type`; `source`; nullable provider `external_id`; nonnegative `quantity` (default 1); `unit`; allowlisted/redacted JSON metadata; unique `dedupe_key` per tenant/provider. Index `(business_id, occurred_at, event_type)`. Verify tenant before write. Webhook corrections are compensating events, never edits/deletes to settled rows. Decide retention/raw payload policy before billing.

Canonical events/units: `ai.call.completed` (call), `ai.tokens.input/output` (token, model metadata); `voice.call.started/completed` (call), `voice.call.minutes` (minute); `lead.created/status_changed`; `appointment.created/completed/cancelled/no_show`; `communication.sent/delivered/failed/bounced` (message, channel); `follow_up.scheduled/sent/failed`. Existing tables remain CRUD source of truth; ledger is reporting/billing source once producers write transactionally or via idempotent outbox.

## KPI definitions
Counts are distinct canonical event IDs unless stated; ledger first once populated, fallback source labeled and `partial`.

| KPI | Definition/source |
|---|---|
| Leads | `lead.created`; fallback `lead.created_at` |
| Conversion | completed/qualified outcomes ÷ leads created; status mapping and cohort attribution must be approved |
| Appointments | `appointment.created`; cancelled separately; booking rate is bookings ÷ eligible leads |
| Calls | completed voice calls, connected rate, and minutes separately from voice events/provider timestamps |
| AI conversations | distinct conversations with >=1 user message; business-scoped conversation/message join |
| AI usage | input/output/total tokens by model; current `usage_ai_call`, later ledger |
| Delivery | sent/delivered/failed/bounced; delivered ÷ sent; dedupe status transitions |
| Follow-up rate | sent ÷ scheduled; failures separate |
| Active business | tenant with qualifying event in window; admin-only |
| MRR/ARR | normalized recurring amount for active paid subscriptions; ARR=M RR*12; group currency, no invented FX |
| Churn | cancelled/expired in period ÷ active at period start; billing lifecycle source required |

Revenue is actual only with verified payment state/provider webhook. Missing/unconfirmed billing data is `unavailable`, not zero. Targets/projections use separate `projection` namespace and never mix with actuals.

## Reporting API contract (proposal)
`GET /api/analytics/summary?from=<ISO>&to=<ISO>` derives tenant server-side:

```json
{"tenant":{"businessId":"opaque-id"},"window":{"from":"2026-08-01T00:00:00Z","to":"2026-08-08T00:00:00Z","timezone":"UTC"},"asOf":"2026-08-08T12:00:00Z","dataQuality":"partial","metrics":{"leads":{"value":0,"source":"lead.created","complete":true},"appointmentsBooked":{"value":0,"source":"appointment.created","complete":true},"aiTokens":{"input":0,"output":0,"total":0,"source":"usage_ai_call","complete":false},"communications":{"sent":0,"delivered":0,"failed":0,"bounced":0,"deliveryRate":null,"source":"communication_log","complete":false}},"warnings":["AI usage coverage is incomplete"]}
```
Numbers are nonnegative integers; rates are `[0,1]` or null for zero/unavailable denominators. Version changes for renamed metrics/attribution. Separate `/api/analytics/usage` returns billable quantities by tenant, period, event type, unit, provider, without raw content.

## Billing controls/reconciliation
Evaluate limits per subscription period `[currentPeriodStart,currentPeriodEnd)`, separating `observed`, `billable`, and `included`; credits/refunds are negative adjustment events. At close persist period snapshot with ledger high-water mark, calculation version, generated timestamp; reruns idempotent. Verify/dedupe payment and provider callbacks. Auto-pause only from verified billing state; preserve data and record `status_timeline`.

## Rollout
1. Migrate ledger, indexes/checks, and period snapshots.
2. Instrument producers; backfill attributable facts with backfill/version metadata.
3. Reconcile daily by tenant/type/day; alert unexplained deltas/duplicates.
4. Read-only summary with source/data quality labels. Finance approves billing after a verified period.
5. Test cross-tenant IDs, permissions, webhook retry dedupe, UTC boundaries, cancellations, and zero denominators.

Non-goals: financial results/projections, dashboard UI, payment claims, and migration execution.
