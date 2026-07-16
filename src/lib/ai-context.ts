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

/**
 * Load ALL contractor data for a business and build a comprehensive AI context + system prompt.
 * Returns structured data + the fully built system prompt string.
 * Gracefully handles missing/null/empty sections.
 */
export async function buildAiContext(businessId: string): Promise<AiContext> {
  // Load all relevant data in parallel
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
  const futureStr = fourteenDaysLater.toISOString().split("T")[0];

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

  // --- Build sections ---

  const systemInstruction = config?.systemPrompt || "You are a helpful assistant for a service business.";

  // Business Profile
  const name = biz?.name || "the business";
  const phone = biz?.phone || "Not provided";
  const email = biz?.email || "Not provided";
  const website = biz?.website || "Not provided";
  const address = biz?.address || "Not provided";

  const businessProfile = `BUSINESS PROFILE:
Name: ${name}
Phone: ${phone}
Email: ${email}
Website: ${website}
Address: ${address}`;

  // About
  const aboutSection = config?.businessInfo ? `\n\nABOUT THE BUSINESS:\n${config.businessInfo}` : "";

  // Services
  let servicesSection = "";
  const servicesRaw = config?.services;
  let services: string[] = [];
  if (servicesRaw) {
    try {
      services = JSON.parse(servicesRaw as string);
    } catch {}
  }
  if (services.length > 0) {
    servicesSection = `\n\nSERVICES OFFERED:\n${services.map((s: string) => `- ${s}`).join("\n")}`;
  }

  // Business Hours
  let hoursSection = "";
  const hoursRaw = config?.businessHours;
  let hours: Record<string, string> = {};
  if (hoursRaw) {
    try {
      hours = JSON.parse(hoursRaw as string);
    } catch {}
  }
  if (Object.keys(hours).length > 0) {
    hoursSection = `\n\nBUSINESS HOURS:\n${Object.entries(hours)
      .map(([day, h]) => `${day}: ${h}`)
      .join("\n")}`;
  }

  // Service Areas
  let areasSection = "";
  const areasRaw = config?.serviceAreas;
  let areas: string[] = [];
  if (areasRaw) {
    try {
      areas = JSON.parse(areasRaw as string);
    } catch {}
  }
  if (areas.length > 0) {
    areasSection = `\n\nSERVICE AREAS:\n${areas.join(", ")}`;
  }

  // FAQs
  let faqsSection = "";
  const faqsRaw = config?.faqs;
  let faqs: string[] = [];
  if (faqsRaw) {
    try {
      faqs = JSON.parse(faqsRaw as string);
    } catch {}
  }
  if (faqs.length > 0) {
    faqsSection = `\n\nFAQs:\n${faqs.map((f: string) => `- ${f}`).join("\n")}`;
  }

  // Pricing
  const pricingSection = config?.pricingGuidance
    ? `\n\nPRICING GUIDANCE:\n${config.pricingGuidance}`
    : "";

  // Policies
  const policiesSection = config?.companyPolicies
    ? `\n\nCOMPANY POLICIES:\n${config.companyPolicies}`
    : "";

  // Knowledge Base
  let knowledgeSection = "";
  const knowledgeText = docs
    .map((d) => d.content)
    .filter(Boolean)
    .join("\n\n")
    .substring(0, 5000);
  if (knowledgeText) {
    knowledgeSection = `\n\nKNOWLEDGE BASE:\n${knowledgeText}`;
  }

  // Communication Preferences
  const emailOn = commSettings?.emailEnabled !== false;
  const whatsappOn = commSettings?.whatsappEnabled === true;
  const smsOn = commSettings?.smsEnabled !== false;
  const primary = commSettings?.primaryMethod || "email";

  const commSection = `\n\nCOMMUNICATION PREFERENCES:\n- Email: ${emailOn ? "ENABLED" : "DISABLED"}\n- WhatsApp: ${whatsappOn ? "ENABLED" : "DISABLED"}\n- SMS: ${smsOn ? "ENABLED" : "DISABLED"}\n- Primary: ${primary}`;

  // Contact Collection Rules
  const enabledMethods: string[] = [];
  if (emailOn) enabledMethods.push("Email");
  if (whatsappOn) enabledMethods.push("WhatsApp");
  if (smsOn) enabledMethods.push("SMS");

  let contactRulesSection: string;
  if (enabledMethods.length === 0) {
    contactRulesSection = "- No contact methods enabled. Do not ask for any contact info.";
  } else if (enabledMethods.length === 1) {
    const method = enabledMethods[0];
    const askFor = method === "Email" ? "email address" : method === "WhatsApp" ? "WhatsApp number" : "phone number";
    contactRulesSection = `- Only ${method} is enabled. Ask ONLY for the customer's ${askFor}. Do not mention other methods.`;
  } else {
    contactRulesSection = `- Ask the customer which they prefer: ${enabledMethods.join(" or ")}.
  - Suggest the primary method (${primary}) first.
  - Only collect ONE contact value based on their preference.`;
  }

  // Appointments for availability
  let appointmentsSection = "";
  if (upcomingAppts.length > 0) {
    appointmentsSection = `\n\nEXISTING APPOINTMENTS (next 14 days):\n${upcomingAppts
      .map(
        (a) =>
          `  * ${a.date}: ${a.startTime}-${a.endTime} - ${a.service} (${a.customerName})`
      )
      .join("\n")}`;
  } else {
    appointmentsSection = `\n\nEXISTING APPOINTMENTS: None currently booked in the next 14 days.`;
  }

  // Automation rules
  let automationSection = "";
  if (rules.length > 0) {
    automationSection = `\n\nAUTOMATION RULES ENABLED:\n${rules
      .map(
        (r) =>
          `  - Type: ${r.type}, Channel: ${r.channel}, Template: "${r.messageTemplate.substring(0, 100)}"`
      )
      .join("\n")}`;
  }

  // Today's date
  const dateSection = `\n\nToday's date is: ${today.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  })}`;

  // Build the final system prompt
  const systemPrompt = [
    `SYSTEM INSTRUCTION: ${systemInstruction}`,
    businessProfile,
    aboutSection,
    servicesSection,
    hoursSection,
    areasSection,
    faqsSection,
    pricingSection,
    policiesSection,
    knowledgeSection,
    commSection,
    `\nCONTACT COLLECTION RULES (follow these exactly):`,
    contactRulesSection,
    appointmentsSection,
    automationSection,
    dateSection,
    `\nAPPOINTMENT BOOKING RULES:
- You can book appointments by asking for preferred date/time/service
- The business prefers appointments to last 1 hour
- When a customer agrees to a time that's available, respond with exactly:
  [CONFIRM_APPOINTMENT]::date::startTime::endTime::service::customerName::customerPhone::customerEmail
  (use "not provided" for missing fields)
- If the requested time conflicts with existing appointments, suggest alternatives.`,
    `\nLEAD COLLECTION RULES:
- When you get customer name and at least one contact method, respond with:
  [CREATE_LEAD]::name::phone::email::preferredMethod::notes`,
    `\nYOUR BEHAVIOR:
- Be friendly, helpful, and professional
- If asked about pricing, use the PRICING GUIDANCE above
- If you don't know something, say so honestly
- If the customer wants to book, guide them through the process
- If the customer seems frustrated, suggest escalating to a human
- Keep responses concise and conversational
- Always introduce yourself as representing ${name}`,
    `\nRESPONSE FORMAT:
Your response should include natural conversation with the customer. Only include the [CONFIRM_APPOINTMENT] or [CREATE_LEAD] markers within your response when appropriate.`,
  ]
    .filter(Boolean)
    .join("");

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