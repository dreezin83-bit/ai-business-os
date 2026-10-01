/**
 * credits.ts — Central AI credit metering + enforcement (Phase 2, owner-ratified 2026-09-19).
 *
 * Owner product decisions implemented here:
 *  1. Single internal credit weighted by ACTUAL AI consumption (tokens/minutes), never per-HTTP-request.
 *  2. 10,000 credits included per $199/month subscription (env AI_CREDITS_PER_PERIOD, default 10000).
 *  3. Voice: never drop an active call; no NEW expensive AI work starts when exhausted.
 *  4. Top-ups: data model supports purchased credits; grants only via authorized owner/admin mechanism.
 *  5. Grace: warn at <=15% remaining; mark exhausted at 0; no silent refill, no negative balance,
 *     24h grace window for active workflows where technically safe, then hard stop.
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

// ── Config (single place costs change) ───────────────────────────────────────
export const CREDITS_PER_PERIOD = Number(process.env.AI_CREDITS_PER_PERIOD ?? 10000);
export const WARN_RATIO = Number(process.env.AI_CREDIT_WARN_RATIO ?? 0.15); // <=15% remaining → warn
export const GRACE_MS = Number(process.env.AI_CREDIT_GRACE_MS ?? 24 * 60 * 60 * 1000); // 24h grace
export const ENFORCEMENT_ON = String(process.env.AI_CREDITS_ENFORCEMENT ?? "off").toLowerCase() === "on";

/** Model weight multipliers — config-driven with conservative defaults until CREDIT-CALIBRATION.md lands. */
const MODEL_WEIGHTS: Record<string, number> = {
  "gpt-4o-mini": 1,
  "gpt-4o": 4,
};
export function modelWeight(model: string | null | undefined): number {
  if (!model) return Number(process.env.AI_MODEL_WEIGHT_DEFAULT ?? 2);
  if (model in MODEL_WEIGHTS) return MODEL_WEIGHTS[model];
  // Unknown models are conservatively weighted (higher = safer margin).
  return Number(process.env.AI_MODEL_WEIGHT_DEFAULT ?? 2);
}

/** Cost surface → credits. THE single place that computes credit amounts. */
export function computeCredits(op: {
  eventType: "ai.completion" | "ai.lead_extraction" | "voice.call.minutes" | "ai.call.completed";
  provider: "openai" | "vapi";
  model?: string | null;
  quantity: number; // tokens (input+output) | seconds for voice
  unit: "token" | "second" | "call";
}): number {
  if (op.eventType === "voice.call.minutes" || op.eventType === "ai.call.completed") {
    // Voice: weighted per minute of billed duration. Default 20 credits/min on the base tier.
    // Config AI_CREDIT_VOICE_PER_MINUTE. Conservative default keeps provider cost well below $199.
    const perMinute = Number(process.env.AI_CREDIT_VOICE_PER_MINUTE ?? 20);
    const minutes = Math.max(1, Math.ceil((op.quantity || 0) / 60));
    const weight = op.provider === "vapi" ? modelWeight(op.model) : 1;
    return Math.max(1, Math.ceil(minutes * perMinute * weight));
  }
  // Token surfaces: 1 credit per 1,000 tokens on the base model, weighted per model.
  const tokensPerCredit = Number(process.env.AI_CREDIT_TOKENS_PER_CREDIT ?? 1000);
  const weight = modelWeight(op.model);
  const base = Math.max(1, Math.ceil((op.quantity || 0) / tokensPerCredit));
  return Math.max(1, Math.ceil(base * weight));
}

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
/** Resolve the tenant's current billing window from its subscription (Paystack-driven period). */
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
 * Open (or refresh) the credit period for a business — called from the Paystack webhook
 * with the authoritative subscription window. Idempotent: closing an already-closed period
 * is a no-op; the new period row is created once; monthly_included grant is deduped.
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
      allocated: CREDITS_PER_PERIOD,
      consumed: 0,
      remaining: CREDITS_PER_PERIOD,
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
      amount: CREDITS_PER_PERIOD,
      reason: "monthly_included",
      externalReference: ref,
      periodStartAt: start,
    })
    .onConflictDoNothing();
}

