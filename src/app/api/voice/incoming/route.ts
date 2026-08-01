import { NextResponse } from "next/server";
import { db } from "@/db";
import { business, aiBrainConfig, lead, conversation, message, appointment } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { generateId, timeToMinutes, computeDefaultEndTime } from "@/lib/utils";
import { buildAiContext } from "@/lib/ai-context";
import { createLlmCompletion } from "@/lib/llm";
import { notifyContractorOfNewLead, sendCustomerConfirmation } from "@/lib/notifications";

/**
 * AI Voice Call Handler — Twilio Webhook
 * 
 * Flow:
 * 1. Twilio forwards a missed call to this endpoint
 * 2. We identify the business by the Twilio phone number called
 * 3. AI greets the caller and handles the conversation via speech
 * 4. Leads and appointments are captured automatically
 */

/** Parse business ID from the called number */
async function findBusinessByPhone(phoneNumber: string) {
  const cleaned = phoneNumber.replace(/\D/g, "");
  const [biz] = await db.select().from(business).where(eq(business.phone, `+1${cleaned}`)).limit(1);
  if (biz) return biz;
  // Try without +1 prefix
  const [biz2] = await db.select().from(business).where(eq(business.phone, cleaned)).limit(1);
  if (biz2) return biz2;
  // Try contains match
  const allBiz = await db.select().from(business);
  return allBiz.find((b) => b.phone && b.phone.replace(/\D/g, "").includes(cleaned.slice(-10))) || null;
}

