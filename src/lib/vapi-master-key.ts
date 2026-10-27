/**
 * vapi-master-key.ts — single controller for the Vapi master credential + per-workspace isolation.
 *
 * WHY THIS EXISTS
 * The platform runs ONE Vapi account (the "master" account, key saved as
 * VAPI_PRIVATE_KEY with VAPI_API_KEY kept as the legacy fallback) and every
 * tenant gets its own isolated slice of it: a dedicated phone number, a
 * dedicated assistant, and a dedicated webhook token that signs the
 * serverUrl callbacks. Until now that contract was implicit — the env read
 * lived inside vapi-client.ts, the "is this workspace allowed to talk to
 * Vapi at all?" question was answered in vapi-provisioning.ts, and nothing
 * could answer "does this Vapi resource actually belong to this workspace?".
 *
 * This module is the one place those three questions are answered:
 *   1. credential  — resolveVapiKey / getVapiMasterKey / hasVapiMasterKey
 *   2. isolation   — getWorkspaceVoiceResources + assertVapiResourceOwnership
 *   3. access gate — evaluateVoiceAccess (paid subscription AND credit state)
 *
 * RULES THIS ENFORCES (business plan):
 * - Voice is gated on a VERIFIED paid subscription: an active subscription row
 *   with a provider payment identifier. Free-trial workspaces never reach Vapi.
 * - An ACTIVE call is never dropped when credits run out — the credit check
 *   below only decides whether a NEW call may start. Anything that ends a
 *   live call must not consult this module.
 * - A Vapi resource ID supplied by a caller is never trusted on its own: it
 *   must be the ID persisted for that workspace, or the operation is refused.
 *   That is what makes the shared master key safe for multi-tenancy.
 */

import { db } from "@/db";
import { business, phoneNumber, subscription } from "@/db/schema";
import { eq } from "drizzle-orm";
import { canStartNewVoiceCall } from "@/lib/credits";
import { APP_URL } from "@/lib/domains";

// ── Credential ───────────────────────────────────────────────

/** Owner-saved name first, legacy name second (order is contractual). */
export const VAPI_KEY_ENV_NAMES = ["VAPI_PRIVATE_KEY", "VAPI_API_KEY"] as const;

export class VapiKeyMissingError extends Error {
  constructor() {
    super(
      "Vapi master key is not configured (VAPI_PRIVATE_KEY, or the legacy VAPI_API_KEY)"
    );
    this.name = "VapiKeyMissingError";
  }
}

/**
 * Resolve the master key from an env bag. Pure so precedence is testable.
 * Returns null when neither name is set (empty strings count as unset — a
 * blank Vercel env var must fail closed rather than send `Bearer `).
 */
export function resolveVapiKey(
  env: Record<string, string | undefined>
): string | null {
  for (const name of VAPI_KEY_ENV_NAMES) {
    const value = env[name];
    if (typeof value === "string" && value.trim().length > 0) return value.trim();
  }
  return null;
}

/** The master key, or a typed error. Never logs the value. */
export function getVapiMasterKey(): string {
  const key = resolveVapiKey(process.env);
  if (!key) throw new VapiKeyMissingError();
  return key;
}

export function hasVapiMasterKey(): boolean {
  return resolveVapiKey(process.env) !== null;
}

// ── Per-workspace resources ─────────────────────────────────

export const VAPI_WEBHOOK_PATH_PREFIX = "/api/voice/vapi/";

export interface WorkspaceVoiceResources {
  businessId: string;
  assistantId: string | null;
  phoneNumberId: string | null;
  phoneNumber: string | null;
  /** Per-workspace webhook token — the bearer secret Vapi sends on callbacks. */
  webhookToken: string | null;
  webhookUrl: string | null;
  voiceSetupReady: boolean;
  provisionState: string | null;
  provisionError: string | null;
}

/** Webhook URL for a workspace token. Kept here so every caller builds it identically. */
export function buildWorkspaceWebhookUrl(token: string): string {
  return `${APP_URL}${VAPI_WEBHOOK_PATH_PREFIX}${token}`;
}

/**
 * Everything the platform knows about one workspace's Vapi slice.
 * Returns null when the business row does not exist (callers answer 404).
 */
export async function getWorkspaceVoiceResources(
  businessId: string
): Promise<WorkspaceVoiceResources | null> {
  const [biz] = await db
    .select({
      id: business.id,
      vapiAssistantId: business.vapiAssistantId,
      vapiWebhookToken: business.vapiWebhookToken,
      voiceSetupReady: business.voiceSetupReady,
      voiceProvisionState: business.voiceProvisionState,
      voiceProvisionError: business.voiceProvisionError,
    })
    .from(business)
    .where(eq(business.id, businessId))
    .limit(1);

  if (!biz) return null;

  const [pn] = await db
    .select({
      vapiPhoneNumberId: phoneNumber.vapiPhoneNumberId,
      number: phoneNumber.number,
    })
    .from(phoneNumber)
    .where(eq(phoneNumber.businessId, businessId))
    .limit(1);

  return {
    businessId: biz.id,
    assistantId: biz.vapiAssistantId ?? null,
    phoneNumberId: pn?.vapiPhoneNumberId ?? null,
    phoneNumber: pn?.number ?? null,
    webhookToken: biz.vapiWebhookToken ?? null,
    webhookUrl: biz.vapiWebhookToken
      ? buildWorkspaceWebhookUrl(biz.vapiWebhookToken)
      : null,
    voiceSetupReady: Boolean(biz.voiceSetupReady),
    provisionState: biz.voiceProvisionState ?? null,
    provisionError: biz.voiceProvisionError ?? null,
  };
}

