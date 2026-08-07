/**
 * GET /api/status-timeline — billing + Vapi provisioning timeline
 * for the current business. Auth required (tenant-isolated).
 *
 * Query params:
 *   scope  — "billing" | "provisioning" (optional, all if omitted)
 *   limit  — max rows (default 100, max 200)
 */
import { NextResponse } from "next/server";
import { db } from "@/db";
import { statusTimeline } from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { ensureBusiness } from "@/lib/business";
import { timelineEventLabel } from "@/lib/timeline";

const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 200;

export async function GET(request: Request) {
  try {
    const businessId = await ensureBusiness();
    if (!businessId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const scope = searchParams.get("scope");
    const limit = Math.min(Number(searchParams.get("limit")) || DEFAULT_LIMIT, MAX_LIMIT);

    const conditions = [eq(statusTimeline.businessId, businessId)];
    if (scope === "billing" || scope === "provisioning") {
      conditions.push(eq(statusTimeline.scope, scope));
    }

    const events = await db
      .select({
        id: statusTimeline.id,
        scope: statusTimeline.scope,
        event: statusTimeline.event,
        detail: statusTimeline.detail,
        status: statusTimeline.status,
        createdAt: statusTimeline.createdAt,
      })
      .from(statusTimeline)
      .where(and(...conditions))
      .orderBy(desc(statusTimeline.createdAt))
      .limit(limit);

    return NextResponse.json({
      events: events.map((e) => ({ ...e, label: timelineEventLabel(e.event) })),
      total: events.length,
    });
  } catch (error) {
    console.error("Failed to fetch status timeline:", error);
    return NextResponse.json({ error: "Failed to fetch timeline" }, { status: 500 });
  }
}
