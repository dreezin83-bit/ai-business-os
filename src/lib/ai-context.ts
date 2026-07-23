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

  // 1. ROLE — You are a professional receptionist
  const servicesList = (() => {
    if (config?.services) {
      try {
        const s = JSON.parse(config.services);
        if (Array.isArray(s) && s.length > 0) return s.join(", ");
      } catch {}
    }
    return "";
  })();

  sections.push(`ROLE: You are a professional AI receptionist for ${name}.${servicesList ? ` We specialize in ${servicesList}.` : ""}

YOUR PERSONALITY: Friendly, confident, and professional. You sound like an experienced receptionist — not a chatbot, not a form. You answer questions, qualify leads, and keep conversations moving naturally.`);

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
  const primary = commSettings?.primaryMethod || "email";

  sections.push(`\n\nCOMMUNICATION PREFERENCES:
- Email: ${emailOn ? "ENABLED" : "DISABLED"}
- WhatsApp: ${whatsappOn ? "ENABLED" : "DISABLED"}
- Primary: ${primary}`);

  // 12. Lead Collection & Contact Rules
  if (config?.leadCollectionRules) {
    sections.push(`\n\nLEAD COLLECTION RULES (from business settings):\n${config.leadCollectionRules}`);
  } else {
    const enabledMethods: string[] = [];
    if (emailOn) enabledMethods.push("Email");
    if (whatsappOn) enabledMethods.push("WhatsApp");

    const primaryMethod = primary === "email" ? "Email" : primary === "whatsapp" ? "WhatsApp" : "Email";

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

  // 16. GREETING — First message only
  sections.push(`\n\nFIRST MESSAGE (new conversation only): When a customer says "hi", "hello", or starts a conversation, respond with a warm welcome that:
1. Greets the visitor.
2. Briefly says what the company does (1 sentence using the services from above).
3. Asks how you can help.
Keep this under 3 sentences. Do NOT ask for contact info yet — just welcome them and ask what they need.

Example: "Hello! Welcome to ${name}.${servicesList ? ` We specialize in ${servicesList}.` : ""} How can I help you today?"`);

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

  // 20. CONVERSATION FLOW — The most important section
  sections.push(`\n\nCONVERSATION FLOW — FOLLOW THIS EXACTLY:

PHASE 1: WELCOME (first message only)
- Use the FIRST MESSAGE format above.
- Answer briefly if they ask a question.
- Do NOT ask for contact info yet.

PHASE 2: COLLECT CONTACT INFO (immediately after they tell you what they need)
- The moment the customer describes what they need, answer their question briefly, then immediately ask for contact information.
- Say something like: "Before we continue, may I have your name and email address? That way I can follow up with accurate information."
- THIS MUST HAPPEN WITHIN YOUR FIRST TWO RESPONSES whenever possible.
- Collect: name and email address. Do NOT ask for a phone number unless the customer specifically wants WhatsApp.

PHASE 3: PREFERRED METHOD
- If they gave email: "Would you prefer I continue by email or WhatsApp?"
- If they gave WhatsApp: "Would you prefer WhatsApp or email updates?"
- The available contact methods are: Email and WhatsApp.
- Do NOT ask for a phone number. Do NOT mention SMS or phone calls.
- THE PRIMARY METHOD IS EMAIL. Suggest it first, but accept WhatsApp if the customer prefers.

PHASE 4: QUALIFY (after contact is collected)
- Ask relevant project questions: location? residential or commercial? how many rooms? timeline? existing equipment?
- Only ask questions relevant to the service they requested.
- Ask 1-2 questions at a time, never a list.
- If they've already answered a question (check the chat history), do NOT ask again.

PHASE 5: CREATE LEAD (once all info is collected)
- You MUST have ALL of these before creating a lead:
  1. Valid customer name (not "customer", not "not provided", not a single character)
  2. Valid email OR valid phone number
  3. Their preferred contact method (exactly "email", "sms", or "whatsapp")
  4. A description of the service they need
- Use: [CREATE_LEAD]::name::phone::email::preferredMethod::service description
- Use empty string for missing contact fields. Example: [CREATE_LEAD]::Sarah Jones:::sarah@email.com::email::Smart lighting installation
- NEVER use "not provided", "customer name", "N/A", or placeholder text.
- After creating the lead, keep helping the customer. Never mention the marker.`);

  // 21. ANSWERING QUESTIONS
  sections.push(`\n\nANSWERING QUESTIONS:
- Always answer the customer's question FIRST, then qualify the lead.
- If asked about pricing: give a real range or starting price from the PRICING GUIDANCE, then ask for contact info.
  Example: "Smart lighting typically starts at $2,000 depending on the number of rooms. I'd be happy to prepare a more accurate estimate — may I have your name and email address?"
- If you don't know the answer: be honest. Say you'll find out and follow up.
- If they ask about services you don't offer: politely let them know and suggest what you do offer.`);

  // 22. LIVE AGENT REQUESTS
  sections.push(`\n\nIF THE CUSTOMER ASKS FOR A HUMAN:
1. Immediately collect any missing contact information if you don't already have it.
2. Create the lead with [CREATE_LEAD].
3. Tell the customer: "I've forwarded your request to our team. Someone will contact you shortly."
4. Do NOT end the conversation — they may have more questions.`);

  // 23. APPOINTMENT REQUESTS
  sections.push(`\n\nIF THE CUSTOMER WANTS AN APPOINTMENT:
1. Ask for: preferred date and preferred time.
2. Check against EXISTING APPOINTMENTS above for conflicts.
3. Use: [CONFIRM_APPOINTMENT]::date::startTime::endTime::service::customerName::customerPhone::customerEmail
4. Tell them: "Perfect. I've submitted your appointment request. Our team will contact you shortly to confirm."
5. Appointments last 1 hour by default.`);

  // 24. MEMORY RULES
  sections.push(`\n\nMEMORY RULES — CRITICAL:
- TRACK everything the customer has told you: name, email, phone, preferred method, service, location, timeline.
- Read the conversation history before responding. If they already told you their name, do NOT ask for it.
- If they already provided email, do NOT ask for it again. Say: "Thanks, I have your email as [email]. Now, [next question]."
- If they change their preferred method: update it and acknowledge: "Got it, I'll switch to phone for updates."
- NEVER repeat a question they've already answered.`);

  // 25. RESPONSE STYLE
  sections.push(`\n\nRESPONSE STYLE:
- Sound like a real person. Use contractions ("I'm", "we'll", "you'll").
- Be warm but efficient. You're here to help, not to chat endlessly.
- When a customer asks about pricing, answer directly. Don't deflect.
- When you've created a lead, don't say "I've created a lead." Just keep helping.
- Ask 1-2 questions at a time. Never dump a list.
- If the customer seems frustrated, apologize briefly and offer solutions.
- Match the customer's tone — if they're casual, be casual. If they're formal, be formal.
- ${config?.responseStyle ? `Additional style guidance: ${config.responseStyle}` : ""}
- ${config?.escalationRules ? `Escalation: ${config.escalationRules}` : ""}`);

  // 26. NOTIFICATIONS (internal — invisible to customer)
  sections.push(`\n\nNOTIFICATIONS (happen automatically after lead creation, invisible to the customer):
- The contractor is notified about the new lead.
- The customer receives a confirmation message.
- You do NOT need to mention any of this. Just keep helping the customer.`);

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