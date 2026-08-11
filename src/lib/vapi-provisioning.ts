/**
 * Vapi Provisioning Service
 *
 * Fully automated end-to-end voice setup after verified subscription + onboarding.
 * Uses the Vapi API exclusively — no separate Twilio account or manual setup.
 *
 * Vapi credential mechanism: Vapi's native credential model uses `serverUrl` +
 * `serverUrlSecret` on both phone numbers and assistants. The `serverUrlSecret`
 * is sent as `Authorization: Bearer {secret}` on every webhook call. This is
 * Vapi's documented mechanism — not a separate API.
 *
 * Provider: All numbers use provider "vapi" (Vapi-managed pool). No separate
 * Twilio/Vonage dependency — Vapi handles the underlying carrier internally.
 *
 * Idempotency & retry safety:
 * - `voiceProvisionState` lock prevents concurrent provisioning
 * - Before buying a new number, we reconcile existing Vapi resources via
 *   listPhoneNumbers to detect partial failures
 * - Each successful step is persisted incrementally so retries pick up where
 *   they left off
 * - `voiceSetupReady = true` only set after ALL steps succeed
 *
 * Flow:
 * 1. Acquire provisioning lock (voiceProvisionState = "provisioning")
 * 2. Generate unique webhook token (crypto.randomUUID)
 * 3. Reconcile: check for existing Vapi phone numbers for this business
 * 4. Buy a dedicated Vapi phone number (Vapi-managed pool)
 * 5. Build assistant from business AI Brain config
 * 6. Create Vapi assistant with webhook URL + bearer secret
 * 7. Attach assistant to phone number + configure webhook credential
 * 8. Persist all provider IDs, number, status, timestamps
 * 9. Set voiceSetupReady = true, state = "completed"
 *
 * Required env: VAPI_API_KEY, NEXT_PUBLIC_APP_URL
 */

import { db } from "@/db";
import { business, phoneNumber, aiBrainConfig, subscription } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { generateId } from "@/lib/utils";
import { buildAiContext } from "@/lib/ai-context";
import { recordTimelineEvent } from "@/lib/timeline";
import {
  buyPhoneNumber,
  createAssistant,
  updatePhoneNumber,
  listPhoneNumbers,
  type VapiPhoneNumber,
  type VapiAssistant,
} from "@/lib/vapi-client";

// ─── Types ──────────────────────────────────────────────────

export interface ProvisioningResult {
  success: boolean;
  vapiPhoneNumberId?: string;
  vapiAssistantId?: string;
  phoneNumber?: string;
  webhookToken?: string;
  webhookUrl?: string;
  error?: string;
  alreadyProvisioned?: boolean;
}

// ─── Helpers ────────────────────────────────────────────────

function generateWebhookToken(): string {
  return crypto.randomUUID();
}

function buildWebhookUrl(token: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL || "https://www.sagenifyai.com";
  return `${base}/api/voice/vapi/${token}`;
}

async function buildVoicePrompt(businessId: string, businessName: string): Promise<string> {
  const ctx = await buildAiContext(businessId);
  const [config] = await db
    .select()
    .from(aiBrainConfig)
    .where(eq(aiBrainConfig.businessId, businessId));

  const services = (() => {
    try { const s = JSON.parse(config?.services || "[]"); return Array.isArray(s) ? s.join(", ") : ""; }
    catch { return ""; }
  })();

  return [
    ctx.systemPrompt,
    "",
    "VOICE CALL INSTRUCTIONS:",
    "- Be warm, conversational, and concise. Keep responses under 3 sentences.",
    "- This is a voice call — the customer can't re-read your answers.",
    "- Listen carefully. Never re-ask something they already told you.",
    "- If you don't know something, offer to have a human call them back.",
    "- For booking: collect name, phone, preferred date/time, and service needed.",
    "- Use [CONFIRM_APPOINTMENT]::date::startTime::endTime::service::name::phone::email",
    "- Use [CREATE_LEAD]::name::phone::email::preferredMethod::service",
    "- Prices: say them clearly and slowly.",
    `- Today is ${new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}.`,
    "",
    `Business: ${businessName}`,
    services ? `Services: ${services}` : "",
  ].filter(Boolean).join("\n");
}

// ─── Locking ───────────────────────────────────────────────

