import { NextResponse } from "next/server";
import { db } from "@/db";
import { business, lead, conversation, message, appointment, aiBrainConfig } from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { generateId } from "@/lib/utils";
import { buildAiContext } from "@/lib/ai-context";
import { createLlmCompletion } from "@/lib/llm";
import { notifyContractorOfNewLead, sendCustomerConfirmation } from "@/lib/notifications";
import { extractLeadFromConversation, isValidLead } from "@/lib/lead-extractor";

/** Parse [CONFIRM_APPOINTMENT]::date::startTime::endTime::service::name::phone::email */
function parseAppointmentMarker(text: string): {
  date: string;
  startTime: string;
  endTime: string;
  service: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
} | null {
  const match = text.match(/\[CONFIRM_APPOINTMENT\]::([^:]+)::([^:]+)::([^:]+)::([^:]+)::([^:]+)::([^:]+)::([^:\n]+)/);
  if (!match) return null;
  return {
    date: match[1].trim(),
    startTime: match[2].trim(),
    endTime: match[3].trim(),
    service: match[4].trim(),
    customerName: match[5].trim(),
    customerPhone: match[6].trim(),
    customerEmail: match[7].trim(),
  };
}

/** Parse [CREATE_LEAD]::name::phone::email::preferredMethod::notes */
function parseLeadMarker(text: string): {
  name: string;
  phone: string;
  email: string;
  preferredMethod: string;
  notes: string;
} | null {
  const match = text.match(/\[CREATE_LEAD\]::([^:]+)::([^:]+)::([^:]+)::([^:]+)::([^:\n]+)/);
  if (!match) return null;
  return {
    name: match[1].trim(),
    phone: match[2].trim(),
    email: match[3].trim(),
    preferredMethod: match[4].trim(),
    notes: match[5].trim(),
  };
}

/** Check appointment conflict */
async function checkAppointmentConflict(
  businessId: string,
  date: string,
  startTime: string,
  endTime: string
): Promise<boolean> {
  const existing = await db
    .select()
    .from(appointment)
    .where(
      and(
        eq(appointment.businessId, businessId),
        eq(appointment.date, date),
        eq(appointment.status, "scheduled")
      )
    );
  return existing.some((a) => startTime < a.endTime && endTime > a.startTime);
}

/** Remove action markers for clean display */
function cleanResponse(text: string): string {
  return text
    .replace(/\[CONFIRM_APPOINTMENT\]::[^\n]*/g, "")
    .replace(/\[CREATE_LEAD\]::[^\n]*/g, "")
    .trim();
}

