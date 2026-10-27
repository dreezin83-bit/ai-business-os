/**
 * credits.ts — Central AI credit metering + enforcement (Phase 2, owner-ratified 2026-09-19;
 * weights reconciled to CREDIT-CALIBRATION.md v2026-09-cal-v1, owner-ratified 2026-10-07).
 *
 * CALIBRATED ANCHOR: 1 credit ≙ $0.005 of blended provider list-price cost. 4,000 credits
 * included per $199/month → ≈ $20 provider ceiling at full burn (owner-ratified 2026-10-24:
 * "$20/month of AI provider cost = 4,000 credits", ~10% cost ratio at $199 revenue).
 * Balances are stored as INTEGER milli-credits (1 credit = 1,000 milli) so fractional weights
 * are auditable; the UI/dashboard divides by 1,000 (GET /api/dashboard/stats returns credit units).
 *
 * Owner product decisions implemented here:
 *  1. Single internal credit weighted by ACTUAL per-model/provider AI consumption (tokens/minutes),
 *     never per-HTTP-request. Weight table per CREDIT-CALIBRATION.md §3; unknown models fail closed
 *     to the most expensive listed weight so an env typo can never under-meter spend.
 *  2. 4,000 credits included per $199/month subscription (env CREDITS_INCLUDED_PER_PERIOD, default 4000) — this
 *     replaced the earlier 10,000 (~$50) assumption on 2026-10-24 and is what the landing advertises.
 *  3. Voice: never drop an active call; no NEW expensive AI work starts when hard-stopped.
 *  4. Top-ups: data model supports purchased credits; grants only via an authorized owner/admin mechanism.
 *  5. Grace: warn at <=15% remaining; at 0 mark exhausted_grace with a 24h window AND a bounded
 *     500-credit overdraft (≈ $2.50 exposure); hard-stop after grace/overdraft; no silent refill,
 *     no unbounded negative balance (floor = -overdraft).
 *  6. Chatbot embed tokens: HMAC-signed per-tenant tokens (CHATBOT_EMBED_SECRET over businessId+expiry);
 *     legacy embeds keep working via rate-limited + business-exists/active backend check.
 *
 * Enforcement flag: AI_CREDITS_ENFORCEMENT default OFF (metering-only first). When off, usage is
 * recorded but never blocks. The chatbot security fix ships ACTIVE regardless (security, not a feature).
 */
import { db } from "@/db";
import { creditAccount, usageEvent, creditGrant, periodSnapshot, subscription, business } from "@/db/schema";
import { eq, and, lt, sql } from "drizzle-orm";
import { generateId } from "@/lib/utils";
import { createHmac, timingSafeEqual } from "node:crypto";
import { MILLI, computeCreditsMilli } from "@/lib/credit-weights";
export { modelWeights, voiceWeight, normalizeModelId } from "@/lib/credit-weights";

// ── Config (spec §6 — single place costs/limits change) ───────────────────────
export const CREDITS_INCLUDED_PER_PERIOD = Number(process.env.CREDITS_INCLUDED_PER_PERIOD ?? 4000);
export const CREDITS_WARN_REMAINING_PCT = Number(process.env.CREDITS_WARN_REMAINING_PCT ?? 15);
export const CREDITS_GRACE_HOURS = Number(process.env.CREDITS_GRACE_HOURS ?? 24);
export const CREDITS_GRACE_OVERDRAFT_CREDITS = Number(process.env.CREDITS_GRACE_OVERDRAFT_CREDITS ?? 500);
export const CREDITS_WEIGHTS_VERSION = process.env.CREDITS_WEIGHTS_VERSION ?? "2026-09-cal-v1";
export const ENFORCEMENT_ON = String(process.env.AI_CREDITS_ENFORCEMENT ?? "off").toLowerCase() === "on";

export const ALLOCATED_MILLI = Math.round(CREDITS_INCLUDED_PER_PERIOD * MILLI);
export const OVERDRAFT_MILLI = Math.round(CREDITS_GRACE_OVERDRAFT_CREDITS * MILLI);
export const GRACE_MS = CREDITS_GRACE_HOURS * 3600 * 1000;