async function acquireProvisioningLock(businessId: string): Promise<boolean> {
  const [biz] = await db.select().from(business).where(eq(business.id, businessId));
  if (!biz) return false;
  if (biz.voiceSetupReady) return false; // already done
  if (biz.voiceProvisionState === "provisioning") {
    // Check for stale lock (> 5 minutes)
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
    if (biz.voiceProvisionedAt && biz.voiceProvisionedAt > fiveMinAgo) {
      console.log(`[vapi-provisioning] Provisioning already in progress for ${businessId}`);
      return false;
    }
    // Stale lock — take it over
    console.log(`[vapi-provisioning] Taking over stale lock for ${businessId}`);
  }
  await db.update(business).set({ voiceProvisionState: "provisioning" }).where(eq(business.id, businessId));
  return true;
}

// ─── Reconciliation ────────────────────────────────────────

/**
 * Reconcile existing Vapi resources for a business.
 * Checks the Vapi API for phone numbers we may have already bought
 * (handles partial failure where number was bought but DB insert failed).
 */
async function reconcileExistingResources(
  businessId: string,
): Promise<{ phoneNumberId?: string; phoneNumberValue?: string }> {
  // Check our DB first
  const [pn] = await db
    .select()
    .from(phoneNumber)
    .where(eq(phoneNumber.businessId, businessId));

  if (pn && pn.vapiPhoneNumberId) {
    return { phoneNumberId: pn.vapiPhoneNumberId, phoneNumberValue: pn.number };
  }

  // Check Vapi API for orphaned numbers (bought but not persisted)
  try {
    const allNumbers = await listPhoneNumbers();
    // Vapi numbers don't have a businessId tag, so we check by webhook URL pattern
    const [biz] = await db.select().from(business).where(eq(business.id, businessId));
    if (!biz?.vapiWebhookToken) return {};

    const webhookUrl = buildWebhookUrl(biz.vapiWebhookToken);
    const matching = allNumbers.find((n) => n.serverUrl === webhookUrl);
    if (matching) {
      console.log(`[vapi-provisioning] Found orphaned number: ${matching.number} (id=${matching.id})`);
      // Persist it
      const id = generateId();
      await db.insert(phoneNumber).values({
        id,
        businessId,
        vapiPhoneNumberId: matching.id,
        number: matching.number,
        serverUrl: webhookUrl,
        provider: "vapi",
      });
      return { phoneNumberId: matching.id, phoneNumberValue: matching.number };
    }
  } catch (err) {
    console.warn(`[vapi-provisioning] Reconciliation list failed (non-fatal):`, err);
  }

  return {};
}

// ─── Core Provisioning ──────────────────────────────────────

