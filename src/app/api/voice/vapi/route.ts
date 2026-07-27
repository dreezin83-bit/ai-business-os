import { NextResponse } from "next/server";
import { db } from "@/db";
import { business, aiBrainConfig } from "@/db/schema";
import { eq } from "drizzle-orm";

// ─── Types ──────────────────────────────────────────────────

interface VapiEvent {
  type: string;
  call?: {
    id: string;
    status: string;
    customer?: { number: string; name?: string };
  };
  message?: {
    role: "assistant" | "user" | "system";
    content: string;
  };
  transcript?: string;
  summary?: string;
}

interface VapiResponse {
  result?: string;
  messages?: Array<{ role: string; content: string }>;
  error?: string;
}

// ─── Tenant Resolution ─────────────────────────────────────

async function resolveTenant(tenantId: string, token: string): Promise<string | null> {
  if (!tenantId || !token) return null;

  // Look up business by ID
  const [biz] = await db.select().from(business).where(eq(business.id, tenantId)).limit(1);
  if (!biz) return null;

  // Validate authorization token
  // The token should match a stored API key for this business or a global webhook secret
  const expectedToken = process.env.VAPI_WEBHOOK_SECRET;
  if (!expectedToken) {
    // If no secret configured, accept any valid auth header for now
    console.warn("[Vapi] VAPI_WEBHOOK_SECRET not configured — accepting any token");
  } else if (token !== `Bearer ${expectedToken}`) {
    console.error("[Vapi] Invalid Authorization token for tenant:", tenantId);
    return null;
  }

  return biz.id;
}

// ─── Build AI System Prompt for Voice ──────────────────────

async function buildVoicePrompt(businessId: string): Promise<string> {
  const [config] = await db
    .select()
    .from(aiBrainConfig)
    .where(eq(aiBrainConfig.businessId, businessId));

  const [biz] = await db
    .select()
    .from(business)
    .where(eq(business.id, businessId));

  const businessName = biz?.name || "the business";

  // Parse services from JSON
  let servicesText = "";
  try {
    const services = config?.services ? JSON.parse(config.services) : [];
    if (Array.isArray(services) && services.length > 0) {
      servicesText = `\nServices offered: ${services.join(", ")}.`;
    }
  } catch {}

  // Parse business hours
  let hoursText = "";
  try {
    const hours = config?.businessHours ? JSON.parse(config.businessHours) : null;
    if (Array.isArray(hours)) {
      const openDays = hours.filter((h: any) => !h.closed).map((h: any) => `${h.day} ${h.open}-${h.close}`);
      if (openDays.length > 0) {
        hoursText = `\nBusiness hours: ${openDays.join(", ")}.`;
      }
    }
  } catch {}

  const basePrompt = config?.systemPrompt || `You are a helpful voice assistant for ${businessName}.`;

  return [
    basePrompt,
    `You are speaking on the phone as a representative of ${businessName}.`,
    `Be warm, conversational, and concise — the customer is on a voice call.`,
    biz?.phone ? `Business phone: ${biz.phone}.` : "",
    biz?.email ? `Business email: ${biz.email}.` : "",
    servicesText,
    hoursText,
    config?.pricingGuidance ? `Pricing: ${config.pricingGuidance}.` : "",
    config?.companyPolicies ? `Policies: ${config.companyPolicies}.` : "",
    config?.appointmentBookingRules ? `Booking rules: ${config.appointmentBookingRules}.` : "",
    `If the customer wants to book an appointment, collect their name, phone, preferred date/time, and service needed.`,
    `If you don't know an answer, offer to have a human call them back.`,
    `Keep responses under 3 sentences when possible — this is a voice conversation.`,
  ]
    .filter(Boolean)
    .join("\n");
}

// ─── Handler ───────────────────────────────────────────────

export async function POST(request: Request) {
  try {
    // Multi-tenant headers
    const authHeader = request.headers.get("authorization") || "";
    const tenantId = request.headers.get("x-tenant-id") || "";

    if (!tenantId) {
      return NextResponse.json({ error: "X-Tenant-Id header required" }, { status: 400 });
    }
    if (!authHeader) {
      return NextResponse.json({ error: "Authorization header required" }, { status: 401 });
    }

    // Resolve and validate tenant
    const businessId = await resolveTenant(tenantId, authHeader);
    if (!businessId) {
      return NextResponse.json({ error: "Invalid tenant or token" }, { status: 403 });
    }

    // Parse Vapi event
    const event: VapiEvent = await request.json();
    console.log(`[Vapi] Event ${event.type} for tenant ${tenantId}`);

    // Build response based on event type
    const response: VapiResponse = {};

    switch (event.type) {
      case "assistant-request":
        // Vapi is asking for the assistant configuration (first-time setup)
        const prompt = await buildVoicePrompt(businessId);
        response.result = prompt;
        response.messages = [
          { role: "system", content: prompt },
        ];
        break;

      case "call.start":
        // Call started — acknowledge
        console.log(`[Vapi] Call ${event.call?.id} started for business ${businessId}`);
        response.result = "ok";
        break;

      case "call.end":
        // Call ended — log for reporting
        const transcript = event.transcript || "";
        const summary = event.summary || "";
        console.log(`[Vapi] Call ${event.call?.id} ended. Transcript length: ${transcript.length}, Summary: ${summary.substring(0, 200)}`);
        response.result = "ok";
        break;

      case "end-of-call-report":
        // Final report with summary, recording URL, cost, etc.
        console.log(`[Vapi] End-of-call report for ${tenantId}:`, JSON.stringify(event).substring(0, 500));
        response.result = "ok";
        break;

      default:
        // Unknown event — ack and move on
        console.log(`[Vapi] Unhandled event type: ${event.type}`);
        response.result = "ok";
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error("[Vapi] Webhook error:", error);
    const fallback: VapiResponse = {
      result: "Sorry, I'm having trouble processing your request right now.",
    };
    return NextResponse.json(fallback, { status: 200 });
  }
}