/** Wrap a response with CORS headers for cross-origin widget access */
function corsResponse(body: any, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Access-Control-Allow-Origin": "*" },
  });
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Max-Age": "86400",
    },
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { businessId, message: userMessage, conversationId, customerName, customerPhone, customerEmail } = body;

    if (!businessId || !userMessage) {
      return corsResponse({ error: "businessId and message are required" }, 400);
    }

    // Verify business exists
    const [biz] = await db.select().from(business).where(eq(business.id, businessId));
    if (!biz) {
      return corsResponse({ error: "Business not found" }, 404);
    }

    // Block AI until business has configured their AI Brain
    const [brainConfig] = await db.select().from(aiBrainConfig).where(eq(aiBrainConfig.businessId, businessId));
    if (!brainConfig || brainConfig.services === "[]") {
      return corsResponse({
        response: "This business hasn't finished setting up their AI assistant yet. Please check back soon!",
      });
    }

    // Build AI context using the shared engine
    const ctx = await buildAiContext(businessId);

    // Get or create conversation
    let convId = conversationId;
    if (!convId) {
      convId = generateId();
      await db.insert(conversation).values({
        id: convId,
        businessId,
        customerName: customerName || "",
        customerPhone: customerPhone || "",
        customerEmail: customerEmail || "",
        source: "chatbot",
        status: "active",
      });

      // Create a lead if we have customer info
      if (customerName && customerPhone) {
        const [existingLead] = await db
          .select()
          .from(lead)
          .where(eq(lead.phone, customerPhone))
          .limit(1);

        if (!existingLead) {
          const newLeadId = generateId();
          await db.insert(lead).values({
            id: newLeadId,
            businessId,
            name: customerName,
            phone: customerPhone,
            email: customerEmail || "",
            serviceRequest: userMessage.substring(0, 200),
            source: "chatbot",
            status: "new",
          });
          await db.update(conversation).set({ leadId: newLeadId }).where(eq(conversation.id, convId));
        } else {
          await db.update(conversation).set({ leadId: existingLead.id }).where(eq(conversation.id, convId));
        }
      }
    }

    // Save user message
    await db.insert(message).values({
      id: generateId(),
      conversationId: convId,
      role: "user",
      content: userMessage,
    });

    // Get conversation history
    const messages = await db
      .select()
      .from(message)
      .where(eq(message.conversationId, convId))
      .orderBy(desc(message.createdAt));

    const history = messages.reverse().map((m) => ({
      role: m.role as "user" | "assistant" | "system",
      content: m.content,
    }));

    // Call LLM (supports OpenAI, OpenAI-compatible, and Gemini)
    const { completion, error: llmError } = await createLlmCompletion([
      { role: "system", content: ctx.systemPrompt },
      ...history,
    ]);
    if (!completion) {
      return corsResponse({
        response: ctx.greetingMessage || "I'm sorry, I'm having trouble connecting right now. Please try again later.",
        error: llmError,
      });
    }

    let reply = completion.content;

    // Process markers
    let createdAppointmentId: string | null = null;
    let createdLeadId: string | null = null;

    // Handle [CONFIRM_APPOINTMENT]
    const apptData = parseAppointmentMarker(reply);
    if (apptData) {
      const { date, startTime, endTime, service, customerName: cn, customerPhone: cp, customerEmail: ce } = apptData;
      if (date && startTime && endTime && service && date !== "not provided") {
        const hasConflict = await checkAppointmentConflict(businessId, date, startTime, endTime);
        if (!hasConflict) {
          const apptId = generateId();
          await db.insert(appointment).values({
            id: apptId,
            businessId,
            customerName: cn || "Not provided",
            customerPhone: cp || "",
            customerEmail: ce || "",
            service,
            date,
            startTime,
            endTime,
            status: "scheduled",
          });
          createdAppointmentId = apptId;
        }
      }
    }

    // Handle [CREATE_LEAD]
    const leadData = parseLeadMarker(reply);
    if (leadData) {
      const { name, phone, email, preferredMethod, notes } = leadData;

      // Server-side validation: reject placeholders, empty values, "not provided"
      const extractedLead = {
        name: name || null,
        phone: phone || null,
        email: email || null,
        preferredMethod: preferredMethod || null,
        serviceRequest: notes || null,
      };

      if (isValidLead(extractedLead)) {
        const existingLeads = await db
          .select()
          .from(lead)
          .where(
            and(eq(lead.businessId, businessId), eq(lead.name, name))
          )
          .limit(1);

        if (existingLeads.length === 0) {
          const leadId = generateId();
          await db.insert(lead).values({
            id: leadId,
            businessId,
            name,
            phone: phone || "",
            email: email || "",
            preferredMethod: preferredMethod || "",
            contactValue:
              preferredMethod === "phone" ? phone : preferredMethod === "email" ? email : "",
            serviceRequest: notes || "",
            source: "chatbot",
            status: "new",
          });
          createdLeadId = leadId;
          await db.update(conversation).set({ leadId }).where(eq(conversation.id, convId));

          // Fire-and-forget: notify contractor and customer
          const summary = history.slice(-4).map((m: any) => `${m.role}: ${m.content.substring(0, 100)}`).join(" | ");
          Promise.all([
            notifyContractorOfNewLead(businessId, leadId, summary),
            sendCustomerConfirmation(businessId, leadId),
          ]).catch((e) => console.error("[chatbot] notifications failed:", e));
        }
      }
    }

    // Clean markers from response
    const cleanReply = cleanResponse(reply);

    // Save AI response
    await db.insert(message).values({
      id: generateId(),
      conversationId: convId,
      role: "assistant",
      content: cleanReply,
    });

    // If no lead was created via marker, try server-side extraction
    if (!createdLeadId) {
      try {
        const extracted = await extractLeadFromConversation([
          ...history,
          { role: "assistant", content: cleanReply },
        ]);
        if (extracted) {
          // Check for existing lead with same name
          const [existingLead] = await db
            .select()
            .from(lead)
            .where(and(eq(lead.businessId, businessId), eq(lead.name, extracted.name!)))
            .limit(1);

          if (!existingLead) {
            const newLeadId = generateId();
            await db.insert(lead).values({
              id: newLeadId,
              businessId,
              name: extracted.name!,
              phone: extracted.phone || "",
              email: extracted.email || "",
              preferredMethod: extracted.preferredMethod || "",
              contactValue:
                extracted.preferredMethod === "phone"
                  ? extracted.phone
                  : extracted.preferredMethod === "email"
                  ? extracted.email
                  : "",
              serviceRequest: extracted.serviceRequest || "",
              source: "chatbot",
              status: "new",
            });
            createdLeadId = newLeadId;
            await db.update(conversation).set({ leadId: newLeadId }).where(eq(conversation.id, convId));

            // Build conversation summary for contractor notification
            const summary = history.slice(-4).map((m) => `${m.role}: ${m.content.substring(0, 100)}`).join(" | ");

            // Await notifications before returning response
            try {
              await Promise.all([
                notifyContractorOfNewLead(businessId, newLeadId, summary),
                sendCustomerConfirmation(businessId, newLeadId),
              ]);
            } catch (e: any) {
              console.error("[chatbot] notifications error:", e?.message);
            }
          }
        }
      } catch (extractErr: any) {
        console.error("[chatbot] Lead extraction error:", extractErr?.message || String(extractErr));
      }
    }

    return corsResponse({
      response: cleanReply,
      conversationId: convId,
      appointmentId: createdAppointmentId,
      leadId: createdLeadId,
    });
  } catch (error) {
    console.error("Chatbot error:", error);
    return corsResponse({
      response: "I'm sorry, I'm having trouble connecting right now. Please try again later.",
    });
  }
}