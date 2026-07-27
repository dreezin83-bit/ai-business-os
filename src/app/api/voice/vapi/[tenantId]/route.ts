import { NextResponse } from "next/server";
import { db } from "@/db";
import { business, aiBrainConfig, conversation, message, lead } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { generateId } from "@/lib/utils";
import { buildAiContext } from "@/lib/ai-context";
import { extractLeadFromConversation, isValidLead } from "@/lib/lead-extractor";
import { notifyContractorOfNewLead, sendCustomerConfirmation } from "@/lib/notifications";

// ─── Types ──────────────────────────────────────────────────

/** Vapi wraps all events: { message: { type: "...", call, transcript, ... } } */
interface VapiMessageEnvelope {
  type: string;
  call?: { id: string; status?: string; customer?: { number: string; name?: string }; phoneCallProviderId?: string };
  transcript?: string;
  transcriptRole?: "assistant" | "user";
  status?: string;
  endedReason?: string;
  summary?: string;
  recordingUrl?: string;
  messages?: Array<{ role: "assistant" | "user" | "system"; content: string; time?: number }>;
  artifact?: Record<string, unknown>;
  [key: string]: unknown;
}

interface VapiRequestBody {
  message: VapiMessageEnvelope;
}

/** Response for assistant-request: a transient assistant (Option A) */
interface VapiAssistantResponse {
  assistant: {
    firstMessage: string;
    model: {
      provider: string;
      model: string;
      messages: Array<{ role: string; content: string }>;
    };
  };
}

/** Error response */
interface VapiErrorResponse {
  error: string;
}

// ─── Auth ───────────────────────────────────────────────────

async function validateAuth(request: Request, tenantId: string): Promise<boolean> {
  const authHeader = request.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : authHeader;
  const expected = process.env.VAPI_WEBHOOK_SECRET;

  if (!expected) {
    console.warn("[Vapi] VAPI_WEBHOOK_SECRET not set — accepting any token (insecure)");
    return true;
  }

  if (token !== expected) {
    console.error(`[Vapi] Invalid token for tenant ${tenantId}`);
    return false;
  }

  return true;
}

// ─── Build transient assistant config ───────────────────────

async function buildAssistant(businessId: string): Promise<VapiAssistantResponse | VapiErrorResponse> {
  try {
    const [biz] = await db.select().from(business).where(eq(business.id, businessId)).limit(1);
    if (!biz) return { error: "Business not found." };

    const [config] = await db.select().from(aiBrainConfig).where(eq(aiBrainConfig.businessId, businessId));

    // Load full AI context
    const ctx = await buildAiContext(businessId);
    const businessName = biz.name || "the business";

    // Voice-optimized system prompt
    const voicePrompt = [
      ctx.systemPrompt,
      "",
      "VOICE CALL INSTRUCTIONS:",
      "- Be warm, conversational, and concise. Keep responses under 3 sentences.",
      "- This is a voice call — the customer can't re-read your answers.",
      "- Listen carefully. Never re-ask something they already told you.",
      "- If you don't know something, offer to have a human call them back.",
      "- For booking: collect name, phone, preferred date/time, and service needed.",
      "- Prices: say them clearly and slowly.",
      "- Don't read lists, bullets, or URLs aloud.",
      `- Today is ${new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}.`,
    ].join("\n");

    // Build first message
    const services = (() => {
      try { const s = JSON.parse(config?.services || "[]"); return Array.isArray(s) ? s.join(", ") : ""; }
      catch { return ""; }
    })();

    const firstMessage = config?.greetingMessage ||
      `Hello, this is ${businessName}.${services ? ` We specialize in ${services}.` : ""} How can I help you today?`;

    const modelProvider = process.env.VAPI_MODEL_PROVIDER || "openai";
    const modelName = process.env.VAPI_MODEL_NAME || process.env.AI_MODEL || "gpt-4o";

    console.log(`[Vapi] Built assistant for ${businessName} (${businessId})`);

    return {
      assistant: {
        firstMessage,
        model: {
          provider: modelProvider,
          model: modelName,
          messages: [{ role: "system", content: voicePrompt }],
        },
      },
    };
  } catch (err: any) {
    console.error("[Vapi] buildAssistant error:", err?.message);
    return { error: "Sorry, we're having trouble. Please try again later." };
  }
}

// ─── End-of-call: save & extract leads ──────────────────────

