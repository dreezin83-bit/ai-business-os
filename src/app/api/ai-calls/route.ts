/**
 * GET /api/ai-calls — AI voice call history for the current business.
 * Auth required (tenant-isolated).
 *
 * Query params:
 *   status  — filter by call status (queued | ringing | in-progress | ended)
 *   outcome — filter by outcome (lead_created | appointment_booked | no_action | unknown)
 *   limit   — max rows (default 50, max 200)
 */
import { NextResponse } from "next/server";
import { db } from "@/db";
import { aiCall } from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { ensureBusiness } from "@/lib/business";
import { isCallOutcome } from "@/lib/ai-calls";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

const CALL_STATUSES = ["queued", "ringing", "in-progress", "ended"];

export async function GET(request: Request) {
  try {
    const businessId = await ensureBusiness();
    if (!businessId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const outcome = searchParams.get("outcome");
    const limit = Math.min(Number(searchParams.get("limit")) || DEFAULT_LIMIT, MAX_LIMIT);

    const conditions = [eq(aiCall.businessId, businessId)];
    if (status && CALL_STATUSES.includes(status)) conditions.push(eq(aiCall.status, status));
    if (outcome && isCallOutcome(outcome)) conditions.push(eq(aiCall.outcome, outcome));

    const calls = await db
      .select({
        id: aiCall.id,
        callId: aiCall.callId,
        customerPhone: aiCall.customerPhone,
        customerName: aiCall.customerName,
        status: aiCall.status,
        endedReason: aiCall.endedReason,
        summary: aiCall.summary,
        outcome: aiCall.outcome,
        recordingUrl: aiCall.recordingUrl,
        durationSeconds: aiCall.durationSeconds,
        messageCount: aiCall.messageCount,
        startedAt: aiCall.startedAt,
        endedAt: aiCall.endedAt,
        createdAt: aiCall.createdAt,
      })
      .from(aiCall)
      .where(and(...conditions))
      .orderBy(desc(aiCall.startedAt), desc(aiCall.createdAt))
      .limit(limit);

    return NextResponse.json({ calls, total: calls.length });
  } catch (error) {
    console.error("Failed to fetch AI call history:", error);
    return NextResponse.json({ error: "Failed to fetch calls" }, { status: 500 });
  }
}
