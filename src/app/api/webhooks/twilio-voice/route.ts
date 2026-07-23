import { NextResponse } from "next/server";
import { db } from "@/db";
import { business, communicationLog, conversation, message, lead } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { generateId } from "@/lib/utils";
import { buildAiContext } from "@/lib/ai-context";
import { createLlmCompletion } from "@/lib/llm";

/**
 * Twilio Voice webhook handler.
 * Called when someone calls a contractor's Twilio number.
 *
 * Flow:
 * 1. Twilio sends call status webhook
 * 2. If status is "no-answer" or "busy" or "failed" → missed call
 * 3. Look up which business owns this number
 * 4. Send WhatsApp message via Twilio to the caller
 * 5. Start AI conversation via WhatsApp
 */
export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const callStatus = formData.get("CallStatus")?.toString() || "";
    const from = formData.get("From")?.toString() || "";  // Caller's number
    const to = formData.get("To")?.toString() || "";       // Contractor's number
    const callSid = formData.get("CallSid")?.toString() || "";

    console.log(`[twilio-voice] CallStatus=${callStatus} From=${from} To=${to}`);

    // Only handle missed calls
    if (!["no-answer", "busy", "failed", "canceled"].includes(callStatus)) {
      // Call was answered — let the contractor handle it
      return new NextResponse("<Response></Response>", {
        headers: { "Content-Type": "application/xml" },
      });
    }

    if (!from || !to) {
      return new NextResponse("<Response></Response>", {
        headers: { "Content-Type": "application/xml" },
      });
    }

    // Look up business by Twilio number
    const [biz] = await db.select().from(business).where(eq(business.phone, to));
    if (!biz) {
      console.log(`[twilio-voice] No business found for number: ${to}`);
      return new NextResponse("<Response></Response>", {
        headers: { "Content-Type": "application/xml" },
      });
    }

    const businessName = biz.name || "the business";

    // Load AI context for personalized response
    const ctx = await buildAiContext(biz.id);

    // Build the missed call auto-reply using AI
    const { completion } = await createLlmCompletion([
      { role: "system", content: ctx.systemPrompt },
      { role: "user", content: `A customer just called and missed the call. Their phone number is ${from}. Send them a friendly WhatsApp message apologizing for missing their call, introduce yourself as representing ${businessName}, and ask how you can help them today. Keep it under 2 sentences.` },
    ]);

    const replyText = completion?.content || `Hi! Sorry we missed your call. This is ${businessName} — how can we help you today?`;

    // Send WhatsApp message via Twilio
    const twilioSid = process.env.TWILIO_ACCOUNT_SID;
    const twilioToken = process.env.TWILIO_AUTH_TOKEN;
    const twilioWhatsAppFrom = process.env.TWILIO_WHATSAPP_NUMBER;

    if (twilioSid && twilioToken && twilioWhatsAppFrom) {
      try {
        const encoded = Buffer.from(`${twilioSid}:${twilioToken}`).toString("base64");
        // WhatsApp uses "whatsapp:" prefix
        const waTo = from.startsWith("whatsapp:") ? from : `whatsapp:${from}`;

        const twilioRes = await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`,
          {
            method: "POST",
            headers: {
              Authorization: `Basic ${encoded}`,
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({
              To: waTo,
              From: twilioWhatsAppFrom,
              Body: replyText.substring(0, 1600),
            }),
          }
        );

        const twilioData = await twilioRes.json();

        await db.insert(communicationLog).values({
          id: generateId(),
          businessId: biz.id,
          leadId: null,
          type: "whatsapp",
          toAddress: from,
          subject: "Missed Call Auto-Reply",
          body: replyText,
          status: twilioRes.ok ? "sent" : "failed",
          errorMessage: twilioRes.ok ? "" : JSON.stringify(twilioData).substring(0, 200),
          externalId: twilioData.sid || callSid,
        });

        // Create a conversation entry so follow-ups work
        const [existingConv] = await db
          .select()
          .from(conversation)
          .where(
            and(
              eq(conversation.businessId, biz.id),
              eq(conversation.customerPhone, from),
              eq(conversation.status, "active")
            )
          )
          .orderBy(desc(conversation.createdAt))
          .limit(1);

        if (!existingConv) {
          const convId = generateId();
          await db.insert(conversation).values({
            id: convId,
            businessId: biz.id,
            customerPhone: from,
            source: "missed_call",
            status: "active",
          });
        }

        console.log(`[twilio-voice] WhatsApp auto-reply sent to ${from}`);
      } catch (twilioErr: any) {
        console.error("[twilio-voice] Failed to send WhatsApp:", twilioErr?.message);
      }
    } else {
      console.log("[twilio-voice] Twilio WhatsApp not configured — cannot send auto-reply");
      await db.insert(communicationLog).values({
        id: generateId(),
        businessId: biz.id,
        leadId: null,
        type: "whatsapp",
        toAddress: from,
        subject: "Missed Call Auto-Reply",
        body: replyText,
        status: "failed",
        errorMessage: "WhatsApp not configured (TWILIO_WHATSAPP_NUMBER missing)",
      });
    }

    return new NextResponse("<Response></Response>", {
      headers: { "Content-Type": "application/xml" },
    });

  } catch (error: any) {
    console.error("[twilio-voice] Error:", error?.message);
    return new NextResponse("<Response></Response>", {
      headers: { "Content-Type": "application/xml" },
    });
  }
}