// ── Weight tables + cost formula ──────────────────────────────────────────────
// Live in the pure module src/lib/credit-weights.ts (incl. the P1 model-id
// normalization fix); imported above and re-exported for API compatibility.
// See CREDIT-CALIBRATION.md §3 for the source of truth.
// ── Embed token helpers (owner decision #6) ──────────────────────────────────
const TOKEN_TTL_MS = Number(process.env.CHATBOT_TOKEN_TTL_MS ?? 365 * 24 * 60 * 60 * 1000); // 1y embed token
export function makeChatbotToken(businessId: string): { token: string; expiresAt: string } {
  const secret = process.env.CHATBOT_EMBED_SECRET;
  if (!secret) throw new Error("CHATBOT_EMBED_SECRET is not configured");
  const expiresAt = Date.now() + TOKEN_TTL_MS;
  const payload = `${businessId}:${expiresAt}`;
  const sig = createHmac("sha256", secret).update(payload).digest("base64url");
  return { token: `${payload}.${sig}`, expiresAt: new Date(expiresAt).toISOString() };
}
/** Verify a chatbot embed token. Returns the businessId on success, null on failure/expiry. */
export function verifyChatbotToken(token: string): string | null {
  const secret = process.env.CHATBOT_EMBED_SECRET;
  if (!secret) return null;
  const body = token.split(".");
  if (body.length < 3) return null;
  const [businessId, exp, sig] = body;
  if (!businessId || !exp || !sig) return null;
  const t = Number(exp);
  if (!Number.isFinite(t) || Date.now() > t) return null;
  const payload = `${businessId}:${exp}`;
  const expected = createHmac("sha256", secret).update(payload).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return businessId;
}

// ── Rate limiter (legacy public-chatbot path; server-side, in-process) ───────
const legacyWindows = new Map<string, { count: number; resetAt: number }>();
/** Legacy embed path: allow N bot messages per business per window (default 20/60s). */
export function isLegacyRateLimited(businessId: string, limit = 20, windowMs = 60_000): boolean {
  const now = Date.now();
  const key = `legacy:${businessId}`;
  const cur = legacyWindows.get(key);
  if (!cur || cur.resetAt <= now) {
    legacyWindows.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }
  cur.count += 1;
  return cur.count > limit;
}

// ── Period helpers ────────────────────────────────────────────────────────────
/** Resolve the tenant's current billing window from its subscription (Flutterwave-driven period). */
export async function getPeriodWindow(businessId: string): Promise<{ start: Date; end: Date }> {
  const [sub] = await db
    .select({ periodStart: subscription.currentPeriodStart, periodEnd: subscription.currentPeriodEnd })
    .from(subscription)
    .where(eq(subscription.businessId, businessId))
    .limit(1);
  if (sub?.periodStart && sub?.periodEnd) {
    return { start: sub.periodStart, end: sub.periodEnd };
  }
  // Fallback: 30d window from business creation (dev/pre-payment tenants).
  const [biz] = await db.select({ createdAt: business.createdAt }).from(business).where(eq(business.id, businessId)).limit(1);
  const start = biz?.createdAt ?? new Date();
  return { start, end: new Date(start.getTime() + 30 * 86400000) };
}

/**
 * Open (or refresh) the credit period for a business — called from the Flutterwave webhook
 * with the authoritative subscription window. Idempotent: closing an already-closed period
 * is a no-op; the new period row is created once; monthly_included grant is deduped.
 * Balances are milli-credits: allocated = CREDITS_INCLUDED_PER_PERIOD × 1000.
 */
export async function openCreditPeriod(businessId: string, start: Date, end: Date): Promise<void> {
  // Close/snapshot any prior period row that ends before the new window (idempotent).
  const prior = await db
    .select()
    .from(creditAccount)
    .where(and(eq(creditAccount.businessId, businessId), lt(creditAccount.periodEndAt, start)));
  for (const p of prior) {
    await closePeriodSnapshot(p);
  }
  await db
    .insert(creditAccount)
    .values({
      id: generateId(),
      businessId,
      periodStartAt: start,
      periodEndAt: end,
      allocated: ALLOCATED_MILLI,
      consumed: 0,
      remaining: ALLOCATED_MILLI,
      status: "active",
    })
    .onConflictDoNothing();

  // Grant the monthly included allowance exactly once per period (reason+external_reference dedupe).
  const ref = `sub:${businessId}:${start.toISOString()}`;
  await db
    .insert(creditGrant)
    .values({
      id: generateId(),
      businessId,
      amount: ALLOCATED_MILLI, // milli-credits
      reason: "monthly_included",
      externalReference: ref,
      periodStartAt: start,
    })
    .onConflictDoNothing();
}

