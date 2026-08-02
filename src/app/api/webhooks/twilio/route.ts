import { NextResponse } from "next/server";
import { db } from "@/db";
import { business, conversation, message, lead, communicationLog, appointment } from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { generateId, timeToMinutes, computeDefaultEndTime } from "@/lib/utils";
import { buildAiContext } from "@/lib/ai-context";
import { createLlmCompletion } from "@/lib/llm";
import { extractLeadFromConversation } from "@/lib/lead-extractor";
import { notifyContractorOfNewLead, sendCustomerConfirmation } from "@/lib/notifications";
import { verifyTwilioSignature } from "@/lib/twilio-verify";

/**
 * Twilio WhatsApp webhook handler — X-Twilio-Signature verified.
 */
export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    if (!(await verifyTwilioSignature(request, rawBody))) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
    }
    const formData = new URLSearchParams(rawBody);
    const from = formData.get("From") || "";
    const to = formData.get("To") || "";
    const body = formData.get("Body") || "";
    const messageSid = formData.get("MessageSid") || "";

    console.log(`[twilio-webhook] From: ${from}, To: ${to}, Body: ${body}`);

    if (!from || !to || !body) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Look up business by WhatsApp number (stored in phone field or whatsapp_number)
    const businesses = await db
      .select()
      .from(business)
      .where(eq(business.phone, to));

    let biz = businesses[0];

    // If not found by phone, try looking up by a dedicated whatsapp_number field
    // For now, fall back to checking if any business has this number configured
    if (!biz) {
      // Try to find by checking if the "to" number matches any business phone
      // that could be used for WhatsApp
      console.log(`[twilio-webhook] No business found for WhatsApp number: ${to}`);
      return NextResponse.json({ 
        message: "No business configured for this number. Please contact support."
      }, { status: 404 });
    }

    const businessId = biz.id;
    const businessName = biz.name || "the business";

    // Get or create conversation for this customer
    let conversationId: string;
    const [existingConv] = await db
      .select()
      .from(conversation)
      .where(
        and(
          eq(conversation.businessId, businessId),
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
        businessId,
        customerPhone: from,
        source: "whatsapp",
        status: "active",
      });
    }

    // Save customer message
    await db.insert(message).values({
      id: generateId(),
      conversationId,
      role: "user",
      content: body,
    });

    // Get conversation history
    const messages = await db
      .select()
      .from(message)
      .where(eq(message.conversationId, conversationId))
      .orderBy(desc(message.createdAt));

    const history = messages.reverse().map((m) => ({
      role: m.role as "user" | "assistant" | "system",
      content: m.content,
    }));

    // Build AI context for this business
    const ctx = await buildAiContext(businessId);

    // Call AI
    const { completion, error: llmError } = await createLlmCompletion([
      { role: "system", content: ctx.systemPrompt },
      ...history,
    ]);

    let aiResponse: string;
    let createdLeadId: string | null = null;

    if (!completion) {
      aiResponse = ctx.greetingMessage || "I'm sorry, I'm having trouble connecting. Please try again later.";
    } else {
      aiResponse = completion.content;

      // Parse markers
      const apptMatch = aiResponse.match(/\[CONFIRM_APPOINTMENT\]::([^:\n]*?)::([^:\n]*?)::([^:\n]*?)::([^:\n]*?)::([^:\n]*?)(?:::([^:\n]*?))?(?:::([^:\n]*?))?(?=\s*(?:$|\[|\n))/);
      const leadMatch = aiResponse.match(/\[CREATE_LEAD\]::([^:]+)::([^:]*)::([^:]*)::([^:]*)::([^\n]+)/);

      if (apptMatch) {
        const apptDate = apptMatch[1]?.trim() || "";
        const apptStart = apptMatch[2]?.trim() || "";
        const rawEnd = apptMatch[3]?.trim() || "";
        const apptService = apptMatch[4]?.trim() || "";
        const apptCName = apptMatch[5]?.trim() || "WhatsApp Customer";
        const apptCPhone = apptMatch[6]?.trim() || from;
        const apptCEmail = apptMatch[7]?.trim() || "";
        const apptEnd = rawEnd || computeDefaultEndTime(apptStart);

        if (apptDate && apptStart && apptService && apptDate !== "not provided") {
          try {
            // Check time conflict
            const existing = await db
              .select()
              .from(appointment)
              .where(
                and(
                  eq(appointment.businessId, businessId),
                  eq(appointment.date, apptDate),
                  eq(appointment.status, "scheduled"),
                ),
              );
            const newStart = timeToMinutes(apptStart);
            const newEnd = timeToMinutes(apptEnd);
            const hasConflict = existing.some((a) => {
              const aStart = timeToMinutes(a.startTime);
              const aEnd = timeToMinutes(a.endTime || computeDefaultEndTime(a.startTime));
              return newStart < aEnd && newEnd > aStart;
            });

            if (!hasConflict) {
              const apptId = generateId();
              await db.insert(appointment).values({
                id: apptId, businessId, customerName: apptCName,
                customerPhone: apptCPhone, customerEmail: apptCEmail,
                service: apptService, date: apptDate, startTime: apptStart,
                endTime: apptEnd, status: "scheduled",
              });
            }
          } catch (err) {
            console.error("[twilio-webhook] Appointment creation error:", err);
          }
        }
      }

      if (leadMatch) {
        const [, name, phone, email, preferredMethod, notes] = leadMatch;
        if (name && name !== "not provided" && name.trim().length > 1) {
          const [existingLead] = await db
            .select()
            .from(lead)
            .where(and(eq(lead.businessId, businessId), eq(lead.name, name.trim())))
            .limit(1);

          if (!existingLead && (email || phone)) {
            const newLeadId = generateId();
            await db.insert(lead).values({
              id: newLeadId,
              businessId,
              name: name.trim(),
              phone: phone?.trim() || from,
              email: email?.trim() || "",
              preferredMethod: preferredMethod?.trim() || "whatsapp",
              contactValue: phone?.trim() || from,
              serviceRequest: notes?.trim() || "",
              source: "whatsapp",
              status: "new",
            });
            createdLeadId = newLeadId;
            await db.update(conversation).set({ leadId: newLeadId }).where(eq(conversation.id, conversationId));

            // Notify contractor
            notifyContractorOfNewLead(businessId, newLeadId).catch((e) => console.error("[twilio-webhook] notify failed:", e));
            sendCustomerConfirmation(businessId, newLeadId).catch((e) => console.error("[twilio-webhook] confirm failed:", e));
          }
        }
      }

      // Try server-side extraction if no marker lead
      if (!createdLeadId) {
        try {
          const extracted = await extractLeadFromConversation([
            ...history,
            { role: "assistant", content: aiResponse },
          ]);
          if (extracted) {
            const [existingLead] = await db
              .select()
              .from(lead)
              .where(and(eq(lead.businessId, businessId), eq(lead.name, extracted.name!)))
              .limit(1);

            if (!existingLead) {
              const newLeadId = generateId();
              await db.insert(lead).values({
                id: newLeadId,
                businessId,
                name: extracted.name!,
                phone: extracted.phone || from,
                email: extracted.email || "",
                preferredMethod: extracted.preferredMethod || "whatsapp",
                contactValue: extracted.phone || from,
                serviceRequest: extracted.serviceRequest || "",
                source: "whatsapp",
                status: "new",
              });
              createdLeadId = newLeadId;
              await db.update(conversation).set({ leadId: newLeadId }).where(eq(conversation.id, conversationId));

              notifyContractorOfNewLead(businessId, newLeadId).catch((e) => console.error("[twilio-webhook] notify failed:", e));
              sendCustomerConfirmation(businessId, newLeadId).catch((e) => console.error("[twilio-webhook] confirm failed:", e));
            }
          }
        } catch (extractErr: any) {
          console.error("[twilio-webhook] extraction error:", extractErr?.message);
        }
      }

      // Clean markers from response
      aiResponse = aiResponse
        .replace(/\[CONFIRM_APPOINTMENT\]::[^\n]*/g, "")
        .replace(/\[CREATE_LEAD\]::[^\n]*/g, "")
        .trim();
    }

    // Save AI response
    await db.insert(message).values({
      id: generateId(),
      conversationId,
      role: "assistant",
      content: aiResponse,
    });

    // Send response back via Twilio WhatsApp
    const twilioSid = process.env.TWILIO_ACCOUNT_SID;
    const twilioToken = process.env.TWILIO_AUTH_TOKEN;
    const twilioWhatsAppFrom = process.env.TWILIO_WHATSAPP_NUMBER;

    if (twilioSid && twilioToken && twilioWhatsAppFrom) {
      try {
        const encoded = Buffer.from(`${twilioSid}:${twilioToken}`).toString("base64");
        const twilioRes = await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`,
          {
            method: "POST",
            headers: {
              Authorization: `Basic ${encoded}`,
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({
              To: from,
              From: twilioWhatsAppFrom,
              Body: aiResponse.substring(0, 1600), // WhatsApp has 1600 char limit
            }),
          }
        );

        const twilioData = await twilioRes.json();
        await db.insert(communicationLog).values({
          id: generateId(),
          businessId,
          leadId: createdLeadId,
          type: "whatsapp",
          toAddress: from,
          subject: "WhatsApp Reply",
          body: aiResponse.substring(0, 500),
          status: twilioRes.ok ? "sent" : "failed",
          errorMessage: twilioRes.ok ? "" : JSON.stringify(twilioData).substring(0, 200),
          externalId: twilioData.sid || "",
        });
      } catch (twilioErr: any) {
        console.error("[twilio-webhook] Failed to send WhatsApp reply:", twilioErr?.message);
      }
    } else {
      console.log("[twilio-webhook] Twilio WhatsApp not configured — cannot send reply");
    }

    // Return empty 200 to acknowledge receipt (Twilio expects this)
    return new NextResponse("<Response></Response>", {
      headers: { "Content-Type": "application/xml" },
    });

  } catch (error: any) {
    console.error("[twilio-webhook] Error:", error?.message);
    return new NextResponse("<Response></Response>", {
      headers: { "Content-Type": "application/xml" },
    });
  }
}