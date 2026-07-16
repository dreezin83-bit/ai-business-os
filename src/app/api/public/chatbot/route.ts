import { NextResponse } from "next/server";
import { db } from "@/db";
import { business, lead, conversation, message, appointment } from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { generateId } from "@/lib/utils";
import { buildAiContext } from "@/lib/ai-context";
import { createLlmCompletion } from "@/lib/llm";

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

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { businessId, message: userMessage, conversationId, customerName, customerPhone, customerEmail } = body;

    if (!businessId || !userMessage) {
      return NextResponse.json({ error: "businessId and message are required" }, { status: 400 });
    }

    // Verify business exists
    const [biz] = await db.select().from(business).where(eq(business.id, businessId));
    if (!biz) {
      return NextResponse.json({ error: "Business not found" }, { status: 404 });
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
    const completion = await createLlmCompletion([
      { role: "system", content: ctx.systemPrompt },
      ...history,
    ]);
    if (!completion) {
      return NextResponse.json({
        response: ctx.greetingMessage || "I'm sorry, I'm having trouble connecting right now. Please try again later.",
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
      if (name && name !== "not provided") {
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

    return NextResponse.json({
      response: cleanReply,
      conversationId: convId,
      appointmentId: createdAppointmentId,
      leadId: createdLeadId,
    });
  } catch (error) {
    console.error("Chatbot error:", error);
    return NextResponse.json({
      response: "I'm sorry, I'm having trouble connecting right now. Please try again later.",
    });
  }
}