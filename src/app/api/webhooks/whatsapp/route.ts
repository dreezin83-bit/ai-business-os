import { NextResponse } from "next/server";
import { db } from "@/db";
import { business, conversation, message, lead, communicationLog } from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { generateId } from "@/lib/utils";
import { buildAiContext } from "@/lib/ai-context";
import { createLlmCompletion } from "@/lib/llm";
import { extractLeadFromConversation } from "@/lib/lead-extractor";
import { notifyContractorOfNewLead, sendCustomerConfirmation } from "@/lib/notifications";

/**
 * Meta WhatsApp Cloud API webhook.
 * Handles both verification (GET) and incoming messages (POST).
 *
 * Setup in Meta Developer Console:
 * - Callback URL: https://www.sagenifyai.com/api/webhooks/whatsapp
 * - Verify token: same as META_VERIFY_TOKEN env var
 * - Subscribe to: messages
 */

// GET: Webhook verification (Meta calls this when you first configure the webhook)
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const verifyToken = process.env.META_VERIFY_TOKEN || "ai_business_os_verify";

  if (mode === "subscribe" && token === verifyToken) {
    console.log("[whatsapp-webhook] Webhook verified");
    return new Response(challenge, { status: 200 });
  }

  return new Response("Verification failed", { status: 403 });
}

// POST: Incoming WhatsApp messages
export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log("[whatsapp-webhook] Received:", JSON.stringify(body).substring(0, 500));

    // Meta sends an array of entries, each with changes
    const entries = body.entry || [];
    for (const entry of entries) {
      const changes = entry.changes || [];
      for (const change of changes) {
        if (change.field !== "messages") continue;

        const value = change.value || {};
        const msgList = value.messages || [];
        const contacts = value.contacts || [];

        // Get the business's WhatsApp number from metadata
        const businessPhoneNumberId = value.metadata?.phone_number_id || "";

        for (const msg of msgList) {
          // Only handle text messages for now
          if (msg.type !== "text") continue;

          const from = msg.from; // Customer's WhatsApp number
          const text = msg.text?.body || "";

          if (!from || !text) continue;

          console.log(`[whatsapp-webhook] Message from ${from}: ${text}`);

          // Look up business by phone_number_id
          // We store the phone_number_id in a new field or use business.phone
          let biz: any;
          if (businessPhoneNumberId) {
            // Try to match by phone field
            const businesses = await db.select().from(business).where(eq(business.phone, `whatsapp:${businessPhoneNumberId}`));
            biz = businesses[0];
          }

          if (!biz) {
            console.log(`[whatsapp-webhook] No business found for phone_number_id: ${businessPhoneNumberId}`);
            continue;
          }

          // Get or create conversation
          let conversationId: string;
          const [existingConv] = await db
            .select()
            .from(conversation)
            .where(
              and(
                eq(conversation.businessId, biz.id),
                eq(conversation.customerPhone, from),
                eq(conversation.source, "whatsapp"),
                eq(conversation.status, "active")
              )
            )
            .orderBy(desc(conversation.createdAt))
            .limit(1);

          if (existingConv) {
            conversationId = existingConv.id;
          } else {
            conversationId = generateId();
            await db.insert(conversation).values({
              id: conversationId,
              businessId: biz.id,
              customerPhone: from,
              source: "whatsapp",
              status: "active",
            });
          }

          // Save message
          await db.insert(message).values({
            id: generateId(),
            conversationId,
            role: "user",
            content: text,
          });

          // Get history
          const messages = await db
            .select()
            .from(message)
            .where(eq(message.conversationId, conversationId))
            .orderBy(desc(message.createdAt));

          const history = messages.reverse().map((m) => ({
            role: m.role as "user" | "assistant" | "system",
            content: m.content,
          }));

          // Build AI context
          const ctx = await buildAiContext(biz.id);

          // Call AI
          const { completion } = await createLlmCompletion([
            { role: "system", content: ctx.systemPrompt },
            ...history,
          ]);

          let aiResponse = ctx.greetingMessage || "I'm sorry, I'm having trouble. Please try again.";
          let createdLeadId: string | null = null;

          if (completion) {
            aiResponse = completion.content;
            // Clean markers
            aiResponse = aiResponse
              .replace(/\[CREATE_LEAD\]::[^\n]*/g, "")
              .replace(/\[CONFIRM_APPOINTMENT\]::[^\n]*/g, "")
              .trim();

            // Try extraction
            try {
              const extracted = await extractLeadFromConversation([...history, { role: "assistant", content: aiResponse }]);
              if (extracted) {
                const [existingLead] = await db.select().from(lead)
                  .where(and(eq(lead.businessId, biz.id), eq(lead.name, extracted.name!)))
                  .limit(1);

                if (!existingLead) {
                  const newLeadId = generateId();
                  await db.insert(lead).values({
                    id: newLeadId,
                    businessId: biz.id,
                    name: extracted.name!,
                    phone: extracted.phone || from,
                    email: extracted.email || "",
                    preferredMethod: extracted.preferredMethod || "whatsapp",
                    contactValue: from,
                    serviceRequest: extracted.serviceRequest || "",
                    source: "whatsapp",
                    status: "new",
                  });
                  createdLeadId = newLeadId;
                  await db.update(conversation).set({ leadId: newLeadId }).where(eq(conversation.id, conversationId));
                  notifyContractorOfNewLead(biz.id, newLeadId).catch(() => {});
                  sendCustomerConfirmation(biz.id, newLeadId).catch(() => {});
                }
              }
            } catch {}
          }

          // Save AI response
          await db.insert(message).values({
            id: generateId(),
            conversationId,
            role: "assistant",
            content: aiResponse,
          });

          // Reply via Meta API
          const accessToken = process.env.META_ACCESS_TOKEN;
          const phoneNumberId = process.env.META_PHONE_NUMBER_ID;

          if (accessToken && phoneNumberId) {
            try {
              const metaRes = await fetch(
                `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`,
                {
                  method: "POST",
                  headers: {
                    Authorization: `Bearer ${accessToken}`,
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    messaging_product: "whatsapp",
                    to: from,
                    type: "text",
                    text: { body: aiResponse.substring(0, 1600) },
                  }),
                }
              );

              const metaData = await metaRes.json();
              await db.insert(communicationLog).values({
                id: generateId(),
                businessId: biz.id,
                leadId: createdLeadId,
                type: "whatsapp",
                toAddress: from,
                subject: "WhatsApp Reply",
                body: aiResponse.substring(0, 500),
                status: metaRes.ok ? "sent" : "failed",
                errorMessage: metaRes.ok ? "" : JSON.stringify(metaData).substring(0, 200),
                externalId: metaData.messages?.[0]?.id || "",
              });
            } catch (err: any) {
              console.error("[whatsapp-webhook] Reply failed:", err?.message);
            }
          }
        }
      }
    }

    return NextResponse.json({ status: "ok" });
  } catch (error: any) {
    console.error("[whatsapp-webhook] Error:", error?.message);
    return NextResponse.json({ status: "error" }, { status: 500 });
  }
}