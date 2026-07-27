/**
 * Auto-setup: purchase a phone number and create a Vapi assistant
 * for a newly signed-up contractor.
 */
import { db } from "@/db";
import { business, aiBrainConfig } from "@/db/schema";
import { eq } from "drizzle-orm";
import { buildAiContext } from "@/lib/ai-context";
import {
  buyPhoneNumber,
  createAssistant,
  assignAssistantToNumber,
} from "@/lib/vapi-client";

interface AutoSetupResult {
  success: boolean;
  phoneNumber?: string;
  phoneNumberId?: string;
  assistantId?: string;
  error?: string;
}

/**
 * Run the full Vapi auto-setup flow for a business:
 * 1. Purchase a Twilio phone number from Vapi
 * 2. Create a Vapi assistant configured with the business's AI Brain
 * 3. Assign the assistant to the phone number
 * 4. Update the business record with phone/assistant IDs
 */
export async function autoSetupVapi(
  businessId: string,
  areaCode?: string
): Promise<AutoSetupResult> {
  try {
    // Load business data
    const [biz] = await db
      .select()
      .from(business)
      .where(eq(business.id, businessId))
      .limit(1);

    if (!biz) return { success: false, error: "Business not found" };

    const [config] = await db
      .select()
      .from(aiBrainConfig)
      .where(eq(aiBrainConfig.businessId, businessId));

    // Skip if already set up
    if (biz.vapiPhoneNumberId && biz.vapiAssistantId) {
      console.log(
        `[AutoSetup] Business ${businessId} already has Vapi configured: phone=${biz.vapiPhoneNumber}`
      );
      return {
        success: true,
        phoneNumber: biz.vapiPhoneNumber || undefined,
        phoneNumberId: biz.vapiPhoneNumberId || undefined,
        assistantId: biz.vapiAssistantId || undefined,
      };
    }

    console.log(`[AutoSetup] Starting for business ${businessId} (${biz.name})`);

    // Step 1: Buy a phone number
    const phoneNumber = await buyPhoneNumber({ areaCode });

    // Step 2: Build AI context for the assistant
    const ctx = await buildAiContext(businessId);

    const voicePrompt = [
      ctx.systemPrompt,
      "",
      "VOICE CALL INSTRUCTIONS:",
      "- Be warm, conversational, and concise. Keep responses under 3 sentences.",
      "- This is a voice call — the customer can't re-read your answers.",
      "- If you don't know something, offer to have a human call them back.",
      "- For booking: collect name, phone, preferred date/time, and service needed.",
      "- Prices: say them clearly and slowly.",
    ].join("\n");

    const businessName = biz.name || "the business";
    const services = (() => {
      try {
        const s = JSON.parse(config?.services || "[]");
        return Array.isArray(s) ? s.join(", ") : "";
      } catch {
        return "";
      }
    })();

    const firstMessage =
      config?.greetingMessage ||
      `Hello, this is ${businessName}.${services ? ` We specialize in ${services}.` : ""} How can I help you today?`;

    // Build the server URL for this business's webhook
    const serverUrl = `https://ai-business-os-six.vercel.app/api/voice/vapi/${biz.vapiWebhookToken}`;

    // Step 3: Create assistant
    const assistant = await createAssistant({
      name: `${businessName} Voice Agent`,
      firstMessage,
      systemPrompt: voicePrompt,
      serverUrl,
      serverUrlSecret: process.env.VAPI_WEBHOOK_SECRET || "",
    });

    // Step 4: Assign assistant to phone number
    await assignAssistantToNumber(phoneNumber.id, assistant.id);

    // Step 5: Update business record
    await db
      .update(business)
      .set({
        vapiPhoneNumberId: phoneNumber.id,
        vapiPhoneNumber: phoneNumber.number,
        vapiAssistantId: assistant.id,
      })
      .where(eq(business.id, businessId));

    console.log(
      `[AutoSetup] Complete for ${businessId}: phone=${phoneNumber.number}, assistant=${assistant.id}`
    );

    return {
      success: true,
      phoneNumber: phoneNumber.number,
      phoneNumberId: phoneNumber.id,
      assistantId: assistant.id,
    };
  } catch (error: any) {
    console.error(`[AutoSetup] Failed for ${businessId}:`, error?.message);
    return {
      success: false,
      error: error?.message || "Unknown error during Vapi auto-setup",
    };
  }
}
