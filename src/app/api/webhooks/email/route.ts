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
 * Inbound email webhook.
 * When a customer replies to a confirmation email, this webhook receives it
 * and routes it to the business's AI for response.
 *
 * Setup: Configure your email provider to forward inbound emails to this endpoint.
 * For Resend, use: https://resend.com/docs/dashboard/webhooks
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Handle Resend webhook format
    const emailData = body.data || body;
    const fromEmail = emailData.from || body.from || "";
    const toEmail = emailData.to || body.to || "";
    const subject = emailData.subject || body.subject || "";
    const textBody = emailData.text || emailData.html || body.text || body.body || "";

    console.log(`[email-webhook] From: ${fromEmail}, To: ${toEmail}, Subject: ${subject}`);

    if (!fromEmail || !textBody) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    // Try to find the business by matching the "to" email address
    // The confirmation email is sent TO the customer FROM notifications@sagenifyai.com
    // A reply goes FROM customer TO notifications@sagenifyai.com
    // We need to find which business this customer belongs to by looking up their email in leads
    const leads = await db
      .select()
      .from(lead)
      .where(eq(lead.email, fromEmail))
      .orderBy(desc(lead.createdAt))
      .limit(1);

    let businessId: string | null = null;
    let businessName = "the business";

    if (leads.length > 0) {
      businessId = leads[0].businessId;
      const [biz] = await db.select().from(business).where(eq(business.id, businessId!));
      if (biz) businessName = biz.name || "the business";
    } else {
      // Fallback: try to find by the "to" address pattern
      // e.g. business-name@platform.com
      console.log(`[email-webhook] No lead found for ${fromEmail}, trying to match by to address`);
      return NextResponse.json({ message: "No matching business found for this email" }, { status: 404 });
    }

    // Get or create conversation
    let conversationId: string;
    const [existingConv] = await db
      .select()
      .from(conversation)
      .where(
        and(
          eq(conversation.businessId, businessId),
          eq(conversation.customerEmail, fromEmail),
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
        customerEmail: fromEmail,
        source: "email",
        status: "active",
      });
    }

    // Save customer message
    const cleanBody = textBody.replace(/<[^>]*>/g, "").replace(/On.*wrote:/gs, "").trim().substring(0, 2000);
    await db.insert(message).values({
      id: generateId(),
      conversationId,
      role: "user",
      content: cleanBody,
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

    // Build AI context
    const ctx = await buildAiContext(businessId);

    // Call AI
    const { completion, error: llmError } = await createLlmCompletion([
      { role: "system", content: ctx.systemPrompt },
      ...history,
    ]);

    let aiResponse = "I'm sorry, I'm having trouble connecting right now. Please try again later.";
    let createdLeadId: string | null = null;

    if (completion) {
      aiResponse = completion.content.replace(/\[CREATE_LEAD\]::[^\n]*/g, "").replace(/\[CONFIRM_APPOINTMENT\]::[^\n]*/g, "").trim();

      // Try lead extraction
      try {
        const extracted = await extractLeadFromConversation([
          ...history,
          { role: "assistant", content: aiResponse },
        ]);
        if (extracted) {
          const [existingLead] = await db
            .select()
            .from(lead)
            .where(and(eq(lead.businessId, businessId!), eq(lead.name, extracted.name!)))
            .limit(1);

          if (!existingLead) {
            const newLeadId = generateId();
            await db.insert(lead).values({
              id: newLeadId,
              businessId: businessId!,
              name: extracted.name!,
              phone: extracted.phone || "",
              email: extracted.email || fromEmail,
              preferredMethod: extracted.preferredMethod || "email",
              contactValue: extracted.email || fromEmail,
              serviceRequest: extracted.serviceRequest || "",
              source: "email",
              status: "new",
            });
            createdLeadId = newLeadId;
            await db.update(conversation).set({ leadId: newLeadId }).where(eq(conversation.id, conversationId));

            notifyContractorOfNewLead(businessId!, newLeadId).catch((e) => console.error("[email-webhook] notify failed:", e));
            sendCustomerConfirmation(businessId!, newLeadId).catch((e) => console.error("[email-webhook] confirm failed:", e));
          }
        }
      } catch (extractErr: any) {
        console.error("[email-webhook] extraction error:", extractErr?.message);
      }
    }

    // Save AI response
    await db.insert(message).values({
      id: generateId(),
      conversationId,
      role: "assistant",
      content: aiResponse,
    });

    // Send email reply via Resend
    const resendKey = process.env.RESEND_API_KEY;
    if (resendKey) {
      try {
        const resendRes = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: process.env.EMAIL_FROM_ADDRESS || "notifications@sagenifyai.com",
            to: fromEmail,
            subject: `Re: ${subject || "Your inquiry"}`,
            text: aiResponse,
          }),
        });

        const resendData = await resendRes.json();
        await db.insert(communicationLog).values({
          id: generateId(),
          businessId: businessId!,
          leadId: createdLeadId,
          type: "email",
          toAddress: fromEmail,
          subject: subject || "Email Reply",
          body: aiResponse.substring(0, 500),
          status: resendRes.ok ? "sent" : "failed",
          errorMessage: resendRes.ok ? "" : JSON.stringify(resendData).substring(0, 200),
          externalId: resendData.id || "",
        });
      } catch (emailErr: any) {
        console.error("[email-webhook] Failed to send reply:", emailErr?.message);
      }
    }

    return NextResponse.json({ success: true, conversationId });

  } catch (error: any) {
    console.error("[email-webhook] Error:", error?.message);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}