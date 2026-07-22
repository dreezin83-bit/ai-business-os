import { db } from "@/db";
import {
  business,
  aiBrainConfig,
  knowledgeDocument,
  communicationSettings,
  appointment,
  automationRule,
} from "@/db/schema";
import { eq, gte, and } from "drizzle-orm";

export interface AiContext {
  systemPrompt: string;
  businessName: string;
  greetingMessage: string;
  upcomingAppointments: Array<{ date: string; startTime: string; endTime: string; service: string }>;
  enabledAutomationRules: Array<{ type: string; channel: string; messageTemplate: string }>;
}

interface BusinessHour {
  day: string;
  open: string;
  close: string;
  closed: boolean;
}

/**
 * Load ALL contractor data for a business and build a comprehensive AI context + system prompt.
 * Every field from AI Brain is included in the prompt. Nothing is silently dropped.
 */
export async function buildAiContext(businessId: string): Promise<AiContext> {
  // Load all relevant data
  const [biz] = await db.select().from(business).where(eq(business.id, businessId));
  const [config] = await db.select().from(aiBrainConfig).where(eq(aiBrainConfig.businessId, businessId));
  const docs = await db.select().from(knowledgeDocument).where(eq(knowledgeDocument.businessId, businessId));
  const [commSettings] = await db.select().from(communicationSettings).where(eq(communicationSettings.businessId, businessId));

  // Get appointments for the next 14 days
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const fourteenDaysLater = new Date(today);
  fourteenDaysLater.setDate(fourteenDaysLater.getDate() + 14);

  const todayStr = today.toISOString().split("T")[0];

  const upcomingAppts = await db
    .select()
    .from(appointment)
    .where(
      and(
        eq(appointment.businessId, businessId),
        gte(appointment.date, todayStr),
        eq(appointment.status, "scheduled")
      )
    );

  // Get enabled automation rules
  const rules = await db
    .select()
    .from(automationRule)
    .where(
      and(eq(automationRule.businessId, businessId), eq(automationRule.enabled, true))
    );

  // --- BUILD SECTIONS FROM SAVED DATA ---

  const name = biz?.name || "the business";

  // Build each section only if data exists
  const sections: string[] = [];

  // 1. System Instruction (core behavior)
  sections.push(`SYSTEM INSTRUCTION: ${config?.systemPrompt || "You are a helpful assistant for a service business. Answer questions about services, pricing, and scheduling."}`);

  // 2. Business Profile (from business table)
  sections.push(`\n\nBUSINESS PROFILE:
Name: ${name}
Phone: ${biz?.phone || "Not provided"}
Email: ${biz?.email || "Not provided"}
Website: ${biz?.website || "Not provided"}
Address: ${biz?.address || "Not provided"}`);

  // 3. Business Description (from AI Brain)
  if (config?.businessInfo) {
    sections.push(`\n\nABOUT THE BUSINESS:\n${config.businessInfo}`);
  }

  // 4. Services
  if (config?.services) {
    try {
      const services = JSON.parse(config.services);
      if (Array.isArray(services) && services.length > 0) {
        sections.push(`\n\nSERVICES OFFERED:\n${services.map((s: string) => `- ${s}`).join("\n")}`);
      }
    } catch {}
  }

  // 5. Business Hours (fix: parse as array of objects, not Record<string,string>)
  if (config?.businessHours) {
    try {
      const hours: BusinessHour[] = JSON.parse(config.businessHours);
      if (Array.isArray(hours) && hours.length > 0) {
        const lines = hours.map((h) => {
          if (h.closed) return `- ${h.day}: Closed`;
          return `- ${h.day}: ${h.open || "??"} - ${h.close || "??"}`;
        });
        sections.push(`\n\nBUSINESS HOURS:\n${lines.join("\n")}`);
      }
    } catch {}
  }

  // 6. Service Areas
  if (config?.serviceAreas) {
    try {
      const areas = JSON.parse(config.serviceAreas);
      if (Array.isArray(areas) && areas.length > 0) {
        sections.push(`\n\nSERVICE AREAS:\n${areas.join(", ")}`);
      }
    } catch {}
  }

  // 7. FAQs
  if (config?.faqs) {
    try {
      const faqs = JSON.parse(config.faqs);
      if (Array.isArray(faqs) && faqs.length > 0) {
        sections.push(`\n\nFAQs:\n${faqs.map((f: string) => `- ${f}`).join("\n")}`);
      }
    } catch {}
  }

  // 8. Pricing Guidance
  if (config?.pricingGuidance) {
    sections.push(`\n\nPRICING GUIDANCE:\n${config.pricingGuidance}`);
  }

  // 9. Company Policies
  if (config?.companyPolicies) {
    sections.push(`\n\nCOMPANY POLICIES:\n${config.companyPolicies}`);
  }

  // 10. Knowledge Base
  const knowledgeText = docs
    .map((d) => d.content)
    .filter(Boolean)
    .join("\n\n")
    .substring(0, 5000);
  if (knowledgeText) {
    sections.push(`\n\nKNOWLEDGE BASE:\n${knowledgeText}`);
  }

  // 11. Communication Preferences
  const emailOn = commSettings?.emailEnabled !== false;
  const whatsappOn = commSettings?.whatsappEnabled === true;
  const smsOn = commSettings?.smsEnabled !== false;
  const primary = commSettings?.primaryMethod || "email";

  sections.push(`\n\nCOMMUNICATION PREFERENCES:
- Email: ${emailOn ? "ENABLED" : "DISABLED"}
- WhatsApp: ${whatsappOn ? "ENABLED" : "DISABLED"}
- SMS: ${smsOn ? "ENABLED" : "DISABLED"}
- Primary: ${primary}`);

  // 12. Lead Collection Rules (from AI Brain)
  if (config?.leadCollectionRules) {
    sections.push(`\n\nLEAD COLLECTION RULES (from business settings):\n${config.leadCollectionRules}`);
  } else {
    // Auto-generated fallback based on communication settings
    const enabledMethods: string[] = [];
    if (emailOn) enabledMethods.push("Email");
    if (whatsappOn) enabledMethods.push("WhatsApp");
    if (smsOn) enabledMethods.push("SMS");

    let fallback: string;
    if (enabledMethods.length === 0) {
      fallback = "- No contact methods enabled. Do not ask for any contact info.";
    } else if (enabledMethods.length === 1) {
      const method = enabledMethods[0];
      const askFor = method === "Email" ? "email address" : method === "WhatsApp" ? "WhatsApp number" : "phone number";
      fallback = `- Only ${method} is enabled. Ask ONLY for the customer's ${askFor}. Do not mention other methods.`;
    } else {
      fallback = `- Ask the customer which they prefer: ${enabledMethods.join(" or ")}.\n  - Suggest the primary method (${primary}) first.\n  - Only collect ONE contact value based on their preference.`;
    }
    sections.push(`\n\nLEAD COLLECTION RULES (follow these exactly):\n${fallback}`);
  }

  // 13. Appointment Booking Rules (from AI Brain)
  if (config?.appointmentBookingRules) {
    sections.push(`\n\nAPPOINTMENT BOOKING RULES:\n${config.appointmentBookingRules}`);
  } else {
    sections.push(`\n\nAPPOINTMENT BOOKING RULES:
- You can book appointments by asking for preferred date/time/service
- The business prefers appointments to last 1 hour
- When a customer agrees to a time that's available, respond with exactly:
  [CONFIRM_APPOINTMENT]::date::startTime::endTime::service::customerName::customerPhone::customerEmail
  (use "not provided" for missing fields)
- If the requested time conflicts with existing appointments, suggest alternatives.`);
  }

  // 14. Response Style (from AI Brain)
  if (config?.responseStyle) {
    sections.push(`\n\nRESPONSE STYLE:\n${config.responseStyle}`);
  }

  // 15. Escalation Rules (from AI Brain)
  if (config?.escalationRules) {
    sections.push(`\n\nESCALATION RULES:\n${config.escalationRules}`);
  }

  // 16. Greeting (instruct AI to use the custom greeting on first contact)
  sections.push(`\n\nGREETING: When a customer says "hi", "hello", or starts a new conversation with a simple greeting, respond with exactly: "${config?.greetingMessage || 'Hello! How can I help you today?'}". Then naturally continue the conversation.`);

  // 17. Existing Appointments
  if (upcomingAppts.length > 0) {
    sections.push(`\n\nEXISTING APPOINTMENTS (next 14 days):\n${upcomingAppts
      .map((a) => `  * ${a.date}: ${a.startTime}-${a.endTime} - ${a.service} (${a.customerName})`)
      .join("\n")}`);
  } else {
    sections.push(`\n\nEXISTING APPOINTMENTS: None currently booked in the next 14 days.`);
  }

  // 18. Automation Rules
  if (rules.length > 0) {
    sections.push(`\n\nAUTOMATION RULES ENABLED:\n${rules
      .map((r) => `  - Type: ${r.type}, Channel: ${r.channel}, Template: "${r.messageTemplate.substring(0, 100)}"`)
      .join("\n")}`);
  }

  // 19. Today's date
  sections.push(`\n\nToday's date is: ${today.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  })}`);

  // 20. Lead/Appointment markers - CRITICAL FOR LEAD CAPTURE
  sections.push(`\n\nLEAD CREATION — YOUR MOST IMPORTANT JOB:
You MUST create a lead IMMEDIATELY when you have these three things:
  1. The customer's name
  2. Their phone number OR email address
  3. A general idea of what service they need (even if vague, like "sink problem" or "need a quote")

When you have ALL THREE, you MUST include this exact line in your response:
[CREATE_LEAD]::John Smith::555-1234::john@email.com::sms::Kitchen sink repair

Replace the values with what you actually collected:
  - name: the customer's full name
  - phone: their phone number, or "not provided"
  - email: their email address, or "not provided"
  - preferredMethod: "sms" or "email" or "whatsapp" (based on what they told you)
  - notes: a short description of what they need

Examples of when to create a lead:
  - Customer says "I'm Mike, my phone is 555-0000, I need AC repair" → CREATE LEAD NOW
  - Customer says "Jane here, jane@email.com, can you quote me a new roof?" → CREATE LEAD NOW
  - Customer says "Hi" with no name or service → do NOT create lead yet, ask for their info first

After using the [CREATE_LEAD] marker, continue the conversation naturally. Do NOT say "I created a lead" or mention the marker.`);

  // 21. Core behavior rules
  sections.push(`\n\nYOUR BEHAVIOR:
- Be friendly, helpful, and professional
- ALWAYS introduce yourself as representing "${name}"
- EARLY IN THE CONVERSATION: ask for the customer's name and contact information so you can create a record of their inquiry
- If asked about pricing, use the PRICING GUIDANCE above
- If you don't know something, say so honestly
- If the customer wants to book, guide them through the process using the BOOKING RULES above
- If the customer seems frustrated, follow the ESCALATION RULES above
- Keep responses concise and conversational
- Follow the RESPONSE STYLE above for tone and format`);

  sections.push(`\n\nRESPONSE FORMAT:
Your response should include natural conversation with the customer. Only include the [CONFIRM_APPOINTMENT] or [CREATE_LEAD] markers within your response when appropriate.`);

  const systemPrompt = sections.join("");

  // Log the built prompt so we can verify all sections are present
  console.log(`[buildAiContext] businessId=${businessId} businessName="${name}" promptLength=${systemPrompt.length}`);
  console.log(`[buildAiContext] Sections included:`, 
    sections.map((s) => s.substring(0, 60).replace(/\n/g, " ")).join(" | "));

  return {
    systemPrompt,
    businessName: name,
    greetingMessage: config?.greetingMessage || "Hello! How can I help you today?",
    upcomingAppointments: upcomingAppts.map((a) => ({
      date: a.date,
      startTime: a.startTime,
      endTime: a.endTime,
      service: a.service,
    })),
    enabledAutomationRules: rules.map((r) => ({
      type: r.type,
      channel: r.channel,
      messageTemplate: r.messageTemplate,
    })),
  };
}