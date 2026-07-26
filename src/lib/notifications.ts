import { db } from "@/db";
import { communicationLog, business, communicationSettings, lead } from "@/db/schema";
import { eq } from "drizzle-orm";
import { generateId } from "@/lib/utils";

interface LeadData {
  id: string;
  name: string;
  phone: string;
  email: string;
  preferredMethod: string;
  serviceRequest: string;
}

interface NotificationContext {
  businessId: string;
  businessName: string;
  businessPhone: string;
  businessEmail: string;
  lead: LeadData;
}

/**
 * Log a communication attempt to the communication_log table.
 * Every notification — whether sent, queued, or failed — is logged here.
 */
export async function logCommunication(params: {
  businessId: string;
  leadId: string | null;
  type: "email" | "whatsapp";
  toAddress: string;
  subject: string;
  body: string;
  status: "sent" | "queued" | "failed";
  errorMessage?: string;
  externalId?: string;
}) {
  await db.insert(communicationLog).values({
    id: generateId(),
    businessId: params.businessId,
    leadId: params.leadId,
    type: params.type,
    toAddress: params.toAddress,
    subject: params.subject,
    body: params.body,
    status: params.status,
    errorMessage: params.errorMessage || "",
    externalId: params.externalId || "",
    sentAt: params.status === "sent" ? new Date() : undefined as any,
  });
}

/**
 * Send an email. Uses Resend if configured, otherwise logs as queued for future implementation.
 */
export async function sendEmail(to: string, subject: string, body: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return { success: false, error: "RESEND_API_KEY not configured. Email sending unavailable." };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM_ADDRESS || "notifications@aibusinessos.com",
        to,
        subject,
        text: body,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      return { success: false, error: `Resend API error ${res.status}: ${err.substring(0, 200)}` };
    }

    const data = await res.json();
    return { success: true, messageId: data.id };
  } catch (error: any) {
    return { success: false, error: error?.message || "Unknown email error" };
  }
}

/**
 * Send a WhatsApp message using Meta Cloud API (free tier).
 * Requires META_ACCESS_TOKEN and META_PHONE_NUMBER_ID in environment.
 */
