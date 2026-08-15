import { NextResponse } from "next/server";
import { db } from "@/db";
import { conversation, message, lead, appointment, aiBrainConfig, business } from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { generateId, timeToMinutes, computeDefaultEndTime } from "@/lib/utils";
import { ensureBusiness } from "@/lib/business";
import { buildAiContext } from "@/lib/ai-context";
import { isServicesConfigured } from "@/lib/ai-services";
import { createLlmCompletion } from "@/lib/llm";
import { notifyContractorOfNewLead, sendCustomerConfirmation, notifyContractorOfNewAppointment, sendCustomerAppointmentConfirmation } from "@/lib/notifications";
import { extractLeadFromConversation, isValidLead } from "@/lib/lead-extractor";
import {
  createHandoff,
  parseEscalateMarker,
  cleanEscalateMarker,
  buildConversationSummary,
} from "@/lib/escalation";

/** Parse onboarding markers that the AI uses to save business info */
function parseOnboardingMarkers(text: string): Record<string, string> {
  const saved: Record<string, string> = {};
  const markers = [
    "SAVE_BUSINESS_NAME", "SAVE_SERVICES", "SAVE_BUSINESS_HOURS",
    "SAVE_SERVICE_AREAS", "SAVE_PRICING", "SAVE_POLICIES", "SAVE_FAQS",
    "SAVE_BUSINESS_INFO", "SAVE_RESPONSE_STYLE", "SAVE_LEAD_RULES", "SAVE_BOOKING_RULES",
  ];
  for (const marker of markers) {
    const regex = new RegExp(`\\[${marker}\\]::([\\s\\S]*?)(?=\\[\\/|$)`, "i");
    const match = text.match(regex);
    if (match) saved[marker] = match[1].trim();
  }
  return saved;
}

/** Parse [CONFIRM_APPOINTMENT] marker with flexible field matching.
 *  Supports partial markers (missing optional fields like email/phone/endTime).
 *  Returns null only if date+startTime+service+customerName are all missing. */
