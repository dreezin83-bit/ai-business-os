/**
 * GET   /api/handoffs/[id] — single handoff detail (tenant-isolated)
 * PATCH /api/handoffs/[id] — assign / status / notes / resolve
 *
 * PATCH body fields:
 *   assignedTo  — user id or name the item is assigned to
 *   status      — pending | assigned | resolved
 *   notes       — staff notes (appended to existing)
 *   priority    — normal | high
 */
import { NextResponse } from "next/server";
import { db } from "@/db";
import { handoff } from "@/db/schema";
import { eq } from "drizzle-orm";
import { ensureBusiness } from "@/lib/business";

const HANDOFF_STATUSES = ["pending", "assigned", "resolved"];

async function findOwnedHandoff(id: string, businessId: string) {
  const [item] = await db.select().from(handoff).where(eq(handoff.id, id)).limit(1);
  if (!item || item.businessId !== businessId) return null;
  return item;
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const businessId = await ensureBusiness();
    if (!businessId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const item = await findOwnedHandoff(id, businessId);
    if (!item) return NextResponse.json({ error: "Handoff not found" }, { status: 404 });

    return NextResponse.json({ handoff: item });
  } catch (error) {
    console.error("Failed to fetch handoff:", error);
    return NextResponse.json({ error: "Failed to fetch handoff" }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const businessId = await ensureBusiness();
    if (!businessId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const item = await findOwnedHandoff(id, businessId);
    if (!item) return NextResponse.json({ error: "Handoff not found" }, { status: 404 });

    const body = await request.json();
    const updates: Record<string, unknown> = {};
    const now = new Date();
    const errors: string[] = [];

    if (body.status !== undefined) {
      const status = String(body.status).trim();
      if (!HANDOFF_STATUSES.includes(status)) {
        errors.push(`status must be one of: ${HANDOFF_STATUSES.join(", ")}`);
      } else {
        updates.status = status;
        if (status === "resolved") {
          updates.resolvedAt = now;
          // Resolving implies it's no longer awaiting assignment.
          if (body.assignedTo === undefined && !item.assignedTo) {
            updates.assignedTo = item.assignedTo || "";
          }
        } else {
          updates.resolvedAt = null;
        }
      }
    }

    if (body.assignedTo !== undefined) {
      const assignedTo = String(body.assignedTo ?? "").trim();
      if (!assignedTo) {
        errors.push("assignedTo cannot be empty");
      } else {
        updates.assignedTo = assignedTo;
        // Assigning moves status to "assigned" unless explicitly resolved.
        if (updates.status === undefined) updates.status = "assigned";
      }
    }

    if (body.notes !== undefined) {
      const note = String(body.notes ?? "").trim();
      if (note) {
        const prefix = item.notes ? item.notes + "\n" : "";
        const timestamp = now.toISOString();
        updates.notes = `${prefix}[${timestamp}] ${note}`.substring(0, 4000);
      }
    }

    if (body.priority !== undefined) {
      const priority = String(body.priority).trim();
      if (priority !== "normal" && priority !== "high") {
        errors.push("priority must be normal or high");
      } else {
        updates.priority = priority;
      }
    }

    if (errors.length > 0) {
      return NextResponse.json({ error: errors.join("; ") }, { status: 400 });
    }
    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
    }

    updates.updatedAt = now;
    await db.update(handoff).set(updates).where(eq(handoff.id, id));
    const [updated] = await db.select().from(handoff).where(eq(handoff.id, id));
    return NextResponse.json({ handoff: updated });
  } catch (error) {
    console.error("Failed to update handoff:", error);
    return NextResponse.json({ error: "Failed to update handoff" }, { status: 500 });
  }
}