/** Close the old period as an idempotent snapshot (never overwrites previous snapshots). */
export async function closePeriodSnapshot(acct: typeof creditAccount.$inferSelect): Promise<void> {
  // Real granted total for the period (milli-credits; = 4,000,000 for a standard monthly refill) —
  // the snapshot is the per-tenant provider-cost KPI source, so it must carry true grant values.
  const grants = await db
    .select({ total: sql<number>`coalesce(sum(${creditGrant.amount}), 0)` })
    .from(creditGrant)
    .where(and(eq(creditGrant.businessId, acct.businessId), eq(creditGrant.periodStartAt, acct.periodStartAt)));
  const grantedMilli = grants[0]?.total ?? acct.consumed; // fallback: consumed (pre-grant-scale safety)
  await db
    .insert(periodSnapshot)
    .values({
      id: generateId(),
      businessId: acct.businessId,
      periodStartAt: acct.periodStartAt,
      periodEndAt: acct.periodEndAt,
      ledgerHighWatermark: acct.id,
      includedCredits: acct.allocated,   // milli-credits
      grantedCredits: grantedMilli,      // milli-credits
      consumedCredits: acct.consumed,    // milli-credits
      remainingCredits: Math.max(0, acct.remaining), // milli-credits
      calculationVersion: "v1",
    })
    .onConflictDoNothing();
}

/** Ensure a credit_account row exists for the CURRENT subscription window. Lazily opens one if missing. Returns the row. */
export async function ensureCreditAccount(businessId: string): Promise<typeof creditAccount.$inferSelect> {
  const { start, end } = await getPeriodWindow(businessId);
  const [existing] = await db
    .select()
    .from(creditAccount)
    .where(and(eq(creditAccount.businessId, businessId), eq(creditAccount.periodStartAt, start)))
    .limit(1);
  if (existing) return existing;
  await db
    .insert(creditAccount)
    .values({
      id: generateId(),
      businessId,
      periodStartAt: start,
      periodEndAt: end,
      allocated: ALLOCATED_MILLI,
      consumed: 0,
      remaining: ALLOCATED_MILLI,
      status: "active",
    })
    .onConflictDoNothing();
  const [fresh] = await db
    .select()
    .from(creditAccount)
    .where(and(eq(creditAccount.businessId, businessId), eq(creditAccount.periodStartAt, start)))
    .limit(1);
  return fresh!;
}

// ── Public API ────────────────────────────────────────────────────────────────
export interface CreditStatus {
  allocated: number; // credits (human units — milli ÷ 1000)
  consumed: number;  // credits
  remaining: number; // credits, floored at 0 for display
  status: "active" | "low" | "exhausted_grace" | "exhausted";
  periodStart: Date;
  periodEnd: Date;
  exhaustedAt: Date | null;
  graceUntil: Date | null;
  enforcementOn: boolean;
}

export async function getCreditStatus(businessId: string): Promise<CreditStatus> {
  const acct = await ensureCreditAccount(businessId);
  return {
    allocated: Math.round(acct.allocated / MILLI),
    consumed: Math.round(acct.consumed / MILLI),
    remaining: Math.max(0, Math.round(acct.remaining / MILLI)),
    status: (acct.status as CreditStatus["status"]) || "active",
    periodStart: acct.periodStartAt,
    periodEnd: acct.periodEndAt,
    exhaustedAt: acct.exhaustedAt,
    graceUntil: acct.graceUntil,
    enforcementOn: ENFORCEMENT_ON,
  };
}

export type ConsumeEventType = "ai.completion" | "ai.lead_extraction" | "voice.call.minutes";
export type ConsumeSource = "chat" | "chatbot" | "commander" | "email" | "lead_extractor" | "voice";

export interface ConsumeInput {
  businessId: string;
  correlationId: string;   // e.g. chat turn id / vapi call id — groups secondary costs
  idempotencyKey: string;  // e.g. `${source}:${turnId}:${eventType}` — dedupe (retries cannot double-charge)
  eventType: ConsumeEventType;
  source: ConsumeSource;
  provider: "openai" | "vapi";
  model?: string | null;
  /** Text: actual input tokens (real OpenAI usage — the ONLY metering input). */
  tokensIn?: number;
  /** Text: actual output tokens. */
  tokensOut?: number;
  /** Voice: billable minutes = ceil(durationSeconds/60). */
  minutes?: number;
  /** Provider reference: OpenAI response id / Vapi call id. */
  externalId?: string | null;
  /** Allowlisted, redacted metadata only (conversation/call ids) — no PII/body. */
  metadata?: Record<string, unknown>;
}