function parseAppointmentMarker(text: string) {
  // Match the marker with optional trailing fields (email and phone may be absent)
  const match = text.match(/\[CONFIRM_APPOINTMENT\]::([^:\n]*?)::([^:\n]*?)::([^:\n]*?)::([^:\n]*?)::([^:\n]*?)(?:::([^:\n]*?))?(?:::([^:\n]*?))?(?=\s*(?:$|\[|\n))/);
  if (!match) return null;

  const date = match[1]?.trim() || "";
  const startTime = match[2]?.trim() || "";
  const endTime = match[3]?.trim() || "";
  const service = match[4]?.trim() || "";
  const customerName = match[5]?.trim() || "";
  const customerPhone = match[6]?.trim() || "";
  const customerEmail = match[7]?.trim() || "";

  // Require at minimum: date + startTime + service + customerName
  if (!date || date === "not provided" || !startTime || !service || !customerName) {
    return null;
  }

  // Auto-compute endTime if missing (default 1 hour)
  let finalEndTime = endTime;
  if (!finalEndTime || finalEndTime === "not provided") {
    finalEndTime = computeDefaultEndTime(startTime);
  }

  return { date, startTime, endTime: finalEndTime, service, customerName, customerPhone, customerEmail };
}

function parseLeadMarker(text: string) {
  const match = text.match(/\[CREATE_LEAD\]::([^:]+)::([^:]+)::([^:]+)::([^:]+)::([^:\n]+)/);
  if (!match) return null;
  return { name: match[1].trim(), phone: match[2].trim(), email: match[3].trim(), preferredMethod: match[4].trim(), notes: match[5].trim() };
}

function cleanResponse(text: string): string {
  return text
    .replace(/\[CONFIRM_APPOINTMENT\]::[^\n]*/g, "")
    .replace(/\[CREATE_LEAD\]::[^\n]*/g, "")
    .replace(/\[SAVE_\w+\]::[\s\S]*?\[\/]/g, "")
    .trim();
}

async function checkAppointmentConflict(businessId: string, date: string, startTime: string, endTime: string): Promise<string[]> {
  const startMins = timeToMinutes(startTime);
  const endMins = timeToMinutes(endTime);
  if (startMins < 0 || endMins < 0) return []; // can't parse times — allow booking

  // Query directly for overlapping appointments — database-level filtering
  const overlapping = await db
    .select({ startTime: appointment.startTime, endTime: appointment.endTime, customerName: appointment.customerName, service: appointment.service })
    .from(appointment)
    .where(
      and(
        eq(appointment.businessId, businessId),
        eq(appointment.date, date),
        eq(appointment.status, "scheduled"),
      )
    );
  // Return list of conflicting time slots (stringified)
  return overlapping
    .filter((a) => {
      const aStart = timeToMinutes(a.startTime);
      const aEnd = timeToMinutes(a.endTime);
      if (aStart < 0 || aEnd < 0) return false; // skip unparseable entries
      return startMins < aEnd && endMins > aStart;
    })
    .map((a) => `${a.startTime}-${a.endTime} (${a.service})`);
}

/** Save onboarding data from AI markers into the database */
async function saveOnboardingData(businessId: string, markers: Record<string, string>) {
  const updates: Record<string, any> = {};

  if (markers["SAVE_BUSINESS_NAME"]) {
    await db.update(business).set({ name: markers["SAVE_BUSINESS_NAME"] }).where(eq(business.id, businessId));
  }
  if (markers["SAVE_SERVICES"]) {
    updates.services = JSON.stringify(markers["SAVE_SERVICES"].split(",").map((s: string) => s.trim()).filter(Boolean));
  }
  if (markers["SAVE_BUSINESS_HOURS"]) {
    try { JSON.parse(markers["SAVE_BUSINESS_HOURS"]); updates.businessHours = markers["SAVE_BUSINESS_HOURS"]; } catch {}
  }
  if (markers["SAVE_SERVICE_AREAS"]) {
    updates.serviceAreas = JSON.stringify(markers["SAVE_SERVICE_AREAS"].split(",").map((s: string) => s.trim()).filter(Boolean));
  }
  if (markers["SAVE_PRICING"]) updates.pricingGuidance = markers["SAVE_PRICING"];
  if (markers["SAVE_POLICIES"]) updates.companyPolicies = markers["SAVE_POLICIES"];
  if (markers["SAVE_FAQS"]) {
    updates.faqs = JSON.stringify(markers["SAVE_FAQS"].split("\n").map((s: string) => s.trim()).filter(Boolean));
  }
  if (markers["SAVE_BUSINESS_INFO"]) updates.businessInfo = markers["SAVE_BUSINESS_INFO"];
  if (markers["SAVE_RESPONSE_STYLE"]) updates.responseStyle = markers["SAVE_RESPONSE_STYLE"];
  if (markers["SAVE_LEAD_RULES"]) updates.leadCollectionRules = markers["SAVE_LEAD_RULES"];
  if (markers["SAVE_BOOKING_RULES"]) updates.appointmentBookingRules = markers["SAVE_BOOKING_RULES"];

  if (Object.keys(updates).length > 0) {
    const [existing] = await db.select({ id: aiBrainConfig.id }).from(aiBrainConfig).where(eq(aiBrainConfig.businessId, businessId));
    if (existing) {
      await db.update(aiBrainConfig).set(updates).where(eq(aiBrainConfig.businessId, businessId));
    } else {
      await db.insert(aiBrainConfig).values({ id: generateId(), businessId, ...updates, greetingMessage: "Hello! How can I help you today?" });
    }
  }
}

/** Check if business has essential info configured (services set). */
function isConfigured(config: any): boolean {
  // Accepts JSON arrays (any non-empty item) and non-empty plain text so a
  // partially-configured business isn't stuck in onboarding mode forever.
  // Truly empty businesses still get setup help. See src/lib/ai-services.ts.
  return isServicesConfigured(config?.services);
}

export async function POST(request: Request) {
  try {
    const businessId = await ensureBusiness();
    if (!businessId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { message: userMessage, conversationId, source } = body;

    if (!userMessage) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    // Always create/save conversation first to avoid FK errors
    let convId = conversationId;
    if (convId) {
      const [existingConv] = await db.select({ id: conversation.id }).from(conversation).where(eq(conversation.id, convId)).limit(1);
      if (!existingConv) convId = generateId();
    }
    if (!convId) {
      convId = generateId();
      await db.insert(conversation).values({
        id: convId, businessId,
        source: source || "dashboard",
        status: "active",
      });
    }

    // Save user message
    await db.insert(message).values({
      id: generateId(), conversationId: convId, role: "user", content: userMessage,
    });

    // Load config
    const [config, bizRow] = await Promise.all([
      db.select({
        services: aiBrainConfig.services,
        businessInfo: aiBrainConfig.businessInfo,
        businessHours: aiBrainConfig.businessHours,
        serviceAreas: aiBrainConfig.serviceAreas,
        pricingGuidance: aiBrainConfig.pricingGuidance,
        companyPolicies: aiBrainConfig.companyPolicies,
        faqs: aiBrainConfig.faqs,
        responseStyle: aiBrainConfig.responseStyle,
        leadCollectionRules: aiBrainConfig.leadCollectionRules,
        appointmentBookingRules: aiBrainConfig.appointmentBookingRules,
      }).from(aiBrainConfig).where(eq(aiBrainConfig.businessId, businessId)),
      db.select({ name: business.name }).from(business).where(eq(business.id, businessId)).limit(1),
    ]);
    const configured = isConfigured(config);
    const bizName = bizRow?.[0]?.name || "not set";

    // Determine if this is a contractor (dashboard/ai-brain test) or customer (public widget)
    const isContractor = source === "dashboard" || source === "ai-test" || !source;

    // ─── ONBOARDING MODE: Contractor needs setup help ───
    if (!configured && isContractor) {
      const onboardingPrompt = `You are an AI setup assistant for a new contractor. Your ONLY job right now is to help them configure their business. You are NOT talking to a customer.

CURRENT STATE:
- Business Name: ${bizName}
- Services: not set
- Other info: not set

WHAT YOU NEED TO COLLECT (one at a time, in order):
1. Business name
2. Services offered (comma-separated list)
3. Business hours
4. Service areas
5. Pricing guidance
6. Company policies
7. Any FAQs

RULES:
- Ask ONE question at a time. Never ask multiple questions.
- After they answer, save it using markers and move to the next question.
- Keep it conversational and encouraging. They're setting up their business.
- Once ALL info is collected, tell them they're ready and say "Your AI is now fully configured! Customers can now reach you."

HOW TO SAVE (use these markers):
- Business name: [SAVE_BUSINESS_NAME]::Their Business Name[/]
- Services: [SAVE_SERVICES]::HVAC Installation, AC Repair, Furnace Service[/]
- Hours: [SAVE_BUSINESS_HOURS]::[{"day":"Monday","open":"8:00 AM","close":"5:00 PM","closed":false}][/]
- Areas: [SAVE_SERVICE_AREAS]::Downtown, North Side, East County[/]
- Pricing: [SAVE_PRICING]::Standard AC install starts at $3,500. Emergency repairs $150/hr.[/]
- Policies: [SAVE_POLICIES]::24-hour cancellation policy. Free estimates within service area.[/]
- FAQs: [SAVE_FAQS]::Q: Do you offer warranties? A: Yes, 1-year parts and labor.[/]
- Business info: [SAVE_BUSINESS_INFO]::Family-owned since 2005. Licensed and insured.[/]

Always use the markers to save their answers immediately. The system will update their profile automatically.

Start by asking: "Great, let's get your business set up! First, what's your business name?"`;

      const { completion } = await createLlmCompletion([
        { role: "system", content: onboardingPrompt },
        { role: "user", content: userMessage },
      ]);

      const reply = completion?.content || "I'm having trouble right now. Please try again.";

      // Process any save markers
      const onboardingMarkers = parseOnboardingMarkers(reply);
      if (Object.keys(onboardingMarkers).length > 0) {
        await saveOnboardingData(businessId, onboardingMarkers);
      }

      const cleanReply = cleanResponse(reply);

      await db.insert(message).values({
        id: generateId(), conversationId: convId, role: "assistant", content: cleanReply,
      });

      return NextResponse.json({ response: cleanReply, conversationId: convId, onboarding: true });
    }

    // ─── PUBLIC/CUSTOMER MODE: Business not configured ───
    if (!configured && !isContractor) {
      const reply = "We're currently setting up our systems. Please check back soon or call us directly for immediate assistance. Thank you for your patience!";
      await db.insert(message).values({
        id: generateId(), conversationId: convId, role: "assistant", content: reply,
      });
      return NextResponse.json({ response: reply, conversationId: convId });
    }

    // ─── NORMAL MODE: Fully configured, talking to customer (or contractor testing) ───
    const ctx = await buildAiContext(businessId);

    // Get conversation history
    const msgs = await db.select().from(message).where(eq(message.conversationId, convId)).orderBy(desc(message.createdAt));
    const history = msgs.reverse().map((m) => ({ role: m.role as "user" | "assistant" | "system", content: m.content }));

    // If contractor is testing, add a note to the system prompt
    let systemPrompt = ctx.systemPrompt;
    if (isContractor) {
      systemPrompt = `NOTE: You are currently in TEST MODE — the contractor is testing you from their dashboard, NOT a real customer. Respond naturally as you would to a customer so they can see how you'll perform. Treat this test conversation as if a customer is reaching out. Do NOT mention that this is a test or ask if they're a contractor.\n\n${systemPrompt}`;
    }

    const { completion, error: llmError } = await createLlmCompletion([
      { role: "system", content: systemPrompt },
      ...history,
    ]);
    if (!completion) {
      return NextResponse.json({ error: "AI not configured", detail: llmError || "Missing API key" }, { status: 503 });
    }

    let reply = completion.content;
    let createdAppointmentId: string | null = null;
    let createdLeadId: string | null = null;

    // Process appointment marker
    const apptData = parseAppointmentMarker(reply);
    if (apptData && apptData.date !== "not provided") {
      const conflicts = await checkAppointmentConflict(businessId, apptData.date, apptData.startTime, apptData.endTime);
      if (conflicts.length === 0) {
        // ─── NO CONFLICT: Save the appointment ───
        const apptId = generateId();
        await db.insert(appointment).values({
          id: apptId, businessId, customerName: apptData.customerName || "Not provided",
          customerPhone: apptData.customerPhone || "", customerEmail: apptData.customerEmail || "",
          service: apptData.service, date: apptData.date, startTime: apptData.startTime,
          endTime: apptData.endTime, status: "scheduled",
        });
        createdAppointmentId = apptId;

        // ─── NOTIFY CONTRACTOR + SEND CUSTOMER CONFIRMATION ───
        Promise.all([
          notifyContractorOfNewAppointment(businessId, apptId),
          sendCustomerAppointmentConfirmation(businessId, apptId),
        ]).catch((err) => console.error("[chat] Appointment notification error:", err));
      } else {
        // ─── CONFLICT DETECTED: Override AI reply with polite decline + alternatives ───
        const conflictSlots = conflicts.join(", ");
        reply = `I'm sorry, but ${apptData.startTime}${apptData.endTime ? ` - ${apptData.endTime}` : ""} on ${apptData.date} is no longer available (conflicting with: ${conflictSlots}). Would another time work for you? I can help you find the next available slot. What day works best?`;
        createdAppointmentId = null; // Ensure caller knows no appointment was created
      }
    }

    // Process lead marker
    const leadData = parseLeadMarker(reply);
    if (leadData && isValidLead({ name: leadData.name, phone: leadData.phone, email: leadData.email, preferredMethod: leadData.preferredMethod, serviceRequest: leadData.notes })) {
      const [existing] = await db.select().from(lead).where(and(eq(lead.businessId, businessId), eq(lead.name, leadData.name))).limit(1);
      if (!existing) {
        const leadId = generateId();
        await db.insert(lead).values({
          id: leadId, businessId, name: leadData.name, phone: leadData.phone || "", email: leadData.email || "",
          preferredMethod: leadData.preferredMethod || "", contactValue: leadData.preferredMethod === "phone" ? leadData.phone : leadData.email,
          serviceRequest: leadData.notes || "", source: "ai_chat", status: "new",
        });
        createdLeadId = leadId;
        await db.update(conversation).set({ leadId }).where(eq(conversation.id, convId));
        const summary = history.slice(-4).map((m: any) => `${m.role}: ${m.content.substring(0, 100)}`).join(" | ");
        Promise.all([notifyContractorOfNewLead(businessId, leadId, summary), sendCustomerConfirmation(businessId, leadId)]).catch(() => {});
      }
    }

    // Server-side lead extraction fallback
    if (!createdLeadId) {
      try {
        const extracted = await extractLeadFromConversation([...history, { role: "assistant", content: reply }]);
        if (extracted && isValidLead(extracted)) {
          const [existing] = await db.select().from(lead).where(and(eq(lead.businessId, businessId), eq(lead.name, extracted.name!))).limit(1);
          if (!existing) {
            const newLeadId = generateId();
            await db.insert(lead).values({
              id: newLeadId, businessId, name: extracted.name!, phone: extracted.phone || "", email: extracted.email || "",
              preferredMethod: extracted.preferredMethod || "", contactValue: extracted.preferredMethod === "phone" ? extracted.phone : extracted.email,
              serviceRequest: extracted.serviceRequest || "", source: "ai_chat", status: "new",
            });
            createdLeadId = newLeadId;
            await db.update(conversation).set({ leadId: newLeadId }).where(eq(conversation.id, convId));
            const summary = history.slice(-4).map((m: any) => `${m.role}: ${m.content.substring(0, 100)}`).join(" | ");
            try {
              await Promise.all([notifyContractorOfNewLead(businessId, newLeadId, summary), sendCustomerConfirmation(businessId, newLeadId)]);
            } catch {}
          }
        }
      } catch {}
    }

    const cleanReply = cleanEscalateMarker(cleanResponse(reply));
    await db.insert(message).values({ id: generateId(), conversationId: convId, role: "assistant", content: cleanReply });

    // ─── HUMAN HANDOFF: [ESCALATE] marker → create escalation inbox item ───
    const escalateData = parseEscalateMarker(reply);
    if (escalateData) {
      const summary = escalateData.summary || buildConversationSummary(history);
      await createHandoff({
        businessId,
        conversationId: convId,
        leadId: createdLeadId,
        customerName: "",
        customerPhone: "",
        customerEmail: "",
        reason: escalateData.reason,
        summary,
      });
    }

    return NextResponse.json({
      response: cleanReply,
      conversationId: convId,
      appointmentId: createdAppointmentId,
      leadId: createdLeadId,
      escalated: !!escalateData,
    });
  } catch (error: any) {
    console.error("AI chat error:", error?.message);
    return NextResponse.json({ error: "Failed to process chat", detail: error?.message }, { status: 500 });
  }
}