export interface VapiResourceClaim {
  phoneNumberId?: string | null;
  assistantId?: string | null;
}

/**
 * Does every Vapi resource ID in `claim` belong to THIS workspace?
 *
 * Pure: takes the workspace snapshot so it can be unit-tested without a DB.
 * `undefined`/`null` members are ignored (nothing claimed, nothing to check);
 * a present-but-empty string is treated as a claim and therefore fails.
 */
export function workspaceOwnsResources(
  resources: WorkspaceVoiceResources | null,
  claim: VapiResourceClaim
): boolean {
  if (!resources) return false;
  if (claim.phoneNumberId != null) {
    if (!resources.phoneNumberId || claim.phoneNumberId !== resources.phoneNumberId) {
      return false;
    }
  }
  if (claim.assistantId != null) {
    if (!resources.assistantId || claim.assistantId !== resources.assistantId) {
      return false;
    }
  }
  return true;
}

/**
 * Guard for any code path that acts on a Vapi resource ID it did not just
 * receive from Vapi itself (form field, query param, stale cache). Throws
 * rather than returning a boolean so it cannot be ignored by a caller that
 * forgot the check — the shared master key makes a missed check a
 * cross-tenant write.
 */
export async function assertVapiResourceOwnership(
  businessId: string,
  claim: VapiResourceClaim
): Promise<void> {
  const resources = await getWorkspaceVoiceResources(businessId);
  if (!workspaceOwnsResources(resources, claim)) {
    throw new Error("Vapi resource does not belong to this workspace");
  }
}

// ── Access gate ─────────────────────────────────────────────

export type VoiceAccessReason =
  | "ok"
  | "no_business"
  | "onboarding_incomplete"
  | "no_subscription"
  | "subscription_inactive"
  | "no_verified_payment"
  | "credits_exhausted";

export interface VoiceAccessInput {
  /** Business row exists and onboarding_complete is true. */
  onboardingComplete: boolean;
  /** Subscription row present. */
  hasSubscription: boolean;
  /** Subscription status is exactly "active". */
  subscriptionActive: boolean;
  /** A provider payment identifier is stored (Flutterwave, or legacy Paystack). */
  verifiedPayment: boolean;
}

/** Pure part of the gate — the decision table, testable without a database. */
export function describeVoiceAccess(
  input: VoiceAccessInput | null,
  creditsAllowNewCall = true
): { allowed: boolean; reason: VoiceAccessReason } {
  if (!input) return { allowed: false, reason: "no_business" };
  if (!input.onboardingComplete) {
    return { allowed: false, reason: "onboarding_incomplete" };
  }
  if (!input.hasSubscription) return { allowed: false, reason: "no_subscription" };
  if (!input.subscriptionActive) {
    return { allowed: false, reason: "subscription_inactive" };
  }
  if (!input.verifiedPayment) {
    return { allowed: false, reason: "no_verified_payment" };
  }
  if (!creditsAllowNewCall) return { allowed: false, reason: "credits_exhausted" };
  return { allowed: true, reason: "ok" };
}

/**
 * Can this workspace START a new voice call right now?
 *
 * Never call this to decide whether to end a call that is already running —
 * the plan is explicit that an active call finishes gracefully even when the
 * allowance is spent; only NEW expensive AI work stops.
 */
export async function evaluateVoiceAccess(
  businessId: string
): Promise<{ allowed: boolean; reason: VoiceAccessReason }> {
  const [biz] = await db
    .select({ onboardingComplete: business.onboardingComplete })
    .from(business)
    .where(eq(business.id, businessId))
    .limit(1);

  if (!biz) return { allowed: false, reason: "no_business" };

  const [sub] = await db
    .select({
      status: subscription.status,
      flutterwaveSubId: subscription.flutterwaveSubId,
      paystackSubId: subscription.paystackSubId,
    })
    .from(subscription)
    .where(eq(subscription.businessId, businessId))
    .limit(1);

  const input: VoiceAccessInput = {
    onboardingComplete: Boolean(biz.onboardingComplete),
    hasSubscription: Boolean(sub),
    subscriptionActive: sub?.status === "active",
    // Verified payment identifier: Flutterwave sub id, or the legacy Paystack
    // column kept for rows created before the 2026-10-23 provider swap.
    verifiedPayment: Boolean(sub?.flutterwaveSubId || sub?.paystackSubId),
  };

  // Only consult the ledger once the commercial gates pass — and only to ask
  // whether a NEW call may begin.
  const creditsAllow = describeVoiceAccess(input).allowed
    ? await canStartNewVoiceCall(businessId)
    : true;

  return describeVoiceAccess(input, creditsAllow);
}