export async function provisionVapiVoice(
  businessId: string,
): Promise<ProvisioningResult> {
  console.log(`[vapi-provisioning] Starting for business ${businessId}`);

  // ── Validate env ─────────────────────────────────────
  if (!process.env.VAPI_API_KEY) {
    await recordError(businessId, "VAPI_API_KEY not configured");
    return { success: false, error: "VAPI_API_KEY not configured" };
  }

  // ── Load business ────────────────────────────────────
  const [biz] = await db.select().from(business).where(eq(business.id, businessId));
  if (!biz) return { success: false, error: "Business not found" };

  // ── Already fully provisioned ─────────────────────────
  if (biz.voiceSetupReady && biz.vapiAssistantId) {
    const [pn] = await db.select().from(phoneNumber).where(eq(phoneNumber.businessId, businessId));
    console.log(`[vapi-provisioning] Already provisioned — phone=${pn?.number}`);
    return {
      success: true,
      alreadyProvisioned: true,
      vapiPhoneNumberId: pn?.vapiPhoneNumberId,
      vapiAssistantId: biz.vapiAssistantId,
      phoneNumber: pn?.number,
      webhookToken: biz.vapiWebhookToken || "",
      webhookUrl: biz.vapiWebhookToken ? buildWebhookUrl(biz.vapiWebhookToken) : "",
    };
  }

  // ── Acquire lock ─────────────────────────────────────
  const locked = await acquireProvisioningLock(businessId);
  if (!locked) {
    return { success: false, error: "Provisioning already in progress or already complete" };
  }

  await recordTimelineEvent({
    businessId,
    scope: "provisioning",
    event: "provisioning_started",
    detail: "Starting automated voice provisioning",
    status: "pending",
  });

  const businessName = biz.name || "My Business";

  try {
    // ── Step 1: Generate webhook token ────────────────
    const webhookToken = biz.vapiWebhookToken || generateWebhookToken();
    const webhookUrl = buildWebhookUrl(webhookToken);

    if (!biz.vapiWebhookToken) {
      await db.update(business).set({ vapiWebhookToken: webhookToken }).where(eq(business.id, businessId));
    }

    // ── Step 2: Reconcile + buy phone number ──────────
    let vapiNumberId: string;
    let vapiNumberValue: string;

    const reconciled = await reconcileExistingResources(businessId);
    if (reconciled.phoneNumberId && reconciled.phoneNumberValue) {
      vapiNumberId = reconciled.phoneNumberId;
      vapiNumberValue = reconciled.phoneNumberValue;
      console.log(`[vapi-provisioning] Reusing existing number: ${vapiNumberValue} (id=${vapiNumberId})`);
    } else {
      console.log(`[vapi-provisioning] Buying new Vapi-managed number...`);
      try {
        const vapiNumber: VapiPhoneNumber = await buyPhoneNumber({ provider: "vapi" });
        vapiNumberId = vapiNumber.id;
        vapiNumberValue = vapiNumber.number;
        console.log(`[vapi-provisioning] Bought number: ${vapiNumberValue} (id=${vapiNumberId})`);
        await recordTimelineEvent({
          businessId,
          scope: "provisioning",
          event: "phone_number_bought",
          detail: `AI phone number ${vapiNumberValue} purchased`,
          status: "success",
        });

        // Persist incrementally so retries don't re-buy
        const existingPn = await db
          .select({ id: phoneNumber.id })
          .from(phoneNumber)
          .where(eq(phoneNumber.businessId, businessId));
        if (existingPn.length > 0) {
          await db.update(phoneNumber).set({
            vapiPhoneNumberId: vapiNumberId,
            number: vapiNumberValue,
            serverUrl: webhookUrl,
            provider: "vapi",
          }).where(eq(phoneNumber.businessId, businessId));
        } else {
          await db.insert(phoneNumber).values({
            id: generateId(), businessId,
            vapiPhoneNumberId: vapiNumberId,
            number: vapiNumberValue,
            serverUrl: webhookUrl,
            provider: "vapi",
          });
        }
      } catch (buyErr: any) {
        const err = `Failed to buy phone number: ${buyErr?.message || buyErr}`;
        await recordError(businessId, err);
        return { success: false, error: err, webhookToken, webhookUrl };
      }
    }

    // ── Step 3: Build voice prompt ────────────────────
    let voicePrompt: string;
    try {
      voicePrompt = await buildVoicePrompt(businessId, businessName);
    } catch (ctxErr: any) {
      const err = `Failed to build voice prompt: ${ctxErr?.message || ctxErr}`;
      await recordError(businessId, err);
      return { success: false, error: err, vapiPhoneNumberId: vapiNumberId, phoneNumber: vapiNumberValue, webhookToken, webhookUrl };
    }

    // ── Step 4: Create or reuse assistant ─────────────
    let vapiAssistantId = biz.vapiAssistantId;
    if (!vapiAssistantId) {
      const firstMessage = `Hello, this is ${businessName}. How can I help you today?`;
      console.log(`[vapi-provisioning] Creating Vapi assistant...`);
      try {
        const vapiAssistant: VapiAssistant = await createAssistant({
          name: `${businessName} Assistant`,
          firstMessage,
          systemPrompt: voicePrompt,
          serverUrl: webhookUrl,
          serverUrlSecret: webhookToken,
        });
        vapiAssistantId = vapiAssistant.id;
        console.log(`[vapi-provisioning] Created assistant: ${vapiAssistantId}`);
        await recordTimelineEvent({
          businessId,
          scope: "provisioning",
          event: "assistant_created",
          detail: `AI voice assistant created (${vapiAssistantId})`,
          status: "success",
        });

        // Persist incrementally
        await db.update(business).set({ vapiAssistantId }).where(eq(business.id, businessId));
      } catch (asstErr: any) {
        const err = `Failed to create Vapi assistant: ${asstErr?.message || asstErr}`;
        await recordError(businessId, err);
        return { success: false, error: err, vapiPhoneNumberId: vapiNumberId, phoneNumber: vapiNumberValue, webhookToken, webhookUrl };
      }
    } else {
      console.log(`[vapi-provisioning] Reusing existing assistant: ${vapiAssistantId}`);
    }

    // ── Step 5: Attach assistant + webhook to phone number ──
    console.log(`[vapi-provisioning] Configuring phone number ${vapiNumberId}...`);
    try {
      await updatePhoneNumber(vapiNumberId, {
        assistantId: vapiAssistantId,
        serverUrl: webhookUrl,
        serverUrlSecret: webhookToken,
      });
      console.log(`[vapi-provisioning] Phone number configured with assistant + webhook`);
    } catch (attachErr: any) {
      const err = `Failed to configure phone number: ${attachErr?.message || attachErr}`;
      await recordError(businessId, err);
      return { success: false, error: err, vapiPhoneNumberId: vapiNumberId, vapiAssistantId, phoneNumber: vapiNumberValue, webhookToken, webhookUrl };
    }

    // ── Step 6: Mark complete ────────────────────────
    const now = new Date();
    await db.update(business).set({
      vapiAssistantId,
      voiceSetupReady: true,
      voiceProvisionState: "completed",
      voiceProvisionError: null,
      voiceProvisionedAt: now,
      updatedAt: now,
    }).where(eq(business.id, businessId));

    // Update phone_number record
    await db.update(phoneNumber).set({
      serverUrl: webhookUrl,
      provider: "vapi",
    }).where(eq(phoneNumber.businessId, businessId));

    await recordTimelineEvent({
      businessId,
      scope: "provisioning",
      event: "provisioning_completed",
      detail: `Voice provisioning complete — ${vapiNumberValue} is live`,
      status: "success",
    });

    console.log(`[vapi-provisioning] SUCCESS — business ${businessId} fully provisioned`);
    console.log(`  Number: ${vapiNumberValue}`);
    console.log(`  Assistant: ${vapiAssistantId}`);
    console.log(`  Webhook: ${webhookUrl}`);

    return {
      success: true,
      vapiPhoneNumberId: vapiNumberId,
      vapiAssistantId,
      phoneNumber: vapiNumberValue,
      webhookToken,
      webhookUrl,
    };

  } catch (error: any) {
    const err = `Unexpected provisioning error: ${error?.message || error}`;
    await recordError(businessId, err);
    return { success: false, error: err };
  }
}

