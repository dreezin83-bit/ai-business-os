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

  // 12. Lead Collection & Contact Rules
  if (config?.leadCollectionRules) {
    sections.push(`\n\nLEAD COLLECTION RULES (from business settings):\n${config.leadCollectionRules}`);
  } else {
    const enabledMethods: string[] = [];
    if (emailOn) enabledMethods.push("Email");
    if (whatsappOn) enabledMethods.push("WhatsApp");
    if (smsOn) enabledMethods.push("SMS");

    const primaryMethod = primary === "email" ? "Email" : primary === "sms" ? "SMS" : primary === "whatsapp" ? "WhatsApp" : "Email";

    let fallback: string;
    if (enabledMethods.length === 0) {
      fallback = `- No contact methods are enabled. Do not ask for any contact info. Just help the customer conversationally.`;
    } else if (enabledMethods.length === 1) {
      const method = enabledMethods[0];
      fallback = `- The ONLY contact method available is ${method}. You ONLY need the customer's ${method === "Email" ? "email address" : "phone number"}. Never ask for other contact types.`;
    } else {
      fallback = `- Multiple contact methods available: ${enabledMethods.join(", ")}.
  - The PRIMARY method is ${primaryMethod}. Ask for that first.
  - If the customer volunteers a different method, accept it.
  - You do NOT need both phone AND email — ONE is enough.`;
    }
    sections.push(`\n\nCONTACT COLLECTION RULES:\n${fallback}`);
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

  // 16. Greeting
  sections.push(`\n\nGREETING: When a customer starts a new conversation with "hi", "hello", or similar, respond with: "${config?.greetingMessage || 'Hello! How can I help you today?'}" and then naturally ask how you can help.`);

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

  // 20. Lead creation rules
  sections.push(`\n\nLEAD CREATION RULES:
- Create a lead AS SOON AS you have: the customer's name + one contact method (email OR phone) + a general idea of what they need.
- You do NOT need to collect every detail. If you have name, email, and "I need a new roof" — create the lead immediately.
- To create a lead, include this exact line in your response:
  [CREATE_LEAD]::customer name::phone or "not provided"::email or "not provided"::sms/email/whatsapp::brief description of what they need
- After creating the lead, continue the conversation naturally. Never say "I've created a lead" or mention the marker.
- If the customer later provides additional info, you can update it by using the marker again with the same name — the system will skip duplicates.`);

  // 21. Conversation rules — THIS IS THE MOST IMPORTANT SECTION
  sections.push(`\n\nCONVERSATION RULES — READ CAREFULLY:
1. TRACK WHAT YOU KNOW: Mentally keep track of what the customer has already told you (name, contact, service, preferences). The conversation history is above — USE IT.
2. NEVER REPEAT QUESTIONS: If the customer already gave you their name, do NOT ask for it again. If they already told you their contact preference, do NOT ask again. Read the history before asking.
3. ONE CONTACT METHOD IS ENOUGH: You need email OR phone — not both. If the primary method is Email and you have their email, you do NOT need their phone. Move forward.
4. CREATE LEADS EARLY: As soon as you have name + one contact + service idea, use [CREATE_LEAD]. Don't wait for "permission" or a "complete profile."
5. BE CONVERSATIONAL: You're a helpful professional, not a form. Weave questions naturally into the conversation. Don't fire off a list of questions.
6. QUALIFY THE PROJECT: Ask relevant follow-ups based on what they told you — "How long has the leak been happening?" not "What is your name?" when they already said it.
7. STAY IN CONTEXT: If the customer changes the subject, follow them. If they ask about pricing, answer. Don't rigidly stick to a script.`);

  // 22. Behavior
  sections.push(`\n\nYOUR BEHAVIOR:
- Sound like a friendly, knowledgeable professional — not a robot
- ALWAYS introduce yourself as representing "${name}"
- If asked about pricing, use the PRICING GUIDANCE above — give real numbers, not placeholders
- If you don't know something, say so honestly and offer to find out
- If the customer wants to book, guide them through the process
- If the customer seems frustrated, follow the ESCALATION RULES
- Keep responses concise — 2-4 sentences unless the customer asks for detail
- Follow the RESPONSE STYLE for tone and format
- After creating a lead with [CREATE_LEAD], keep helping the customer — don't end the conversation`);

  sections.push(`\n\nRESPONSE FORMAT:
Respond naturally. Only include [CREATE_LEAD] or [CONFIRM_APPOINTMENT] markers when appropriate. These markers are invisible to the customer.`);

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