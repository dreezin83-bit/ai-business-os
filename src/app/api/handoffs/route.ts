/**
 * GET  /api/handoffs — human handoff / escalation inbox (tenant-isolated)
 * POST /api/handoffs — manually create a handoff (e.g. from the dashboard)
 *
 * Query params:
 *   status — pending | assigned | resolved (optional, all if omitted)
 *   limit  — max rows (default 100, max 200)
 */
import { NextResponse } from "next/server";
import { db } from "@/db";
import { handoff } from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { ensureBusiness } from "@/lib/business";
import { createHandoff } from "@/lib/escalation";
import { generateId } from "@/lib/utils";

const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 200;
const HANDOFF_STATUSES = ["pending", "assigned", "resolved"];

export async function GET(request: Request) {
  try {
    const businessId = await ensureBusiness();
    if (!businessId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const limit = Math.min(Number(searchParams.get("limit")) || DEFAULT_LIMIT, MAX_LIMIT);

    const conditions = [eq(handoff.businessId, businessId)];
    if (status && HANDOFF_STATUSES.includes(status)) conditions.push(eq(handoff.status, status));

    const items = await db
      .select()
      .from(handoff)
      .where(and(...conditions))
      .orderBy(desc(handoff.createdAt))
      .limit(limit);

    return NextResponse.json({
      handoffs: items,
      total: items.length,
      pending: items.filter((h) => h.status === "pending").length,
    });
  } catch (error) {
    console.error("Failed to fetch handoffs:", error);
    return NextResponse.json({ error: "Failed to fetch handoffs" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const businessId = await ensureBusiness();
    if (!businessId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const reason = String(body.reason || "").trim();
    if (!reason) {
      return NextResponse.json({ error: "reason is required" }, { status: 400 });
    }

    const priority = body.priority === "high" ? "high" : "normal";
    const created = await createHandoff({
      businessId,
      leadId: body.leadId ? String(body.leadId) : null,
      conversationId: body.conversationId ? String(body.conversationId) : null,
      customerName: String(body.customerName || ""),
      customerPhone: String(body.customerPhone || ""),
      customerEmail: String(body.customerEmail || ""),
      reason,
      summary: String(body.summary || ""),
      priority,
    });

    if (!created) {
      return NextResponse.json({ error: "Failed to create handoff" }, { status: 500 });
    }
    return NextResponse.json({ handoff: created }, { status: 201 });
  } catch (error) {
    console.error("Failed to create handoff:", error);
    return NextResponse.json({ error: "Failed to create handoff" }, { status: 500 });
  }
}