async function handleEndOfCall(businessId: string, msg: VapiMessageEnvelope): Promise<void> {
  const callId = msg.call?.id || "unknown";
  const customerNumber = msg.call?.customer?.number || "";
  const allMessages = msg.messages || [];

  console.log(`[Vapi] End-of-call report: call=${callId} messages=${allMessages.length}`);

  if (allMessages.length === 0) return;

  // Save conversation + messages
  const convId = generateId();
  try {
    await db.insert(conversation).values({
      id: convId, businessId, source: "voice", status: "completed", customerPhone: customerNumber,
    });
    for (const m of allMessages) {
      await db.insert(message).values({
        id: generateId(), conversationId: convId, role: m.role, content: `[VAPI] ${m.content}`,
      });
    }
  } catch (err) {
    console.error("[Vapi] Failed saving transcript:", err);
    return;
  }

  // Extract lead
  try {
    const history = allMessages.map(m => ({ role: m.role as "user" | "assistant" | "system", content: m.content }));
    const extracted = await extractLeadFromConversation(history);
    if (!extracted || !isValidLead(extracted)) return;

    // Check for duplicate by name within this business
    const [existingLead] = await db.select({ id: lead.id }).from(lead)
      .where(and(eq(lead.businessId, businessId), eq(lead.name, extracted.name!)))
      .limit(1);
    if (existingLead) {
      console.log(`[Vapi] Duplicate lead detected for ${extracted.name} — skipping`);
      return;
    }

    const leadId = generateId();
    await db.insert(lead).values({
      id: leadId, businessId, name: extracted.name!, phone: extracted.phone || "",
      email: extracted.email || "", preferredMethod: extracted.preferredMethod || "phone",
      contactValue: extracted.preferredMethod === "email" ? extracted.email! : extracted.phone!,
      serviceRequest: extracted.serviceRequest || "", source: "voice", status: "new",
    });
    await db.update(conversation).set({ leadId }).where(eq(conversation.id, convId));

    const summary = allMessages.slice(-4).map(m => `${m.role}: ${m.content.substring(0, 80)}`).join(" | ");
    Promise.all([notifyContractorOfNewLead(businessId, leadId, summary), sendCustomerConfirmation(businessId, leadId)]).catch(() => {});
    console.log(`[Vapi] Lead created from voice: ${extracted.name}`);
  } catch (err) {
    console.error("[Vapi] Lead extraction error:", err);
  }
}

// ─── Logging helpers ────────────────────────────────────────

function logEvent(tenantId: string, type: string, extra?: string) {
  console.log(`[Vapi] tenant=${tenantId} event=${type}${extra ? " " + extra : ""}`);
}

// ─── Handler ───────────────────────────────────────────────

export async function POST(
  request: Request,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  const { tenantId } = await params;

  try {
    // ── Auth ──
    const authed = await validateAuth(request, tenantId);
    if (!authed) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Verify business exists
    const [biz] = await db.select({ id: business.id }).from(business).where(eq(business.id, tenantId)).limit(1);
    if (!biz) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }
    const businessId = biz.id;

    // ── Parse Vapi event ──
    let body: VapiRequestBody;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const msg = body.message;
    if (!msg || !msg.type) {
      return NextResponse.json({ error: "Missing message.type" }, { status: 400 });
    }

    const eventType = msg.type;
    logEvent(tenantId, eventType);

    // ── Route by event type ──

    // 1. assistant-request — return transient assistant (Option A)
    if (eventType === "assistant-request") {
      const config = await buildAssistant(businessId);
      return NextResponse.json(config);
    }

    // 2. status-update — log call lifecycle
    if (eventType === "status-update") {
      const callId = msg.call?.id || "?";
      const status = msg.status || msg.call?.status || "?";
      logEvent(tenantId, eventType, `call=${callId} status=${status}`);
      return NextResponse.json({});
    }

    // 3. end-of-call-report — save transcript, extract leads
    if (eventType === "end-of-call-report") {
      handleEndOfCall(businessId, msg).catch(err =>
        console.error("[Vapi] Async end-of-call error:", err)
      );
      return NextResponse.json({});
    }

    // 4. hang — log hangup
    if (eventType === "hang") {
      logEvent(tenantId, eventType, `call=${msg.call?.id || "?"}`);
      return NextResponse.json({});
    }

    // 5. conversation-update — log message history (for lead capture)
    if (eventType === "conversation-update") {
      const count = msg.messages?.length || 0;
      logEvent(tenantId, eventType, `messages=${count}`);
      return NextResponse.json({});
    }

    // 6. transcript — log partial/final transcripts
    if (eventType === "transcript") {
      logEvent(tenantId, eventType, `"${(msg.transcript || "").substring(0, 120)}"`);
      return NextResponse.json({});
    }

    // 7. speech-update — log speech start/stop
    if (eventType === "speech-update") {
      logEvent(tenantId, eventType, `status=${msg.status || "?"}`);
      return NextResponse.json({});
    }

    // 8. tool-calls — handle tool calls, return empty result for now
    if (eventType === "tool-calls") {
      logEvent(tenantId, eventType, `artifact=${JSON.stringify(msg.artifact || {}).substring(0, 200)}`);
      return NextResponse.json({ results: [] });
    }

    // Unknown event — log and acknowledge
    logEvent(tenantId, eventType, "(unhandled — acknowledging)");
    return NextResponse.json({});

  } catch (error: any) {
    console.error("[Vapi] Unhandled error:", error?.message || error);
    return NextResponse.json(
      { error: "Sorry, we're having trouble. Please try again later." },
      { status: 200 }
    );
  }
}
