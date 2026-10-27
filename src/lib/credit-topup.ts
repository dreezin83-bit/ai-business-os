/**
 * credit-topup.ts — Flutterwave credit top-ups (owner decision 2026-10-23, minimum $10).
 *
 * Paid tenants who burn their monthly allowance mid-cycle can buy more credits
 * without waiting for renewal. The rules this file enforces:
 *
 *   - Minimum $10 per top-up. There is no "just a few credits" path, because
 *     the provider fee on a tiny charge costs more than the credits are worth.
 *   - 1 credit = $0.005 of blended provider cost — the SAME unit the monthly
 *     allowance uses, so a top-up credit and an included credit are identical.
 *     $10 → 2,000 credits.
 *   - The credits granted are computed from the amount the PROVIDER CONFIRMED
 *     during server-side verification, never from the amount the client asked
 *     for. A tampered request cannot buy 4,000 credits for $10.
 *   - Idempotent: the grant is keyed on the Flutterwave tx_ref, so a webhook
 *     retry (Flutterwave retries aggressively) cannot double-credit a tenant.
 *   - A top-up is NOT an enrollment: it never creates a business, never touches
 *     the subscription row, and never extends the billing period. It only adds
 *     to the CURRENT period's wallet.
 *
 * Money-safety note: top-ups are only sold to workspaces whose subscription is
 * already paid and verified (enforced by the route with lib/trial.ts), so the
 * "free trial" can never be extended by buying credits.
 */

import { db } from "@/db";
import { creditGrant } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { grantCredits } from "@/lib/credits";
import { recordTimelineEvent } from "@/lib/timeline";

/** Owner decision: top-ups start at $10. */
export const TOPUP_MIN_USD = 10;
/** Guardrail against fat-finger/abuse amounts; not an owner-declared cap. */
export const TOPUP_MAX_USD = 1000;
/** 1 credit ≙ $0.005 of blended provider cost (owner-ratified 2026-10-24). */
export const CREDIT_USD_UNIT = 0.005;

export const TOPUP_PURPOSE = "credit_topup";
export const TOPUP_REF_PREFIX = "topup";

/** Whole credits bought by an amount in USD. $10 → 2,000. */
export function creditsForAmount(amountUsd: number): number {
  if (!Number.isFinite(amountUsd) || amountUsd <= 0) return 0;
  return Math.floor(amountUsd / CREDIT_USD_UNIT);
}

export type TopupValidation =
  | { ok: true; amountUsd: number; credits: number }
  | { ok: false; error: "INVALID_AMOUNT" | "BELOW_MINIMUM" | "ABOVE_MAXIMUM" };

/**
 * Validate a requested top-up amount. Pure, so the boundaries are testable and
 * the route stays a thin wrapper.
 */
export function validateTopupAmount(raw: unknown): TopupValidation {
  const n = typeof raw === "string" ? Number(raw) : raw;
  if (typeof n !== "number" || !Number.isFinite(n) || n <= 0) {
    return { ok: false, error: "INVALID_AMOUNT" };
  }
  // Normalise to cents so $10.005 can't sneak in as a sub-cent fraction.
  const amountUsd = Math.round(n * 100) / 100;
  if (amountUsd < TOPUP_MIN_USD) return { ok: false, error: "BELOW_MINIMUM" };
  if (amountUsd > TOPUP_MAX_USD) return { ok: false, error: "ABOVE_MAXIMUM" };
  const credits = creditsForAmount(amountUsd);
  if (credits <= 0) return { ok: false, error: "INVALID_AMOUNT" };
  return { ok: true, amountUsd, credits };
}

/**
 * Is this charge a credit top-up?
 * Purpose metadata is authoritative; the tx_ref prefix is the belt-and-braces
 * fallback for charges created before the metadata field existed.
 */
export function isTopupCharge(
  txRef: string | null | undefined,
  meta: unknown
): boolean {
  const purpose =
    meta && typeof meta === "object"
      ? (meta as Record<string, unknown>).purpose
      : undefined;
  if (purpose === TOPUP_PURPOSE) return true;
  return typeof txRef === "string" && txRef.startsWith(`${TOPUP_REF_PREFIX}-`);
}

/** Stable idempotency reference for one top-up charge. */
export function topupIdempotencyRef(txRef: string): string {
  return `topup:${txRef}`;
}

/** Whether this exact top-up charge has already been credited. */
export async function isTopupAlreadyGranted(
  businessId: string,
  txRef: string
): Promise<boolean> {
  const [existing] = await db
    .select({ id: creditGrant.id })
    .from(creditGrant)
    .where(
      and(
        eq(creditGrant.businessId, businessId),
        eq(creditGrant.externalReference, topupIdempotencyRef(txRef))
      )
    )
    .limit(1);
  return Boolean(existing);
}

export interface TopupFulfilment {
  granted: boolean;
  credits: number;
  reason?: "ALREADY_GRANTED" | "AMOUNT_TOO_SMALL";
}

/**
 * Credit a verified top-up payment. Called from the Flutterwave webhook AFTER
 * signature verification and server-side transaction verification, with the
 * amount the provider reported.
 */
export async function fulfilCreditTopup(input: {
  businessId: string;
  txRef: string;
  verifiedAmountUsd: number;
}): Promise<TopupFulfilment> {
  const credits = creditsForAmount(input.verifiedAmountUsd);
  if (credits <= 0) {
    return { granted: false, credits: 0, reason: "AMOUNT_TOO_SMALL" };
  }

  if (await isTopupAlreadyGranted(input.businessId, input.txRef)) {
    return { granted: false, credits, reason: "ALREADY_GRANTED" };
  }

  await grantCredits({
    businessId: input.businessId,
    amount: credits,
    reason: "topup",
    externalReference: topupIdempotencyRef(input.txRef),
  });

  await recordTimelineEvent({
    businessId: input.businessId,
    scope: "billing",
    event: "credit_topup",
    detail: `${credits.toLocaleString("en-US")} credits added ($${input.verifiedAmountUsd.toFixed(2)} top-up, tx ${input.txRef})`,
    status: "success",
  }).catch((err) => {
    // Never fail the webhook ack over a timeline write.
    console.error("[credit-topup] timeline write failed", err);
  });

  console.log(
    `[credit-topup] Granted ${credits} credits to ${input.businessId} (tx_ref ${input.txRef})`
  );
  return { granted: true, credits };
}