/** Close the old period as an idempotent snapshot (never overwrites previous snapshots). */
export async function closePeriodSnapshot(acct: typeof creditAccount.$inferSelect): Promise<void> {
  await db
    .insert(periodSnapshot)
    .values({
      id: generateId(),
      businessId: acct.businessId,
      periodStartAt: acct.periodStartAt,
      periodEndAt: acct.periodEndAt,
      ledgerHighWatermark: acct.id,
      includedCredits: acct.allocated,
      grantedCredits: acct.consumed,
      consumedCredits: acct.consumed,
      remainingCredits: Math.max(0, acct.remaining),
      calculationVersion: "v1",
    })
    .onConflictDoNothing();
}

/** Ensure a credit_account row exists for the CURRENT subscription window. Lazily opens one if missing. Returns the row. */
export async function ensureCreditAccount(businessId: string): Promise<typeof creditAccount.$inferSelect> {
  const { start } = await getPeriodWindow(businessId);
  const [existing] = await db
    .select()
    .from(creditAccount)
    .where(and(eq(creditAccount.businessId, businessId), eq(creditAccount.periodStartAt, start)))
    .limit(1);
  if (existing) return existing;
  const { end } = await getPeriodWindow(businessId);
  await db
    .insert(creditAccount)
    .values({
      id: generateId(),
      businessId,
      periodStartAt: start,
      periodEndAt: end,
      allocated: CREDITS_PER_PERIOD,
      consumed: 0,
      remaining: CREDITS_PER_PERIOD,
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
  allocated: number;
  consumed: number;
  remaining: number;
  status: "active" | "low" | "exhausted";
  periodStart: Date;
  periodEnd: Date;
  exhaustedAt: Date | null;
  graceUntil: Date | null;
  enforcementOn: boolean;
}

export async function getCreditStatus(businessId: string): Promise<CreditStatus> {
  const acct = await ensureCreditAccount(businessId);
  return {
    allocated: acct.allocated,
    consumed: acct.consumed,
    remaining: Math.max(0, acct.remaining),
    status: (acct.status as CreditStatus["status"]) || "active",
    periodStart: acct.periodStartAt,
    periodEnd: acct.periodEndAt,
    exhaustedAt: acct.exhaustedAt,
    graceUntil: acct.graceUntil,
    enforcementOn: ENFORCEMENT_ON,
  };
}

export interface ConsumeInput {
  businessId: string;
  correlationId: string;   // e.g. chat turn id / vapi call id — groups secondary costs
  idempotencyKey: string;  // e.g. `${source}:${turnId}:${eventType}` — dedupe
  eventType: "ai.completion" | "ai.lead_extraction" | "voice.call.minutes" | "ai.call.completed";
  source: "chat" | "chatbot" | "commander" | "email" | "lead_extractor" | "voice";
  provider: "openai" | "vapi";
  model?: string | null;
  quantity: number;        // actual tokens (input+output) or seconds — REAL consumption, not request count
  unit: "token" | "second" | "call";
  metadata?: Record<string, unknown>;
}

export type ConsumeResult =
  | { ok: true; credits: number; remaining: number; status: CreditStatus["status"] }
  | { ok: false; error: "AI_CREDITS_EXHAUSTED"; remaining: number; status: "exhausted" };

/**
 * Atomically consume credits for a completed AI operation.
 * - Inserts the usage_event ledger row FIRST (append-only, idempotent via (business_id, idempotency_key)) —
 *   the canonical record; retries/double-delivery cannot double-charge.
 * - Then decrements the wallet with a guarded UPDATE ... WHERE remaining >= credits — never negative.
 * - Concurrency-safe: the guarded UPDATE is atomic; race losers simply re-read and report exhausted.
 * - When enforcement is OFF, usage is still recorded but never blocks (metering-only phase).
 */
export async function consumeCredits(input: ConsumeInput): Promise<ConsumeResult> {
  const credits = computeCredits(input);
  const acct = await ensureCreditAccount(input.businessId);
  const now = new Date();

  // Ledger row first (append-only, idempotent).
  await db
    .insert(usageEvent)
    .values({
      id: generateId(),
      businessId: input.businessId,
      occurredAt: now,
      eventType: input.eventType,
      source: input.source,
      quantity: input.quantity,
      unit: input.unit,
      credits,
      provider: input.provider,
      model: input.model ?? null,
      correlationId: input.correlationId,
      idempotencyKey: input.idempotencyKey,
      metadata: input.metadata ?? null,
    })
    .onConflictDoNothing();

  if (!ENFORCEMENT_ON) {
    return { ok: true, credits, remaining: Math.max(0, acct.remaining), status: acct.status as CreditStatus["status"] };
  }

  // Atomic guarded decrement — never negative, race-safe.
  const updated = await db
    .update(creditAccount)
    .set({
      consumed: sql`${creditAccount.consumed} + ${credits}`,
      remaining: sql`${creditAccount.remaining} - ${credits}`,
      updatedAt: now,
      status: sql`CASE WHEN ${creditAccount.remaining} - ${credits} <= 0 THEN 'exhausted'
                        WHEN ${creditAccount.remaining} - ${credits} < ${Math.round(acct.allocated * WARN_RATIO)} THEN 'low'
                        ELSE 'active' END`,
      exhaustedAt: sql`CASE WHEN ${creditAccount.remaining} - ${credits} <= 0 THEN COALESCE(${creditAccount.exhaustedAt}, ${now})
                            ELSE ${creditAccount.exhaustedAt} END`,
      graceUntil: sql`CASE WHEN ${creditAccount.remaining} - ${credits} <= 0 THEN ${new Date(now.getTime() + GRACE_MS)}
                            ELSE ${creditAccount.graceUntil} END`,
    })
    .where(and(eq(creditAccount.id, acct.id), gteRemaining(credits)))
    .returning({ remaining: creditAccount.remaining, status: creditAccount.status });

  if (updated.length === 0) {
    // Race loser or insufficient funds — re-read the truth and report exhausted at 0.
    const [truth] = await db.select().from(creditAccount).where(eq(creditAccount.id, acct.id)).limit(1);
    return {
      ok: false,
      error: "AI_CREDITS_EXHAUSTED",
      remaining: Math.max(0, truth?.remaining ?? 0),
      status: (truth?.status as CreditStatus["status"]) || "exhausted",
    };
  }

  const remaining = Math.max(0, updated[0].remaining);
  const status = (updated[0].status as CreditStatus["status"]) || "active";
  if (remaining <= 0) {
    return { ok: false, error: "AI_CREDITS_EXHAUSTED", remaining: 0, status: "exhausted" };
  }
  return { ok: true, credits, remaining, status };
}

/** Guard helper — keeps the WHERE clause readable (remaining >= credits). */
function gteRemaining(credits: number) {
  return sql`${creditAccount.remaining} >= ${credits}`;
}

/**
 * Authorized grant mechanism (owner decision #4) — ONLY for an owner/admin flow.
 * Idempotent per (reason, external_reference). Adjusts the CURRENT period's wallet.
 */
export async function grantCredits(input: {
  businessId: string;
  amount: number; // positive = grant, negative = clawback/refund
  reason: "monthly_included" | "topup" | "owner_adjustment" | "refund";
  externalReference?: string;
}): Promise<void> {
  // monthly_included refills are handled by the period open/rollover; skip re-grant here.
  if (input.reason === "monthly_included") return;

  const { start } = await getPeriodWindow(input.businessId);
  const inserted = await db
    .insert(creditGrant)
    .values({
      id: generateId(),
      businessId: input.businessId,
      amount: input.amount,
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
      allocated: sql`${creditAccount.allocated} + ${input.amount}`,
      remaining: sql`greatest(${creditAccount.remaining} + ${input.amount}, 0)`,
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

/** Voice guard: check credits BEFORE starting new expensive voice work, without dropping active calls. */
export async function canStartNewVoiceCall(businessId: string): Promise<boolean> {
  if (!ENFORCEMENT_ON) return true;
  const st = await getCreditStatus(businessId);
  if (st.remaining <= 0) return false;
  // Grace: within 24h of exhaustion only in-flight exits are allowed, not new calls.
  if (st.exhaustedAt && Date.now() - st.exhaustedAt.getTime() < GRACE_MS) return false;
  return true;
}

/**
 * Hard-stop check for non-voice AI surfaces. True only when enforcement is ON and the wallet
 * is at 0 AND the 24h grace window has elapsed. Inside grace, active workflows may finish
 * (their usage is still recorded); after grace, no NEW billable AI starts until the next
 * billing period or an authorized grant. Non-AI APIs are never affected by this.
 */
export async function isHardStopped(businessId: string): Promise<boolean> {
  if (!ENFORCEMENT_ON) return false;
  const st = await getCreditStatus(businessId);
  if (st.remaining > 0) return false;
  if (st.exhaustedAt && Date.now() - st.exhaustedAt.getTime() < GRACE_MS) return false;
  return true;
}