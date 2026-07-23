import { NextResponse } from "next/server";
import { db } from "@/db";
import { conversation, message, lead, appointment } from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { generateId } from "@/lib/utils";
import { ensureBusiness } from "@/lib/business";
import { buildAiContext } from "@/lib/ai-context";
import { createLlmCompletion } from "@/lib/llm";
import { notifyContractorOfNewLead, sendCustomerConfirmation } from "@/lib/notifications";
import { extractLeadFromConversation, isValidLead } from "@/lib/lead-extractor";

/** Parse [CONFIRM_APPOINTMENT]::date::startTime::endTime::service::name::phone::email from AI response */
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

/** Check if a time slot conflicts with existing appointments */
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

/** Remove action markers from AI response for clean display */
function cleanResponse(text: string): string {
  return text
    .replace(/\[CONFIRM_APPOINTMENT\]::[^\n]*/g, "")
    .replace(/\[CREATE_LEAD\]::[^\n]*/g, "")
    .trim();
}

export async function POST(request: Request) {
  try {
    const businessId = await ensureBusiness();
    if (!businessId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { message: userMessage, conversationId } = body;

    if (!userMessage) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    // Build AI context using the shared engine
    const ctx = await buildAiContext(businessId);

    // Get or create conversation
    let convId = conversationId;
    if (convId) {
      // Verify the conversation exists
      const [existingConv] = await db
        .select({ id: conversation.id })
        .from(conversation)
        .where(eq(conversation.id, convId))
        .limit(1);
      if (!existingConv) {
        convId = generateId();
      }
    }
    if (!convId) {
      convId = generateId();
      await db.insert(conversation).values({
        id: convId,
        businessId,
        source: "dashboard",
        status: "active",
      });
    }

    // Save user message
    await db.insert(message).values({
      id: generateId(),
      conversationId: convId,
      role: "user",
      content: userMessage,
    });

    // Get conversation history
    const msgs = await db
      .select()
      .from(message)
      .where(eq(message.conversationId, convId))
      .orderBy(desc(message.createdAt));

    const history = msgs.reverse().map((m) => ({
      role: m.role as "user" | "assistant" | "system",
      content: m.content,
    }));

    // Call LLM (supports OpenAI, OpenAI-compatible, and Gemini)
    const { completion, error: llmError } = await createLlmCompletion([
      { role: "system", content: ctx.systemPrompt },
      ...history,
    ]);
    if (!completion) {
      return NextResponse.json({ error: "AI not configured", detail: llmError || "Missing API key or configuration" }, { status: 503 });
    }

    let reply = completion.content;

    // Process markers
    let createdAppointmentId: string | null = null;
    let createdLeadId: string | null = null;

    // Handle [CONFIRM_APPOINTMENT]
    const apptData = parseAppointmentMarker(reply);
    if (apptData) {
      const { date, startTime, endTime, service, customerName, customerPhone, customerEmail } = apptData;
      if (date && startTime && endTime && service && date !== "not provided") {
        // Check for conflicts
        const hasConflict = await checkAppointmentConflict(businessId, date, startTime, endTime);
        if (!hasConflict) {
          const apptId = generateId();
          await db.insert(appointment).values({
            id: apptId,
            businessId,
            customerName: customerName || "Not provided",
            customerPhone: customerPhone || "",
            customerEmail: customerEmail || "",
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
            source: "ai_chat",
            status: "new",
          });
          createdLeadId = leadId;

          // Link to conversation
          await db.update(conversation).set({ leadId }).where(eq(conversation.id, convId));

          // Fire-and-forget: notify contractor and customer
          const summary = history.slice(-4).map((m: any) => `${m.role}: ${m.content.substring(0, 100)}`).join(" | ");
          Promise.all([
            notifyContractorOfNewLead(businessId, leadId, summary),
            sendCustomerConfirmation(businessId, leadId),
          ]).catch((e) => console.error("[ai/chat] notifications failed:", e));
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
              source: "ai_chat",
              status: "new",
            });
            createdLeadId = newLeadId;
            await db.update(conversation).set({ leadId: newLeadId }).where(eq(conversation.id, convId));

            // Await notifications before returning response
            const summary = history.slice(-4).map((m: any) => `${m.role}: ${m.content.substring(0, 100)}`).join(" | ");
            try {
              await Promise.all([
                notifyContractorOfNewLead(businessId, newLeadId, summary),
                sendCustomerConfirmation(businessId, newLeadId),
              ]);
            } catch (e: any) {
              console.error("[ai/chat] notifications error:", e?.message);
            }
          }
        }
      } catch (extractErr: any) {
        console.error("[ai/chat] Lead extraction error:", extractErr?.message || String(extractErr));
      }
    }

    return NextResponse.json({
      response: cleanReply,
      conversationId: convId,
      appointmentId: createdAppointmentId,
      leadId: createdLeadId,
    });
  } catch (error: any) {
    const detail = error?.message || String(error);
    const stack = error?.stack || "";
    const cause = error?.cause ? String(error.cause) : "";
    console.error("AI chat error:", detail, stack.substring(0, 300));
    return NextResponse.json(
      { error: "Failed to process chat", detail: `${detail}${cause ? ` (cause: ${cause})` : ""}` },
      { status: 500 }
    );
  }
}