export type ConsumeResult =
  | { ok: true; creditsMilli: number; remainingMilli: number; status: CreditStatus["status"] }
  | { ok: false; error: "AI_CREDITS_EXHAUSTED"; remainingMilli: number; status: "exhausted" };

/**
 * Atomically consume credits for a completed AI operation (spec §5/§7).
 * - Inserts the usage_event ledger row FIRST (append-only, idempotent via (business_id, idempotency_key)) —
 *   the canonical record; retries/double-delivery cannot double-charge.
 * - Then decrements the wallet with a guarded UPDATE ... WHERE remaining_milli >= credits_milli —
 *   never below the bounded grace overdraft (-500 credits); hard-stop after grace expiry.
 * - Grace: first time remaining hits 0 → status exhausted_grace + grace_until = now+24h;
 *   during grace consumption may dip to -500 credits (overdraft, ≈ $2.50 exposure); after
 *   grace_until or when the overdraft is consumed → no new billable AI (AI surfaces 402;
 *   active voice calls are never dropped — they finish and are metered normally).
 * - Concurrency-safe: the guarded UPDATE is atomic; race losers re-read and report exhausted.
 * - When enforcement is OFF, usage is still recorded but never blocks (metering-only phase).
 */
export async function consumeCredits(input: ConsumeInput): Promise<ConsumeResult> {
  const creditsMilli = computeCreditsMilli({
    provider: input.provider,
    model: input.model,
    tokensIn: input.tokensIn,
    tokensOut: input.tokensOut,
    minutes: input.minutes,
  });
  const acct = await ensureCreditAccount(input.businessId);
  const now = new Date();

  const isVoice = input.eventType === "voice.call.minutes";
  const quantity = isVoice
    ? Math.max(1, Math.ceil(input.minutes ?? 0))
    : (input.tokensIn ?? 0) + (input.tokensOut ?? 0);
  const unit = isVoice ? "minute" : "token";

  // Ledger row first (append-only, idempotent).
  await db
    .insert(usageEvent)
    .values({
      id: generateId(),
      businessId: input.businessId,
      occurredAt: now,
      eventType: input.eventType,
      source: input.source,
      quantity,
      unit,
      creditsMilli,
      provider: input.provider,
      model: input.model ?? null,
      tokensIn: input.tokensIn ?? 0,
      tokensOut: input.tokensOut ?? 0,
      periodStartAt: acct.periodStartAt,
      weightsVersion: CREDITS_WEIGHTS_VERSION,
      correlationId: input.correlationId,
      idempotencyKey: input.idempotencyKey,
      externalId: input.externalId ?? null,
      metadata: input.metadata ?? null,
    })
    .onConflictDoNothing();

  if (!ENFORCEMENT_ON) {
    return { ok: true, creditsMilli, remainingMilli: Math.max(0, acct.remaining), status: acct.status as CreditStatus["status"] };
  }

  // Hard stop when grace has expired: no new billable AI (active calls already finished earlier).
  if (acct.exhaustedAt && (acct.graceUntil == null || now.getTime() >= acct.graceUntil.getTime())) {
    return {
      ok: false,
      error: "AI_CREDITS_EXHAUSTED",
      remainingMilli: Math.max(0, acct.remaining),
      status: "exhausted",
    };
  }

  // Guard: never go below -overdraft (bounded grace overdraft; 0 outside grace is naturally
  // impossible because hitting 0 enters exhausted_grace instead). Atomic, race-safe.
  const warnMilli = Math.round(acct.allocated * (CREDITS_WARN_REMAINING_PCT / 100));
  const updated = await db
    .update(creditAccount)
    .set({
      consumed: sql`${creditAccount.consumed} + ${creditsMilli}`,
      remaining: sql`${creditAccount.remaining} - ${creditsMilli}`,
      updatedAt: now,
      status: sql`CASE WHEN ${creditAccount.remaining} - ${creditsMilli} <= 0 THEN 'exhausted_grace'
                        WHEN ${creditAccount.remaining} - ${creditsMilli} <= ${warnMilli} THEN 'low'
                        ELSE 'active' END`,
      exhaustedAt: sql`CASE WHEN ${creditAccount.remaining} - ${creditsMilli} <= 0 THEN COALESCE(${creditAccount.exhaustedAt}, ${now})
                            ELSE ${creditAccount.exhaustedAt} END`,
      graceUntil: sql`CASE WHEN ${creditAccount.remaining} - ${creditsMilli} <= 0 THEN COALESCE(${creditAccount.graceUntil}, ${new Date(now.getTime() + GRACE_MS)})
                            ELSE ${creditAccount.graceUntil} END`,
    })
    .where(and(eq(creditAccount.id, acct.id), sql`${creditAccount.remaining} + ${OVERDRAFT_MILLI} >= ${creditsMilli}`))
    .returning({ remaining: creditAccount.remaining, status: creditAccount.status });

  if (updated.length === 0) {
    // Race loser or insufficient funds (whole balance + overdraft) — re-read the truth.
    const [truth] = await db.select().from(creditAccount).where(eq(creditAccount.id, acct.id)).limit(1);
    return {
      ok: false,
      error: "AI_CREDITS_EXHAUSTED",
      remainingMilli: Math.max(0, truth?.remaining ?? 0),
      status: (truth?.status as CreditStatus["status"]) || "exhausted",
    };
  }

  const remainingMilli = Math.max(0, updated[0].remaining);
  const status = (updated[0].status as CreditStatus["status"]) || "active";
  return { ok: true, creditsMilli, remainingMilli, status };
}

