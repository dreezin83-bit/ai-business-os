/**
 * Resend Inbound Email Webhook Handler
 *
 * Receives incoming customer emails forwarded by Resend, runs them through
 * the business's AI context, and sends an AI-generated reply back.
 *
 * Flow:
 * 1. Resend POSTs inbound email payload to this endpoint
 * 2. Resolve business by matching the "To" address against business.email
 * 3. Find or create a conversation for this customer
 * 4. Build AI context (injecting business info, services, etc.)
 * 5. Generate AI reply using OpenAI
 * 6. Send reply via Resend
 * 7. Parse for lead/appointment markers and create records
 * 8. Notify contractor of new leads
 *
 * Required env vars:
 *   RESEND_API_KEY    — for sending replies (already used by notifications.ts)
 *   OPENAI_API_KEY    — for AI completions (already used by llm.ts)
 *   RESEND_WEBHOOK_SECRET — (optional) Svix signing secret for webhook verification
 *
 * Resend webhook URL to configure in Resend dashboard:
 *   https://<your-domain>/api/webhooks/resend/inbound
 */

import { NextResponse } from "next/server";
import { db } from "@/db";
import { business, conversation, message, lead, appointment } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { generateId, timeToMinutes, computeDefaultEndTime } from "@/lib/utils";
import { buildAiContext } from "@/lib/ai-context";
import { createLlmCompletion } from "@/lib/llm";
import { extractLeadFromConversation, isValidLead } from "@/lib/lead-extractor";
import { notifyContractorOfNewLead, sendCustomerConfirmation, logCommunication, sendEmail } from "@/lib/notifications";

// ─── Constants ─────────────────────────────────────────────────

/** Maximum reply length in characters (email-safe, under common limits) */
const MAX_REPLY_LENGTH = 4000;

/** How many past messages to include in AI context for threading */
const MAX_HISTORY_MESSAGES = 20;

// ─── Webhook Signature Verification (Svix) ─────────────────────

/**
 * Verify the Resend webhook signature using Svix.
 * Resend uses the standard Svix webhook signing scheme.
 * If RESEND_WEBHOOK_SECRET is not set, verification is skipped with a warning.
 */
async function verifyWebhookSignature(request: Request, rawBody: string): Promise<boolean> {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) {
    console.warn("[resend-inbound] RESEND_WEBHOOK_SECRET not set — skipping signature verification (insecure)");
    return true;
  }

  const svixId = request.headers.get("svix-id");
  const svixTimestamp = request.headers.get("svix-timestamp");
  const svixSignature = request.headers.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    console.error("[resend-inbound] Missing Svix headers for webhook verification");
    return false;
  }

  try {
    // Use the Web Crypto API for HMAC verification
    const signedContent = `${svixId}.${svixTimestamp}.${rawBody}`;
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret.split("whsec_").pop() || secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"],
    );

    // Svix signatures are comma-separated, each "v1,base64sig"
    const signatures = svixSignature.split(" ").map((s) => s.split(",")[1]).filter(Boolean);

    for (const sig of signatures) {
      const sigBytes = Uint8Array.from(atob(sig), (c) => c.charCodeAt(0));
      const valid = await crypto.subtle.verify("HMAC", key, sigBytes, encoder.encode(signedContent));
      if (valid) return true;
    }

    console.error("[resend-inbound] Invalid webhook signature");
    return false;
  } catch (err: any) {
    console.error("[resend-inbound] Signature verification error:", err?.message);
    return false;
  }
}

// ─── Types ──────────────────────────────────────────────────────

interface ResendInboundPayload {
  type: string;
  data: {
    id: string;
    from: string;
    to: string[];
    subject: string;
    text: string;
    html?: string;
    headers?: Record<string, string>;
    created_at: string;
  };
}

/**
 * Parse a plain email address from "Name <email>" or "email" format.
 */
function parseEmailAddress(raw: string): string {
  const match = raw.match(/<([^>]+)>/);
  if (match) return match[1].trim().toLowerCase();
  return raw.trim().toLowerCase();
}

/**
 * Look up a business by matching any of the "to" addresses against business.email.
 * Requires an EXACT normalized match — no domain fallback.
 * Returns null for ambiguous or unmatched recipients so customer email
 * is never routed to the wrong contractor.
 */
