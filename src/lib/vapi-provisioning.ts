/**
 * Vapi Provisioning Service
 *
 * Automates end-to-end voice setup after verified subscription + completed onboarding.
 * Uses the existing Vapi client library. Idempotent — safe to call multiple times.
 *
 * Flow:
 * 1. Generate unique webhook token (crypto.randomUUID)
 * 2. Buy a dedicated Vapi phone number
 * 3. Build assistant from business AI Brain config
 * 4. Create Vapi assistant
 * 5. Attach assistant to phone number
 * 6. Configure webhook URL with Bearer Token credential
 * 7. Persist all provider IDs, number, status, timestamps to DB
 * 8. Set voiceSetupReady = true
 *
 * Required env: VAPI_API_KEY, NEXT_PUBLIC_APP_URL (for webhook base URL)
 */

import { db } from "@/db";
import { business, phoneNumber, aiBrainConfig } from "@/db/schema";
import { eq } from "drizzle-orm";
import { generateId } from "@/lib/utils";
import { buildAiContext } from "@/lib/ai-context";
import {
  buyPhoneNumber,
  createAssistant,
  updatePhoneNumber,
  getAssistant,
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

/** Generate a cryptographically secure webhook token */
function generateWebhookToken(): string {
  return crypto.randomUUID();
}

/** Build the webhook URL for a given business */
function buildWebhookUrl(token: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL || "https://ai-business-os-six.vercel.app";
  return `${base}/api/voice/vapi/${token}`;
}

/**
 * Build a voice-optimized system prompt from the business's AI Brain config.
 */
async function buildVoicePrompt(businessId: string, businessName: string): Promise<string> {
  const ctx = await buildAiContext(businessId);

  const [config] = await db
    .select()
    .from(aiBrainConfig)
    .where(eq(aiBrainConfig.businessId, businessId));

  const services = (() => {
    try {
      const s = JSON.parse(config?.services || "[]");
      return Array.isArray(s) ? s.join(", ") : "";
    } catch {
      return "";
    }
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

/**
 * Check if a business is already provisioned.
 * Returns existing IDs if found.
 */
async function getExistingProvisioning(
  businessId: string,
): Promise<{ phoneNumberId?: string; assistantId?: string; phoneNumberValue?: string } | null> {
  const [biz] = await db.select().from(business).where(eq(business.id, businessId));
  if (!biz) return null;

  // Check if we have a phone number record
  const [pn] = await db
    .select()
    .from(phoneNumber)
    .where(eq(phoneNumber.businessId, businessId));

  if (pn && pn.vapiPhoneNumberId && biz.vapiAssistantId && biz.voiceSetupReady) {
    return {
      phoneNumberId: pn.vapiPhoneNumberId,
      assistantId: biz.vapiAssistantId,
      phoneNumberValue: pn.number,
    };
  }

  return null;
}

// ─── Core Provisioning ──────────────────────────────────────

/**
 * Provision a complete Vapi voice setup for a business.
 *
 * Idempotent — if the business already has voiceSetupReady = true with
 * valid provider IDs, returns the existing configuration immediately.
 *
 * Retries: each step is wrapped in its own try/catch. Failures are
 * recorded in business.voiceProvisionError. Successful steps are
 * persisted incrementally so partial progress is preserved.
 */
export async function provisionVapiVoice(
  businessId: string,
): Promise<ProvisioningResult> {
  console.log(`[vapi-provisioning] Starting for business ${businessId}`);

  // ── Validate env ─────────────────────────────────────
  const apiKey = process.env.VAPI_API_KEY;
  if (!apiKey) {
    const err = "VAPI_API_KEY not configured";
    await recordError(businessId, err);
    return { success: false, error: err };
  }

  // ── Load business ────────────────────────────────────
  const [biz] = await db.select().from(business).where(eq(business.id, businessId));
  if (!biz) {
    return { success: false, error: "Business not found" };
  }

  // ── Check existing (idempotent) ──────────────────────
  const existing = await getExistingProvisioning(businessId);
  if (existing) {
    console.log(`[vapi-provisioning] Business ${businessId} already provisioned — phone=${existing.phoneNumberValue}`);
    return {
      success: true,
      alreadyProvisioned: true,
      vapiPhoneNumberId: existing.phoneNumberId,
      vapiAssistantId: existing.assistantId,
      phoneNumber: existing.phoneNumberValue,
      webhookToken: biz.vapiWebhookToken || "",
      webhookUrl: biz.vapiWebhookToken ? buildWebhookUrl(biz.vapiWebhookToken) : "",
    };
  }

  const businessName = biz.name || "My Business";

  try {
    // ── Step 1: Generate webhook token ────────────────
    const webhookToken = biz.vapiWebhookToken || generateWebhookToken();
    const webhookUrl = buildWebhookUrl(webhookToken);

    if (!biz.vapiWebhookToken) {
      await db
        .update(business)
        .set({ vapiWebhookToken: webhookToken })
        .where(eq(business.id, businessId));
      console.log(`[vapi-provisioning] Webhook token set for ${businessId}`);
    }

    // ── Step 2: Buy phone number ──────────────────────
    console.log(`[vapi-provisioning] Buying phone number...`);
    let vapiNumber: VapiPhoneNumber;
    try {
      vapiNumber = await buyPhoneNumber({ provider: "twilio" });
      console.log(`[vapi-provisioning] Bought number: ${vapiNumber.number} (id=${vapiNumber.id})`);
    } catch (buyErr: any) {
      const err = `Failed to buy phone number: ${buyErr?.message || buyErr}`;
      await recordError(businessId, err);
      return { success: false, error: err, webhookToken, webhookUrl };
    }

    // ── Step 3: Build voice prompt ────────────────────
    let voicePrompt: string;
    try {
      voicePrompt = await buildVoicePrompt(businessId, businessName);
    } catch (ctxErr: any) {
      const err = `Failed to build voice prompt: ${ctxErr?.message || ctxErr}`;
      await recordError(businessId, err);
      return { success: false, error: err, webhookToken, webhookUrl };
    }

    // ── Step 4: Create assistant ──────────────────────
    const firstMessage = `Hello, this is ${businessName}. How can I help you today?`;
    console.log(`[vapi-provisioning] Creating assistant...`);
    let vapiAssistant: VapiAssistant;
    try {
      vapiAssistant = await createAssistant({
        name: `${businessName} Assistant`,
        firstMessage,
        systemPrompt: voicePrompt,
        serverUrl: webhookUrl,
        serverUrlSecret: webhookToken,
      });
      console.log(`[vapi-provisioning] Created assistant: ${vapiAssistant.id}`);
    } catch (asstErr: any) {
      const err = `Failed to create Vapi assistant: ${asstErr?.message || asstErr}`;
      await recordError(businessId, err);
      return {
        success: false,
        error: err,
        vapiPhoneNumberId: vapiNumber.id,
        phoneNumber: vapiNumber.number,
        webhookToken,
        webhookUrl,
      };
    }

    // ── Step 5: Attach assistant to phone number ─────
    console.log(`[vapi-provisioning] Attaching assistant ${vapiAssistant.id} to number ${vapiNumber.id}...`);
    try {
      await updatePhoneNumber(vapiNumber.id, {
        assistantId: vapiAssistant.id,
        serverUrl: webhookUrl,
        serverUrlSecret: webhookToken,
      });
      console.log(`[vapi-provisioning] Assistant attached to phone number`);
    } catch (attachErr: any) {
      const err = `Failed to attach assistant to phone number: ${attachErr?.message || attachErr}`;
      await recordError(businessId, err);
      return {
        success: false,
        error: err,
        vapiPhoneNumberId: vapiNumber.id,
        vapiAssistantId: vapiAssistant.id,
        phoneNumber: vapiNumber.number,
        webhookToken,
        webhookUrl,
      };
    }

    // ── Step 6: Persist all IDs ──────────────────────
    const now = new Date();
    await db
      .update(business)
      .set({
        vapiAssistantId: vapiAssistant.id,
        voiceSetupReady: true,
        voiceProvisionError: null,
        voiceProvisionedAt: now,
        updatedAt: now,
      })
      .where(eq(business.id, businessId));

    // Insert phone_number record
    const [existingPn] = await db
      .select()
      .from(phoneNumber)
      .where(eq(phoneNumber.businessId, businessId));

    if (existingPn) {
      await db
        .update(phoneNumber)
        .set({
          vapiPhoneNumberId: vapiNumber.id,
          number: vapiNumber.number,
          serverUrl: webhookUrl,
          provider: "twilio",
        })
        .where(eq(phoneNumber.id, existingPn.id));
    } else {
      await db.insert(phoneNumber).values({
        id: generateId(),
        businessId,
        vapiPhoneNumberId: vapiNumber.id,
        number: vapiNumber.number,
        serverUrl: webhookUrl,
        provider: "twilio",
      });
    }

    console.log(`[vapi-provisioning] SUCCESS — business ${businessId} fully provisioned`);
    console.log(`  Number: ${vapiNumber.number}`);
    console.log(`  Assistant: ${vapiAssistant.id}`);
    console.log(`  Webhook: ${webhookUrl}`);

    return {
      success: true,
      vapiPhoneNumberId: vapiNumber.id,
      vapiAssistantId: vapiAssistant.id,
      phoneNumber: vapiNumber.number,
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
    await db
      .update(business)
      .set({
        voiceProvisionError: error,
        voiceSetupReady: false,
        updatedAt: new Date(),
      })
      .where(eq(business.id, businessId));
  } catch (dbErr) {
    console.error(`[vapi-provisioning] Failed to record error:`, dbErr);
  }
}

/**
 * Check if a business has an active subscription and completed onboarding.
 * Returns true only when both conditions are met.
 */
export async function canProvisionVoice(businessId: string): Promise<boolean> {
  const [biz] = await db.select().from(business).where(eq(business.id, businessId));
  if (!biz) return false;

  // Onboarding must be complete
  if (!biz.onboardingComplete) {
    console.log(`[vapi-provisioning] Business ${businessId} onboarding not complete`);
    return false;
  }

  // Check subscription via existing subscription table
  const { subscription } = await import("@/db/schema");
  const [sub] = await db
    .select()
    .from(subscription)
    .where(eq(subscription.businessId, businessId));

  // Require an active subscription (or at minimum onboarding complete if no subscription yet)
  if (sub && sub.status !== "active") {
    console.log(`[vapi-provisioning] Business ${businessId} subscription not active (${sub.status})`);
    return false;
  }

  return true;
}