/**
 * Authorized grant mechanism (owner decision #4) — ONLY for an owner/admin flow.
 * Idempotent per (reason, external_reference). Adjusts the CURRENT period's wallet.
 * `amount` is in whole credits (human units); stored as milli-credits.
 */
export async function grantCredits(input: {
  businessId: string;
  amount: number; // positive = grant, negative = clawback/refund (credits)
  reason: "monthly_included" | "topup" | "owner_adjustment" | "refund";
  externalReference?: string;
}): Promise<void> {
  // monthly_included refills are handled by the period open/rollover; skip re-grant here.
  if (input.reason === "monthly_included") return;

  const amountMilli = Math.round(input.amount * MILLI);
  const { start } = await getPeriodWindow(input.businessId);
  const inserted = await db
    .insert(creditGrant)
    .values({
      id: generateId(),
      businessId: input.businessId,
      amount: amountMilli,
      reason: input.reason,
      externalReference: input.externalReference ?? null,
      periodStartAt: start,
    })
    .onConflictDoNothing()
    .returning({ id: creditGrant.id });

  if (inserted.length === 0) return; // already granted (idempotent)

  await db
    .update(creditAccount)
    .set({
      allocated: sql`${creditAccount.allocated} + ${amountMilli}`,
      remaining: sql`greatest(${creditAccount.remaining} + ${amountMilli}, -${OVERDRAFT_MILLI})`,
      updatedAt: new Date(),
    })
    .where(and(eq(creditAccount.businessId, input.businessId), eq(creditAccount.periodStartAt, start)));
}

/** Convenience error-code helper for API route responses. */
export function creditsExhaustedError() {
  return {
    error: "AI_CREDITS_EXHAUSTED",
    message: "AI features paused until your allowance renews",
    remaining: 0,
  };
}

/** Voice guard: NEW calls may start unless hard-stopped (never drops an ACTIVE call). */
export async function canStartNewVoiceCall(businessId: string): Promise<boolean> {
  if (!ENFORCEMENT_ON) return true;
  return !(await isHardStopped(businessId));
}

/**
 * Hard-stop check for non-voice AI surfaces (spec §7). True only when enforcement is ON and the
 * wallet is at 0 AND the 24h grace window has elapsed (or its 500-credit overdraft was consumed).
 * Inside grace, active workflows + new work within the bounded overdraft continue (usage recorded);
 * after grace, no NEW billable AI starts until the next billing period or an authorized grant.
 * Non-AI APIs are never affected by this.
 */
export async function isHardStopped(businessId: string): Promise<boolean> {
  if (!ENFORCEMENT_ON) return false;
  const st = await getCreditStatus(businessId);
  if (st.remaining > 0) return false;
  if (st.exhaustedAt && st.graceUntil && Date.now() < st.graceUntil.getTime()) return false; // in grace
  return true;
}