async function findBusinessByEmail(toAddresses: string[]) {
  const normalized = toAddresses.map(parseEmailAddress);

  // Exact match only — tenant isolation is mandatory
  const allBusinesses = await db.select().from(business);
  for (const addr of normalized) {
    const match = allBusinesses.find(
      (b) => b.email && parseEmailAddress(b.email) === addr,
    );
    if (match) return match;
  }

  // No match found — safely reject so email is never misrouted
  console.log(
    `[resend-inbound] No exact business match for: ${normalized.join(", ")}. ` +
    `Rejecting to prevent cross-tenant routing.`
  );
  return null;
}

// ─── Parse markers from AI response ──────────────────────────

function parseLeadMarker(text: string) {
  const match = text.match(/\[CREATE_LEAD\]::([^:]+)::([^:]+)::([^:]+)::([^:]+)::([^:\n]+)/);
  if (!match) return null;
  return {
    name: match[1]?.trim(),
    phone: match[2]?.trim(),
    email: match[3]?.trim(),
    preferredMethod: match[4]?.trim(),
    notes: match[5]?.trim(),
  };
}

function parseAppointmentMarker(text: string) {
  const match = text.match(/\[CONFIRM_APPOINTMENT\]::([^:\n]*?)::([^:\n]*?)::([^:\n]*?)::([^:\n]*?)::([^:\n]*?)(?:::([^:\n]*?))?(?:::([^:\n]*?))?(?=\s*(?:$|\[|\n))/);
  if (!match) return null;
  return {
    date: match[1]?.trim() || "",
    startTime: match[2]?.trim() || "",
    endTime: match[3]?.trim() || "",
    service: match[4]?.trim() || "",
    customerName: match[5]?.trim() || "",
    customerPhone: match[6]?.trim() || "",
    customerEmail: match[7]?.trim() || "",
  };
}

// ─── Build email-optimized AI prompt ───────────────────────────

async function buildEmailPrompt(businessId: string, biz: typeof business.$inferSelect): Promise<string> {
  const ctx = await buildAiContext(businessId);

  const emailPrompt = [
    ctx.systemPrompt,
    "",
    "EMAIL RESPONSE INSTRUCTIONS:",
    "- You are replying to a customer via email. Be professional but warm.",
    "- Keep responses concise but thorough — email readers expect detail.",
    "- Start with a friendly greeting using their name if known.",
    "- Answer their question completely before asking follow-ups.",
    "- Include the business name in your signature.",
    "- For pricing: give real numbers, not ranges.",
    "- If you need more info: ask specific, not open-ended questions.",
    "- For booking: ask for preferred date, time, and service.",
    `- Today is ${new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}.`,
    "",
    `Business: ${biz.name || "our business"}`,
    biz.email ? `Contact email: ${biz.email}` : "",
    biz.phone ? `Contact phone: ${biz.phone}` : "",
  ].filter(Boolean).join("\n");

  return emailPrompt;
}

// ─── Handler ───────────────────────────────────────────────────

export async function POST(request: Request) {
  try {
    // ── Read raw body for signature verification ──
    const rawBody = await request.text();

    // ── Verify webhook signature ──
    const verified = await verifyWebhookSignature(request, rawBody);
    if (!verified) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
    }

    // ── Parse payload ──
    let payload: ResendInboundPayload;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    // Only handle email.received events
    if (payload.type !== "email.received") {
      console.log(`[resend-inbound] Ignoring event type: ${payload.type}`);
      return NextResponse.json({ received: true });
    }

    const { from, to, subject, text, html } = payload.data;

    if (!from || !to || to.length === 0) {
      return NextResponse.json({ error: "Missing from/to fields" }, { status: 400 });
    }

    const fromAddress = parseEmailAddress(from);
    const customerText = text || html?.replace(/<[^>]*>/g, "") || "";

    console.log(`[resend-inbound] Email from=${fromAddress} to=${to.join(", ")} subject="${subject}"`);

    if (!customerText.trim()) {
      console.log("[resend-inbound] Empty email body — ignoring");
      return NextResponse.json({ received: true });
    }

    // ── Resolve business ──
    const biz = await findBusinessByEmail(to);
    if (!biz) {
      console.log(`[resend-inbound] No business found for addresses: ${to.join(", ")}`);
      return NextResponse.json({ received: true, note: "No matching business" });
    }

    const businessId = biz.id;

    // ── Find or create conversation ──
    const [existingConv] = await db
      .select()
      .from(conversation)
      .where(
        and(
          eq(conversation.businessId, businessId),
          eq(conversation.customerEmail, fromAddress),
          eq(conversation.source, "email"),
          eq(conversation.status, "active"),
        ),
      )
      .orderBy(desc(conversation.createdAt))
      .limit(1);

    let conversationId: string;
    if (existingConv) {
      conversationId = existingConv.id;
    } else {
      conversationId = generateId();
      await db.insert(conversation).values({
        id: conversationId,
        businessId,
        customerEmail: fromAddress,
        source: "email",
        status: "active",
      });
    }

    // ── Save incoming message ──
    await db.insert(message).values({
      id: generateId(),
      conversationId,
      role: "user",
      content: `[EMAIL] Subject: ${subject}\n\n${customerText}`,
    });

    // ── Build conversation history ──
    const messages = await db
      .select()
      .from(message)
      .where(eq(message.conversationId, conversationId))
      .orderBy(desc(message.createdAt))
      .limit(MAX_HISTORY_MESSAGES);

    const history = messages.reverse().map((m) => ({
      role: m.role as "user" | "assistant" | "system",
      content: m.content.replace(/^\[EMAIL\] Subject: .*\n\n/, ""),
    }));

    // ── Build AI prompt ──
    const emailPrompt = await buildEmailPrompt(businessId, biz);

    // ── Call AI ──
    const { completion, error: llmError } = await createLlmCompletion([
      { role: "system", content: emailPrompt },
      ...history,
    ]);

    let aiResponse: string;
    let createdLeadId: string | null = null;

    if (!completion) {
      aiResponse = `Hi there,\n\nThank you for reaching out to ${biz.name || "us"}. We received your message and our team will get back to you as soon as possible.\n\nBest regards,\n${biz.name || "The Team"}`;
      console.error(`[resend-inbound] LLM error: ${llmError}`);
    } else {
      aiResponse = completion.content.substring(0, MAX_REPLY_LENGTH);

      // ── Parse markers (lead & appointment) ──
      const apptMarker = parseAppointmentMarker(aiResponse);
      const leadMarker = parseLeadMarker(aiResponse);

      // Handle appointment
      if (apptMarker && apptMarker.date && apptMarker.date !== "not provided" && apptMarker.startTime) {
        try {
          const endTime = apptMarker.endTime || computeDefaultEndTime(apptMarker.startTime);
          const apptId = generateId();

          // Check conflicts
          const [conflict] = await db
            .select({ id: appointment.id })
            .from(appointment)
            .where(
              and(
                eq(appointment.businessId, businessId),
                eq(appointment.date, apptMarker.date),
                eq(appointment.status, "scheduled"),
              ),
            )
            .limit(20);

          if (conflict) {
            // Check time overlap
            const allApps = await db
              .select()
              .from(appointment)
              .where(
                and(
                  eq(appointment.businessId, businessId),
                  eq(appointment.date, apptMarker.date),
                  eq(appointment.status, "scheduled"),
                ),
              );

            const newStart = timeToMinutes(apptMarker.startTime);
            const newEnd = timeToMinutes(endTime);
            const overlaps = allApps.some((a) => {
              const aStart = timeToMinutes(a.startTime);
              const aEnd = timeToMinutes(a.endTime || computeDefaultEndTime(a.startTime));
              return newStart < aEnd && newEnd > aStart;
            });

            if (!overlaps) {
              await db.insert(appointment).values({
                id: apptId,
                businessId,
                customerName: apptMarker.customerName || fromAddress,
                customerPhone: apptMarker.customerPhone || "",
                customerEmail: apptMarker.customerEmail || fromAddress,
                service: apptMarker.service,
                date: apptMarker.date,
                startTime: apptMarker.startTime,
                endTime,
                status: "scheduled",
              });
            }
          } else {
            await db.insert(appointment).values({
              id: apptId,
              businessId,
              customerName: apptMarker.customerName || fromAddress,
              customerPhone: apptMarker.customerPhone || "",
              customerEmail: apptMarker.customerEmail || fromAddress,
              service: apptMarker.service,
              date: apptMarker.date,
              startTime: apptMarker.startTime,
              endTime,
              status: "scheduled",
            });
          }
        } catch (err) {
          console.error("[resend-inbound] Appointment creation error:", err);
        }
      }

      // Handle lead
      if (leadMarker && leadMarker.name && leadMarker.name !== "not provided" && leadMarker.name.length > 1) {
        try {
          const [existingLead] = await db
            .select({ id: lead.id })
            .from(lead)
            .where(and(eq(lead.businessId, businessId), eq(lead.name, leadMarker.name)))
            .limit(1);

          if (!existingLead && (leadMarker.email || leadMarker.phone)) {
            const newLeadId = generateId();
            await db.insert(lead).values({
              id: newLeadId,
              businessId,
              name: leadMarker.name,
              phone: leadMarker.phone || "",
              email: leadMarker.email || fromAddress,
              preferredMethod: leadMarker.preferredMethod || "email",
              contactValue: leadMarker.preferredMethod === "phone" ? leadMarker.phone : (leadMarker.email || fromAddress),
              serviceRequest: leadMarker.notes || subject || "",
              source: "email",
              status: "new",
            });
            createdLeadId = newLeadId;
            await db.update(conversation).set({ leadId: newLeadId }).where(eq(conversation.id, conversationId));

            // Notify contractor
            const summary = history.slice(-4).map((m: any) => `${m.role}: ${m.content.substring(0, 80)}`).join(" | ");
            Promise.all([
              notifyContractorOfNewLead(businessId, newLeadId, summary),
              sendCustomerConfirmation(businessId, newLeadId),
            ]).catch((e) => console.error("[resend-inbound] Notification error:", e));
          }
        } catch (err) {
          console.error("[resend-inbound] Lead creation error:", err);
        }
      }

      // Fallback: server-side lead extraction if no marker lead was created
      if (!createdLeadId) {
        try {
          const extracted = await extractLeadFromConversation([
            ...history,
            { role: "assistant" as const, content: aiResponse },
          ]);
          if (extracted && isValidLead(extracted)) {
            const [existingLead] = await db
              .select({ id: lead.id })
              .from(lead)
              .where(and(eq(lead.businessId, businessId), eq(lead.name, extracted.name!)))
              .limit(1);

            if (!existingLead) {
              const newLeadId = generateId();
              await db.insert(lead).values({
                id: newLeadId,
                businessId,
                name: extracted.name!,
                phone: extracted.phone || "",
                email: extracted.email || fromAddress,
                preferredMethod: extracted.preferredMethod || "email",
                contactValue: extracted.phone || extracted.email || fromAddress,
                serviceRequest: extracted.serviceRequest || subject || "",
                source: "email",
                status: "new",
              });
              createdLeadId = newLeadId;
              await db.update(conversation).set({ leadId: newLeadId }).where(eq(conversation.id, conversationId));

              const summary = history.slice(-4).map((m: any) => `${m.role}: ${m.content.substring(0, 80)}`).join(" | ");
              Promise.all([
                notifyContractorOfNewLead(businessId, newLeadId, summary),
                sendCustomerConfirmation(businessId, newLeadId),
              ]).catch(() => {});
            }
          }
        } catch (err) {
          console.error("[resend-inbound] Lead extraction fallback error:", err);
        }
      }

      // ── Clean markers from the visible reply ──
      aiResponse = aiResponse
        .replace(/\[CONFIRM_APPOINTMENT\]::[^\n]*/g, "")
        .replace(/\[CREATE_LEAD\]::[^\n]*/g, "")
        .trim();
    }

    // ── Save AI response ──
    await db.insert(message).values({
      id: generateId(),
      conversationId,
      role: "assistant",
      content: `[EMAIL] ${aiResponse}`,
    });

    // ── Send reply via Resend ──
    const replySubject = subject.toLowerCase().startsWith("re:") ? subject : `Re: ${subject}`;
    const replyResult = await sendEmail(from, replySubject, aiResponse);

    // ── Log the communication ──
    await logCommunication({
      businessId,
      leadId: createdLeadId,
      type: "email",
      toAddress: from,
      subject: replySubject,
      body: aiResponse.substring(0, 500),
      status: replyResult.success ? "sent" : "failed",
      errorMessage: replyResult.error,
      externalId: replyResult.messageId,
    });

    console.log(`[resend-inbound] Reply ${replyResult.success ? "sent" : "failed"} to ${fromAddress}${createdLeadId ? `, lead created: ${createdLeadId}` : ""}`);

    return NextResponse.json({ received: true, replySent: replyResult.success });

  } catch (error: any) {
    console.error("[resend-inbound] Unhandled error:", error?.message || error);
    // Always return 200 to Resend to prevent retries
    return NextResponse.json({ received: true, error: "Internal error" }, { status: 200 });
  }
}