async function sendWhatsApp(to: string, body: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const accessToken = process.env.META_ACCESS_TOKEN;
  const phoneNumberId = process.env.META_PHONE_NUMBER_ID;

  if (!accessToken || !phoneNumberId) {
    return { success: false, error: "WhatsApp not configured (META_ACCESS_TOKEN and META_PHONE_NUMBER_ID required)." };
  }

  try {
    const res = await fetch(
      `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: to.startsWith("whatsapp:") ? to.replace("whatsapp:", "") : to,
          type: "text",
          text: { body: body.substring(0, 1600) },
        }),
      }
    );

    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: `Meta API error ${res.status}: ${JSON.stringify(data).substring(0, 200)}` };
    }

    return { success: true, messageId: data.messages?.[0]?.id };
  } catch (error: any) {
    return { success: false, error: error?.message || "Unknown WhatsApp error" };
  }
}

/**
 * Build the full notification context by loading business and lead data.
 */
async function buildContext(businessId: string, leadId: string): Promise<NotificationContext | null> {
  const [biz] = await db.select().from(business).where(eq(business.id, businessId));
  if (!biz) return null;

  const [ld] = await db.select().from(lead).where(eq(lead.id, leadId));
  if (!ld) return null;

  return {
    businessId,
    businessName: biz.name || "Your Business",
    businessPhone: biz.phone || "",
    businessEmail: biz.email || "",
    lead: {
      id: ld.id,
      name: ld.name,
      phone: ld.phone || "",
      email: ld.email || "",
      preferredMethod: ld.preferredMethod || "email",
      serviceRequest: ld.serviceRequest || "",
    },
  };
}

/**
 * Notify the contractor about a new lead.
 * Reads communication settings and sends notifications through enabled channels.
 * Always creates a communication log even on failure.
 */
export async function notifyContractorOfNewLead(
  businessId: string,
  leadId: string,
  conversationSummary?: string
): Promise<void> {
  const ctx = await buildContext(businessId, leadId);
  
  // Load communication settings (use defaults if not configured)
  const [settings] = await db
    .select()
    .from(communicationSettings)
    .where(eq(communicationSettings.businessId, businessId));

  // Default to email enabled if no settings exist yet
  const emailEnabled = settings ? settings.emailEnabled : true;
  const whatsappEnabled = settings ? settings.whatsappEnabled : false;

  if (!ctx) {
    // Log failure to build context
    await logCommunication({
      businessId,
      leadId,
      type: "email",
      toAddress: settings ? "(contractor email not set)" : "(unknown)",
      subject: "Contractor Notification Failed",
      body: "Could not build notification context — business or lead not found.",
      status: "failed",
      errorMessage: "buildContext returned null",
    });
    console.error("[notifications] buildContext failed for contractor notification");
    return;
  }

  const { lead } = ctx;

  // Build the conversation summary line
  const summaryLine = conversationSummary
    ? `\nConversation: ${conversationSummary}`
    : "";

  const subject = `New Lead: ${lead.name} — ${lead.serviceRequest || "Service Inquiry"}`;
  const body = [
    `NEW LEAD NOTIFICATION`,
    `━━━━━━━━━━━━━━━━━━━━━`,
    `Name: ${lead.name}`,
    `Phone: ${lead.phone || "Not provided"}`,
    `Email: ${lead.email || "Not provided"}`,
    `Preferred Contact: ${lead.preferredMethod || "Not specified"}`,
    `Service Request: ${lead.serviceRequest || "Not specified"}`,
    summaryLine,
    `━━━━━━━━━━━━━━━━━━━━━`,
    `View all leads: https://ai-business-os-six.vercel.app/dashboard/leads`,
  ].filter(Boolean).join("\n");

  console.log(`[notifications] Notifying contractor about lead ${leadId} for business ${businessId}`);

  // Email notification to contractor
  if (emailEnabled) {
    if (ctx.businessEmail) {
      console.log(`[notifications] Sending email to contractor at ${ctx.businessEmail}`);
      const result = await sendEmail(ctx.businessEmail, subject, body);
      await logCommunication({
        businessId,
        leadId,
        type: "email",
        toAddress: ctx.businessEmail,
        subject,
        body,
        status: result.success ? "sent" : "failed",
        errorMessage: result.error,
        externalId: result.messageId,
      });
    } else {
      // Log that email is enabled but no address is configured
      await logCommunication({
        businessId,
        leadId,
        type: "email",
        toAddress: "(no business email configured)",
        subject,
        body,
        status: "failed",
        errorMessage: "Business email not set in profile. Contractor needs to add their email address.",
      });
    }
  }

  // WhatsApp notification to contractor
  if (whatsappEnabled && ctx.businessPhone) {
    const waBody = `📋 *New Lead*\n\n*Name:* ${lead.name}\n*Phone:* ${lead.phone || "N/A"}\n*Email:* ${lead.email || "N/A"}\n*Service:* ${lead.serviceRequest || "Not specified"}`;
    console.log(`[notifications] Sending WhatsApp to contractor at ${ctx.businessPhone}`);
    const result = await sendWhatsApp(ctx.businessPhone, waBody);
    await logCommunication({
      businessId,
      leadId,
      type: "whatsapp",
      toAddress: ctx.businessPhone,
      subject: "New Lead Notification",
      body: waBody,
      status: result.success ? "sent" : "failed",
      errorMessage: result.error,
      externalId: result.messageId,
    });
  }
}

/**
 * Send a confirmation message to the customer after their lead is created.
 * Uses their preferred contact method.
 */
export async function sendCustomerConfirmation(businessId: string, leadId: string): Promise<void> {
  const ctx = await buildContext(businessId, leadId);
  if (!ctx) {
    console.error("[notifications] Could not build context for confirmation");
    return;
  }

  const { lead, businessName } = ctx;
  const subject = `Thank you for contacting ${businessName}`;
  const body = [
    `Hi ${lead.name},`,
    ``,
    `Thank you for reaching out to ${businessName}! We've received your inquiry about:`,
    ``,
    `"${lead.serviceRequest || "our services"}"`,
    ``,
    `Our team will review your request and get back to you shortly. If you have any urgent questions, feel free to reply to this message.`,
    ``,
    `Best regards,`,
    `The ${businessName} Team`,
  ].join("\n");

  console.log(`[notifications] Sending confirmation to customer ${leadId} via ${lead.preferredMethod || "email"}`);

  // Send via the customer's preferred method (or fall back to email)
  if (lead.preferredMethod === "whatsapp" && lead.phone) {
    const result = await sendWhatsApp(lead.phone, body);
    await logCommunication({
      businessId,
      leadId,
      type: "whatsapp",
      toAddress: lead.phone,
      subject: "Lead Confirmation",
      body,
      status: result.success ? "sent" : "failed",
      errorMessage: result.error,
      externalId: result.messageId,
    });
  } else if (lead.email) {
    // Default to email
    const result = await sendEmail(lead.email, subject, body);
    await logCommunication({
      businessId,
      leadId,
      type: "email",
      toAddress: lead.email,
      subject,
      body,
      status: result.success ? "sent" : "failed",
      errorMessage: result.error,
      externalId: result.messageId,
    });
  } else {
    console.log(`[notifications] No contact method available for customer ${leadId} — skipping confirmation`);
  }
}