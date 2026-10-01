import { NextResponse } from "next/server";
import { db } from "@/db";
import { business, aiBrainConfig, conversation, message, lead } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { generateId } from "@/lib/utils";
import { buildAiContext } from "@/lib/ai-context";
import { parseServices } from "@/lib/ai-services";
import { extractLeadFromConversation, isValidLead } from "@/lib/lead-extractor";
import { notifyContractorOfNewLead, sendCustomerConfirmation } from "@/lib/notifications";
import { upsertAiCall, updateCallOutcome, buildCallSummary } from "@/lib/ai-calls";
import { consumeCredits, canStartNewVoiceCall } from "@/lib/credits";

// ─── Types ──────────────────────────────────────────────────

/** Vapi wraps all events: { message: { type: "...", call, transcript, ... } } */
interface VapiMessageEnvelope {
  type: string;
  call?: {
    id: string;
    status?: string;
    customer?: { number: string; name?: string };
    phoneCallProviderId?: string;
    startedAt?: string;
    endedAt?: string;
  };
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

/** Best-effort call duration in whole seconds from the end-of-call report. */
function callDurationSeconds(msg: VapiMessageEnvelope): number {
  if (msg.call?.startedAt && msg.call?.endedAt) {
    const ms = new Date(msg.call.endedAt).getTime() - new Date(msg.call.startedAt).getTime();
    if (Number.isFinite(ms) && ms > 0) return Math.round(ms / 1000);
  }
  if (typeof msg.durationSeconds === "number" && msg.durationSeconds > 0) return msg.durationSeconds;
  return 0;
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

async function validateAuth(request: Request, webhookToken: string): Promise<boolean> {
  const authHeader = request.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : authHeader;
  const expected = process.env.VAPI_WEBHOOK_SECRET;

  if (!expected) {
    console.warn("[Vapi] VAPI_WEBHOOK_SECRET not set — accepting any token (insecure)");
    return true;
  }

  if (token !== expected) {
    console.error(`[Vapi] Invalid token for webhook ${webhookToken}`);
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
    const services = parseServices(config?.services).join(", ");

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

  // ── Record call history (ai_call) — idempotent upsert ──
  await upsertAiCall(businessId, {
    callId,
    status: "ended",
    customerPhone: customerNumber,
    customerName: msg.call?.customer?.name || "",
    endedAt: new Date(),
    endedReason: msg.endedReason || "",
    summary: msg.summary || buildCallSummary(
      allMessages.map((m) => ({ role: m.role, content: m.content })),
    ),
    recordingUrl: msg.recordingUrl || "",
    messageCount: allMessages.length,
    durationSeconds: callDurationSeconds(msg),
  });

  // ── Meter AI cost (owner decisions #1/#5) — voice minutes + per-call completion. ──
  // Idempotent per callId; fire-and-forget so metering never blocks the webhook or drops a call.
  const vapiModel = process.env.VAPI_MODEL_NAME || process.env.AI_MODEL || "gpt-4o";
  const durationSecs = callDurationSeconds(msg);
  if (durationSecs > 0) {
    consumeCredits({
      businessId,
      correlationId: callId,
      idempotencyKey: `voice:${callId}:voice.call.minutes`,
      eventType: "voice.call.minutes",
      source: "voice",
      provider: "vapi",
      model: vapiModel,
      quantity: durationSecs,
      unit: "second",
      metadata: { callId, customerNumber },
    }).catch(() => {});
  }
  consumeCredits({
    businessId,
    correlationId: callId,
    idempotencyKey: `voice:${callId}:ai.call.completed`,
    eventType: "ai.call.completed",
    source: "voice",
    provider: "vapi",
    model: vapiModel,
    quantity: 1,
    unit: "call",
    metadata: { callId },
  }).catch(() => {});

  if (allMessages.length === 0) {
    // No transcript — mark outcome as no_action.
    await updateCallOutcome(callId, "no_action");
    return;
  }

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
    const extracted = await extractLeadFromConversation(history, { businessId, correlationId: callId, source: "voice" });
    if (!extracted || !isValidLead(extracted)) {
      await updateCallOutcome(callId, "no_action");
      return;
    }

    // Check for duplicate by name within this business
    const [existingLead] = await db.select({ id: lead.id }).from(lead)
      .where(and(eq(lead.businessId, businessId), eq(lead.name, extracted.name!)))
      .limit(1);
    if (existingLead) {
      console.log(`[Vapi] Duplicate lead detected for ${extracted.name} — skipping`);
      await updateCallOutcome(callId, "no_action");
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

    // Mark outcome — a lead was captured from this call.
    await updateCallOutcome(callId, "lead_created", msg.summary || summary);
  } catch (err) {
    console.error("[Vapi] Lead extraction error:", err);
    await updateCallOutcome(callId, "no_action");
  }
}

// ─── Logging helpers ────────────────────────────────────────

function logEvent(token: string, type: string, extra?: string) {
  console.log(`[Vapi] token=${token.substring(0, 8)}... event=${type}${extra ? " " + extra : ""}`);
}

// ─── Handler ───────────────────────────────────────────────

export async function POST(
  request: Request,
  { params }: { params: Promise<{ webhookToken: string }> }
) {
  const { webhookToken } = await params;

  try {
    // ── Auth ──
    const authed = await validateAuth(request, webhookToken);
    if (!authed) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // ── Resolve business by webhook token ──
    const [biz] = await db
      .select({ id: business.id })
      .from(business)
      .where(eq(business.vapiWebhookToken, webhookToken))
      .limit(1);

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
    logEvent(webhookToken, eventType);

    // ── Route by event type ──

    // 1. assistant-request — return transient assistant (Option A)
    if (eventType === "assistant-request") {
      // Owner decision #3: never drop an ACTIVE call, but no NEW expensive AI work when exhausted.
      // assistant-request fires at call setup — blocking here stops new calls without touching live ones.
      if (!(await canStartNewVoiceCall(businessId))) {
        logEvent(webhookToken, eventType, "denied — credits exhausted");
        return NextResponse.json({
          assistant: {
            firstMessage: "We're unable to take new calls right now. Please try again later or reach out to us directly. Thank you!",
            model: { provider: "openai", model: "gpt-4o-mini", messages: [] },
          },
        });
      }
      const config = await buildAssistant(businessId);
      return NextResponse.json(config);
    }

    // 2. status-update — log call lifecycle + record call history
    if (eventType === "status-update") {
      const callId = msg.call?.id || "?";
      const status = msg.status || msg.call?.status || "?";
      logEvent(webhookToken, eventType, `call=${callId} status=${status}`);
      if (callId !== "?") {
        // Fire-and-forget upsert; keep the webhook responsive.
        upsertAiCall(businessId, {
          callId,
          status: status === "ended" ? "ended" : status === "in-progress" ? "in-progress" : status,
          customerPhone: msg.call?.customer?.number || "",
          customerName: msg.call?.customer?.name || "",
          startedAt: msg.call?.status ? new Date() : undefined,
          endedAt: status === "ended" ? new Date() : undefined,
        }).catch((err) => console.error("[Vapi] status-update ai_call error:", err));
      }
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
      logEvent(webhookToken, eventType, `call=${msg.call?.id || "?"}`);
      return NextResponse.json({});
    }

    // 5. conversation-update — log message history (for lead capture)
    if (eventType === "conversation-update") {
      const count = msg.messages?.length || 0;
      logEvent(webhookToken, eventType, `messages=${count}`);
      return NextResponse.json({});
    }

    // 6. transcript — log partial/final transcripts
    if (eventType === "transcript") {
      logEvent(webhookToken, eventType, `"${(msg.transcript || "").substring(0, 120)}"`);
      return NextResponse.json({});
    }

    // 7. speech-update — log speech start/stop
    if (eventType === "speech-update") {
      logEvent(webhookToken, eventType, `status=${msg.status || "?"}`);
      return NextResponse.json({});
    }

    // 8. tool-calls — handle tool calls, return empty result for now
    if (eventType === "tool-calls") {
      logEvent(webhookToken, eventType, `artifact=${JSON.stringify(msg.artifact || {}).substring(0, 200)}`);
      return NextResponse.json({ results: [] });
    }

    // Unknown event — log and acknowledge
    logEvent(webhookToken, eventType, "(unhandled — acknowledging)");
    return NextResponse.json({});

  } catch (error: any) {
    console.error("[Vapi] Unhandled error:", error?.message || error);
    return NextResponse.json(
      { error: "Sorry, we're having trouble. Please try again later." },
      { status: 200 }
    );
  }
}