// ─── Error handling ────────────────────────────────────────

async function recordError(businessId: string, error: string): Promise<void> {
  console.error(`[vapi-provisioning] ERROR for ${businessId}: ${error}`);
  try {
    await db.update(business).set({
      voiceProvisionError: error,
      voiceProvisionState: "failed",
      voiceSetupReady: false,
      updatedAt: new Date(),
    }).where(eq(business.id, businessId));
  } catch (dbErr) {
    console.error(`[vapi-provisioning] Failed to record error:`, dbErr);
  }
  await recordTimelineEvent({
    businessId,
    scope: "provisioning",
    event: "provisioning_failed",
    detail: error.substring(0, 500),
    status: "failed",
  });
}

// ─── Provisioning gate ─────────────────────────────────────

/**
 * Check if a business qualifies for voice provisioning.
 * REQUIRES BOTH:
 *   1. Completed onboarding
 *   2. An explicit active subscription with a verified payment identifier
 *
 * Returns false for unpaid/free accounts — no exceptions.
 */
export async function canProvisionVoice(businessId: string): Promise<boolean> {
  const [biz] = await db.select().from(business).where(eq(business.id, businessId));
  if (!biz) return false;

  if (!biz.onboardingComplete) {
    console.log(`[vapi-provisioning] Business ${businessId}: onboarding not complete`);
    return false;
  }

  // Require an explicit active subscription with a verified payment ID
  const [sub] = await db
    .select()
    .from(subscription)
    .where(eq(subscription.businessId, businessId));

  if (!sub) {
    console.log(`[vapi-provisioning] Business ${businessId}: no subscription record — rejecting`);
    return false;
  }

  if (sub.status !== "active") {
    console.log(`[vapi-provisioning] Business ${businessId}: subscription status is "${sub.status}" — rejecting`);
    return false;
  }

  // Require a verified payment identifier (Paystack or Flutterwave sub ID)
  const hasPaymentId = !!sub.paystackSubId || !!sub.flutterwaveSubId;
  if (!hasPaymentId) {
    console.log(`[vapi-provisioning] Business ${businessId}: no verified payment identifier — rejecting`);
    return false;
  }

  console.log(`[vapi-provisioning] Business ${businessId}: eligible for provisioning`);
  return true;
}
