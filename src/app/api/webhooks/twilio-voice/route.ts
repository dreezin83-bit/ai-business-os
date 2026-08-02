import { NextResponse } from "next/server";
import { db } from "@/db";
import { business, communicationLog, conversation, message, lead } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { generateId } from "@/lib/utils";
import { buildAiContext } from "@/lib/ai-context";
import { createLlmCompletion } from "@/lib/llm";
import { verifyTwilioSignature } from "@/lib/twilio-verify";

/**
 * Twilio Voice webhook handler — X-Twilio-Signature verified.
 */
export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    if (!(await verifyTwilioSignature(request, rawBody))) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
    }
    const formData = new URLSearchParams(rawBody);
    const callStatus = formData.get("CallStatus") || "";
    const from = formData.get("From") || "";
    const to = formData.get("To") || "";
    const callSid = formData.get("CallSid") || "";

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

    // Send WhatsApp message via Meta Cloud API (free)
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
              to: from, // caller's number — assumes WhatsApp-capable
              type: "text",
              text: { body: replyText.substring(0, 1600) },
            }),
          }
        );

        const metaData = await metaRes.json();

        await db.insert(communicationLog).values({
          id: generateId(),
          businessId: biz.id,
          leadId: null,
          type: "whatsapp",
          toAddress: from,
          subject: "Missed Call Auto-Reply",
          body: replyText,
          status: metaRes.ok ? "sent" : "failed",
          errorMessage: metaRes.ok ? "" : JSON.stringify(metaData).substring(0, 200),
          externalId: metaData.messages?.[0]?.id || callSid,
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