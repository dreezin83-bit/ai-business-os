/**
 * trial.ts — free-trial vs paid entitlement (owner-ratified 2026-10-24).
 *
 * The product rule this file implements:
 *   - Free trial  = 50 AI chat messages, voice LOCKED. No credit wallet is
 *     spent; the trial allowance is counted in MESSAGES, not credits, because
 *     that is the unit the owner promised customers.
 *   - Paid        = $20/month of provider cost = 4,000 credits (see
 *     CREDITS_INCLUDED_PER_PERIOD in lib/credits.ts), voice unlocked once the
 *     subscription is verified.
 *   - Both tiers write to the SAME per-tenant usage ledger (usage_event), so
 *     there is one auditable history and no bypass path: a trial workspace
 *     that messages us is counted by the same rows a paid one produces.
 *
 * "Paid" means a VERIFIED subscription: an active subscription row carrying a
 * provider payment identifier (Flutterwave, or the legacy Paystack column).
 * A row that exists but is unpaid/pending is NOT paid — it must not unlock
 * voice or the 4,000-credit allowance.
 *
 * Everything that decides anything is a pure function so each branch is
 * covered by tests; the DB reader is a thin, defensive wrapper.
 */

import { db } from "@/db";
import { business, subscription, usageEvent } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";

/** Owner promise: "nothing less than 50" trial chat messages. */
export const TRIAL_MESSAGE_LIMIT = Number(process.env.TRIAL_MESSAGE_LIMIT ?? 50);

export type WorkspaceTier = "trial" | "paid";

export interface TrialStateInput {
  /** The business row exists. */
  hasBusiness: boolean;
  /** Active subscription WITH a verified payment identifier. */
  paidVerified: boolean;
  /** AI chat turns already recorded in the tenant's usage ledger. */
  messagesUsed: number;
  /** Override for tests; defaults to TRIAL_MESSAGE_LIMIT. */
  limit?: number;
}

export interface Entitlements {
  tier: WorkspaceTier;
  paidVerified: boolean;
  /** Chat messages included in the free trial. */
  trialMessageLimit: number;
  trialMessagesUsed: number;
  /** Never negative — the UI shows 0, the ledger keeps the truth. */
  trialMessagesRemaining: number;
  /** Voice is paid-only. */
  voiceLocked: boolean;
  /** True when a NEW chat turn must be refused with 402. */
  chatBlocked: boolean;
  reason: "ok" | "trial_exhausted" | "no_business";
}

/**
 * The decision table. Paid workspaces are never restricted here — their cap is
 * the credit allowance, enforced by lib/credits.ts. Trial workspaces get
 * exactly TRIAL_MESSAGE_LIMIT chat turns with voice locked.
 */
export function describeTrialState(input: TrialStateInput): Entitlements {
  const limit = input.limit ?? TRIAL_MESSAGE_LIMIT;
  const used = Math.max(0, Math.floor(input.messagesUsed));

  if (!input.hasBusiness) {
    return {
      tier: "trial",
      paidVerified: false,
      trialMessageLimit: limit,
      trialMessagesUsed: 0,
      trialMessagesRemaining: 0,
      voiceLocked: true,
      chatBlocked: true,
      reason: "no_business",
    };
  }

  if (input.paidVerified) {
    return {
      tier: "paid",
      paidVerified: true,
      trialMessageLimit: limit,
      trialMessagesUsed: used,
      trialMessagesRemaining: Math.max(0, limit - used),
      voiceLocked: false,
      chatBlocked: false,
      reason: "ok",
    };
  }

  const remaining = Math.max(0, limit - used);
  return {
    tier: "trial",
    paidVerified: false,
    trialMessageLimit: limit,
    trialMessagesUsed: used,
    trialMessagesRemaining: remaining,
    voiceLocked: true,
    chatBlocked: remaining <= 0,
    reason: remaining <= 0 ? "trial_exhausted" : "ok",
  };
}

/** Body returned to the client when a trial workspace runs out of messages. */
export function trialExhaustedError(entitlements: Entitlements) {
  return {
    error: "AI_TRIAL_EXHAUSTED",
    message:
      "Your 50 free AI messages are used up. Subscribe to keep chatting — the plan includes 4,000 AI credits every month.",
    used: entitlements.trialMessagesUsed,
    limit: entitlements.trialMessageLimit,
  };
}

export interface PaidCheckInput {
  subscriptionExists: boolean;
  status: string | null | undefined;
  flutterwaveSubId: string | null | undefined;
  paystackSubId: string | null | undefined;
}

/**
 * Pure: is this subscription state "paid and verified"?
 * Pending/attention states never qualify, and neither does a row with no
 * provider payment identifier (that is how the free trial is kept from
 * unlocking paid features by simply having a subscription row written).
 */
export function isPaidVerified(input: PaidCheckInput | null): boolean {
  if (!input || !input.subscriptionExists) return false;
  if (input.status !== "active") return false;
  return Boolean(input.flutterwaveSubId || input.paystackSubId);
}

/** AI chat turns recorded for this workspace (the trial's counting unit). */
export async function countChatMessages(businessId: string): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(usageEvent)
    .where(
      and(
        eq(usageEvent.businessId, businessId),
        eq(usageEvent.eventType, "ai.completion")
      )
    );
  return Number(row?.count ?? 0);
}

/**
 * Read the workspace's current tier + trial consumption.
 *
 * Defensive by design: if the subscription or ledger tables are not readable
 * in this environment yet, we fall back to trial tier with zero usage rather
 * than taking the chat surface down. That fails toward "trial", never toward
 * "paid" — the paid allowance can never be granted by an error.
 */
export async function getWorkspaceEntitlements(
  businessId: string
): Promise<Entitlements> {
  let hasBusiness = false;
  let paidVerified = false;
  let messagesUsed = 0;

  try {
    const [biz] = await db
      .select({ id: business.id })
      .from(business)
      .where(eq(business.id, businessId))
      .limit(1);
    hasBusiness = Boolean(biz);
  } catch (err) {
    console.error("[trial] business lookup failed", {
      businessId,
      error: err instanceof Error ? err.message : String(err),
    });
    return describeTrialState({ hasBusiness: false, paidVerified: false, messagesUsed: 0 });
  }

  if (!hasBusiness) {
    return describeTrialState({ hasBusiness: false, paidVerified: false, messagesUsed: 0 });
  }

  try {
    const [sub] = await db
      .select({
        status: subscription.status,
        flutterwaveSubId: subscription.flutterwaveSubId,
        paystackSubId: subscription.paystackSubId,
      })
      .from(subscription)
      .where(eq(subscription.businessId, businessId))
      .limit(1);

    paidVerified = isPaidVerified({
      subscriptionExists: Boolean(sub),
      status: sub?.status,
      flutterwaveSubId: sub?.flutterwaveSubId,
      paystackSubId: sub?.paystackSubId,
    });
  } catch (err) {
    console.error("[trial] subscription lookup failed — staying on trial tier", {
      businessId,
      error: err instanceof Error ? err.message : String(err),
    });
  }

  // Only trial workspaces need the count; paid workspaces are metered by the
  // credit wallet, so skip the extra query for them.
  if (!paidVerified) {
    try {
      messagesUsed = await countChatMessages(businessId);
    } catch (err) {
      console.error("[trial] usage count failed — treating as zero", {
        businessId,
        error: err instanceof Error ? err.message : String(err),
      });
      messagesUsed = 0;
    }
  }

  return describeTrialState({ hasBusiness, paidVerified, messagesUsed });
}
