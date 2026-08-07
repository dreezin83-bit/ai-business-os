/**
 * GET    /api/ai-calls/[id] — single AI call detail (tenant-isolated)
 * PATCH  /api/ai-calls/[id] — update outcome / summary / customerName
 */
import { NextResponse } from "next/server";
import { db } from "@/db";
import { aiCall } from "@/db/schema";
import { eq } from "drizzle-orm";
import { ensureBusiness } from "@/lib/business";
import { isCallOutcome } from "@/lib/ai-calls";

async function findOwnedCall(id: string, businessId: string) {
  const [call] = await db.select().from(aiCall).where(eq(aiCall.id, id)).limit(1);
  if (!call || call.businessId !== businessId) return null;
  return call;
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const businessId = await ensureBusiness();
    if (!businessId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const call = await findOwnedCall(id, businessId);
    if (!call) return NextResponse.json({ error: "Call not found" }, { status: 404 });

    return NextResponse.json({ call });
  } catch (error) {
    console.error("Failed to fetch AI call:", error);
    return NextResponse.json({ error: "Failed to fetch call" }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const businessId = await ensureBusiness();
    if (!businessId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const call = await findOwnedCall(id, businessId);
    if (!call) return NextResponse.json({ error: "Call not found" }, { status: 404 });

    const body = await request.json();
    const updates: Record<string, unknown> = {};
    const errors: string[] = [];

    if (body.outcome !== undefined) {
      const outcome = String(body.outcome).trim();
      if (!isCallOutcome(outcome)) {
        errors.push("outcome must be one of: lead_created, appointment_booked, no_action, unknown");
      } else {
        updates.outcome = outcome;
      }
    }
    if (body.summary !== undefined) {
      const summary = String(body.summary ?? "");
      if (summary.length > 1500) {
        errors.push("summary is too long (max 1500 chars)");
      } else {
        updates.summary = summary;
      }
    }
    if (body.customerName !== undefined) {
      updates.customerName = String(body.customerName ?? "").trim();
    }

    if (errors.length > 0) {
      return NextResponse.json({ error: errors.join("; ") }, { status: 400 });
    }
    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
    }

    await db.update(aiCall).set({ ...updates, updatedAt: new Date() }).where(eq(aiCall.id, id));
    const [updated] = await db.select().from(aiCall).where(eq(aiCall.id, id));
    return NextResponse.json({ call: updated });
  } catch (error) {
    console.error("Failed to update AI call:", error);
    return NextResponse.json({ error: "Failed to update call" }, { status: 500 });
  }
}