/** Generate TwiML for the next AI response */
function aiSay(message: string, nextUrl: string, gatherSpeech: boolean = true): string {
  const encoded = encodeURIComponent(message);
  if (gatherSpeech) {
    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna-Neural">${message}</Say>
  <Gather input="speech" speechTimeout="auto" action="${nextUrl}" method="POST" language="en-US" enhanced="true">
    <Say voice="Polly.Joanna-Neural">I'm listening...</Say>
  </Gather>
</Response>`;
  }
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna-Neural">${message}</Say>
  <Hangup/>
</Response>`;
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const calledNumber = formData.get("Called") as string || "";
    const callerNumber = formData.get("Caller") as string || "";
    const speechResult = formData.get("SpeechResult") as string || "";
    const callSid = formData.get("CallSid") as string || "";

    console.log(`[voice] Incoming call: from=${callerNumber} to=${calledNumber} speech="${speechResult}"`);

    // ─── STEP 1: Identify the business ───
    const biz = await findBusinessByPhone(calledNumber);
    if (!biz) {
      return new Response(aiSay("Sorry, we couldn't identify the business you're trying to reach. Please try again later.", "", false), {
        headers: { "Content-Type": "text/xml" },
      });
    }

    const businessId = biz.id;
    const businessName = biz.name || "this business";

    // ─── STEP 2: Load business context ───
    const [config] = await db.select().from(aiBrainConfig).where(eq(aiBrainConfig.businessId, businessId));
    const ctx = await buildAiContext(businessId);

    // Base URL for subsequent requests
    const baseUrl = `${request.headers.get("x-forwarded-proto") || "https"}://${request.headers.get("host")}`;
    const nextUrl = `${baseUrl}/api/voice/incoming?businessId=${businessId}`;

    // ─── STEP 3: First call or ongoing conversation ───
    if (!speechResult || speechResult.trim() === "") {
      // FIRST CALL — AI greets the caller
      const serviceList = (() => {
        try { const s = JSON.parse(config?.services || "[]"); return Array.isArray(s) ? s.join(", ") : "our services"; }
        catch { return "our services"; }
      })();

      const greeting = `Hello, and thank you for calling ${businessName}. We specialize in ${serviceList}. How can I help you today?`;

      // Save a new conversation
      const convId = generateId();
      await db.insert(conversation).values({
        id: convId, businessId, source: "voice", status: "active",
        customerPhone: callerNumber,
      });
      await db.insert(message).values({
        id: generateId(), conversationId: convId, role: "assistant", content: greeting,
      });

      return new Response(aiSay(greeting, `${nextUrl}&convId=${convId}`), {
        headers: { "Content-Type": "text/xml" },
      });
    }

    // ─── STEP 4: Process caller's speech ───
    const convId = new URL(request.url).searchParams.get("convId") || generateId();

    // Save caller's message
    await db.insert(message).values({
      id: generateId(), conversationId: convId, role: "user", content: `[VOICE CALL] ${speechResult}`,
    });

    // Get conversation history
    const msgs = await db.select().from(message)
      .where(eq(message.conversationId, convId))
      .orderBy(message.createdAt);

    const history = msgs.map((m) => ({
      role: m.role as "user" | "assistant" | "system",
      content: m.content.replace("[VOICE CALL] ", ""),
    }));

    // Build AI prompt for voice — keep it concise for phone
    const voicePrompt = `${ctx.systemPrompt}

VOICE CALL CONTEXT: You are speaking to a customer ON THE PHONE. Keep responses SHORT and CONVERSATIONAL — under 2 sentences. The customer can't see you, so be extra clear. 

If the customer wants to book: ask for date and time. Use [CONFIRM_APPOINTMENT]::date::startTime::endTime::service::name::phone::email.

If you have enough info to create a lead, use [CREATE_LEAD]::name::phone::email::preferredMethod::service description.

IMPORTANT: End your response with a clear question so the conversation continues naturally.`;

    const { completion } = await createLlmCompletion([
      { role: "system", content: voicePrompt },
      ...history,
    ]);

    const reply = completion?.content || "I'm sorry, I didn't catch that. Could you please repeat?";

    // Save AI response
    await db.insert(message).values({
      id: generateId(), conversationId: convId, role: "assistant", content: reply,
    });

    // Check for lead creation markers
    const leadMatch = reply.match(/\[CREATE_LEAD\]::([^:]+)::([^:]+)::([^:]+)::([^:]+)::([^:\n]+)/);
    if (leadMatch) {
      const [, name, phone, email, preferredMethod, notes] = leadMatch;
      if (name && name !== "not provided" && (phone || email)) {
        const leadId = generateId();
        await db.insert(lead).values({
          id: leadId, businessId, name: name.trim(), phone: phone.trim(), email: email.trim(),
          preferredMethod: preferredMethod.trim() || "phone",
          contactValue: preferredMethod.trim() === "email" ? email.trim() : phone.trim(),
          serviceRequest: notes.trim(), source: "voice", status: "new",
        });
        await db.update(conversation).set({ leadId }).where(eq(conversation.id, convId));
        
        // Notify contractor
        const summary = history.slice(-4).map((m: any) => `${m.role}: ${m.content.substring(0, 100)}`).join(" | ");
        Promise.all([
          notifyContractorOfNewLead(businessId, leadId, summary),
          sendCustomerConfirmation(businessId, leadId),
        ]).catch(() => {});
      }
    }

    // Check for appointment markers (flexible regex — same fix as ai/chat/route.ts)
    const apptMatch = reply.match(/\[CONFIRM_APPOINTMENT\]::([^:\n]*?)::([^:\n]*?)::([^:\n]*?)::([^:\n]*?)::([^:\n]*?)(?:::([^:\n]*?))?(?:::([^:\n]*?))?(?=\s*(?:$|\[|\n))/);
    if (apptMatch) {
      const date = apptMatch[1]?.trim() || "";
      const startTime = apptMatch[2]?.trim() || "";
      const rawEndTime = apptMatch[3]?.trim() || "";
      const service = apptMatch[4]?.trim() || "";
      const cName = apptMatch[5]?.trim() || "Voice Caller";
      const cPhone = apptMatch[6]?.trim() || callerNumber;
      const cEmail = apptMatch[7]?.trim() || "";
      const endTime = rawEndTime || computeDefaultEndTime(startTime);

      if (date && date !== "not provided" && startTime) {
        // Check for time conflicts before inserting
        let hasConflict = false;
        try {
          const existingAppts = await db
            .select()
            .from(appointment)
            .where(
              and(
                eq(appointment.businessId, businessId),
                eq(appointment.date, date),
                eq(appointment.status, "scheduled"),
              ),
            );
          const newStart = timeToMinutes(startTime);
          const newEnd = timeToMinutes(endTime);
          hasConflict = existingAppts.some((a) => {
            const aStart = timeToMinutes(a.startTime);
            const aEnd = timeToMinutes(a.endTime || computeDefaultEndTime(a.startTime));
            return newStart < aEnd && newEnd > aStart;
          });
        } catch { /* fall through — insert anyway */ }

        if (!hasConflict) {
          const apptId = generateId();
          await db.insert(appointment).values({
            id: apptId, businessId, customerName: cName,
            customerPhone: cPhone, customerEmail: cEmail,
            service: service, date: date, startTime: startTime,
            endTime: endTime, status: "scheduled",
          });
        }
      }
    }

    // Clean markers for spoken response
    const cleanReply = reply
      .replace(/\[CREATE_LEAD\]::[^\n]*/g, "")
      .replace(/\[CONFIRM_APPOINTMENT\]::[^\n]*/g, "")
      .trim();

    // Check if conversation should end
    const isClosing = /goodbye|bye|thank you for calling|have a great day|we'll be in touch/i.test(cleanReply);

    return new Response(
      aiSay(cleanReply, `${nextUrl}&convId=${convId}`, !isClosing),
      { headers: { "Content-Type": "text/xml" } }
    );

  } catch (error: any) {
    console.error("[voice] Error:", error?.message);
    return new Response(
      aiSay("I'm sorry, we're experiencing technical difficulties. Please try calling again or leave a message. Goodbye.", "", false),
      { headers: { "Content-Type": "text/xml" } }
    );
  }
}
