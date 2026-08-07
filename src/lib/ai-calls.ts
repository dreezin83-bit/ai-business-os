/**
 * AI call history helpers — recording and classifying Vapi voice calls.
 *
 * The Vapi webhook reports call lifecycle events; this module upserts
 * `ai_call` rows per callId (idempotent) and derives an outcome based
 * on what the AI accomplished (lead created, appointment booked, etc.).
 */
import { db } from "@/db";
import { aiCall, business } from "@/db/schema";
import { eq } from "drizzle-orm";
import { generateId } from "@/lib/utils";

/** Normalized call outcomes. */
export const CALL_OUTCOMES = [
  "lead_created",
  "appointment_booked",
  "no_action",
  "unknown",
] as const;

export type CallOutcome = (typeof CALL_OUTCOMES)[number];

export function isCallOutcome(value: string): value is CallOutcome {
  return (CALL_OUTCOMES as readonly string[]).includes(value);
}

export interface VapiCallEvent {
  callId: string;
  status?: string;
  customerPhone?: string;
  customerName?: string;
  startedAt?: string | Date | null;
  endedAt?: string | Date | null;
  endedReason?: string;
  summary?: string;
  recordingUrl?: string;
  messageCount?: number;
  durationSeconds?: number;
}

/**
 * Upsert an ai_call row for a Vapi call event. Idempotent per callId:
 * first event creates the row, later events update it. Also refreshes
 * business.lastCallAt for last-call tracking. Never throws.
 */
export async function upsertAiCall(
  businessId: string,
  event: VapiCallEvent,
): Promise<void> {
  try {
    const now = new Date();
    const [existing] = await db
      .select()
      .from(aiCall)
      .where(eq(aiCall.callId, event.callId))
      .limit(1);

    const startedAt = event.startedAt ? new Date(event.startedAt) : undefined;
    const endedAt = event.endedAt ? new Date(event.endedAt) : undefined;

    if (existing) {
      await db
        .update(aiCall)
        .set({
          status: event.status || existing.status,
          customerPhone: event.customerPhone ?? existing.customerPhone,
          customerName: event.customerName ?? existing.customerName,
          startedAt: startedAt ?? existing.startedAt,
          endedAt: endedAt ?? existing.endedAt,
          endedReason: event.endedReason ?? existing.endedReason,
          summary: event.summary ?? existing.summary,
          recordingUrl: event.recordingUrl ?? existing.recordingUrl,
          messageCount: event.messageCount ?? existing.messageCount,
          durationSeconds: event.durationSeconds ?? existing.durationSeconds,
          updatedAt: now,
        })
        .where(eq(aiCall.id, existing.id));
    } else {
      await db.insert(aiCall).values({
        id: generateId(),
        businessId,
        callId: event.callId,
        status: event.status || "ended",
        customerPhone: event.customerPhone || "",
        customerName: event.customerName || "",
        startedAt,
        endedAt,
        endedReason: event.endedReason || "",
        summary: event.summary || "",
        recordingUrl: event.recordingUrl || "",
        messageCount: event.messageCount || 0,
        durationSeconds: event.durationSeconds || 0,
        outcome: "unknown",
        createdAt: now,
        updatedAt: now,
      });
    }

    // Last-call tracking on the business row (single query for dashboard).
    const stamp = endedAt || startedAt || now;
    await db
      .update(business)
      .set({ lastCallAt: stamp, updatedAt: now })
      .where(eq(business.id, businessId));
  } catch (err) {
    console.error("[ai-calls] Failed to upsert call:", err);
  }
}

/**
 * Update a call's outcome + summary (used when a lead/appointment is
 * created during end-of-call processing, or via manual PATCH).
 */
export async function updateCallOutcome(
  callId: string,
  outcome: CallOutcome,
  summary?: string,
): Promise<void> {
  try {
    await db
      .update(aiCall)
      .set({
        outcome,
        ...(summary !== undefined ? { summary } : {}),
        updatedAt: new Date(),
      })
      .where(eq(aiCall.callId, callId));
  } catch (err) {
    console.error("[ai-calls] Failed to update outcome:", err);
  }
}

/** Map a conversation/message history to a human-readable summary. */
export function buildCallSummary(
  messages: Array<{ role: string; content: string }>,
  maxMessages = 5,
): string {
  if (messages.length === 0) return "";
  return messages
    .slice(-maxMessages)
    .map((m) => `${m.role}: ${m.content.substring(0, 140)}`)
    .join(" | ")
    .substring(0, 1500);
}
