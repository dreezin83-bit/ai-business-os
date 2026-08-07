/**
 * GET   /api/appointments/[id] — single appointment (tenant-isolated)
 * PATCH /api/appointments/[id] — edit / cancel / reschedule / status / notes
 * DELETE /api/appointments/[id] — hard delete
 *
 * PATCH supports (combinable):
 *   edit:        customerName, customerPhone, customerEmail, service
 *   reschedule:  date + startTime (+ optional endTime) — with double-booking check
 *   status:      scheduled | confirmed | completed | cancelled | no_show
 *   notes:       free text
 *   cancel:      status=cancelled + optional cancelReason
 */
import { NextResponse } from "next/server";
import { db } from "@/db";
import { appointment } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { ensureBusiness } from "@/lib/business";
import { computeDefaultEndTime } from "@/lib/utils";
import {
  sanitizeAppointmentPatch,
  detectTimeConflict,
} from "@/lib/appointments";

async function findOwnedAppointment(id: string, businessId: string) {
  const [found] = await db.select().from(appointment).where(eq(appointment.id, id)).limit(1);
  if (!found || found.businessId !== businessId) return null;
  return found;
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const businessId = await ensureBusiness();
    if (!businessId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const found = await findOwnedAppointment(id, businessId);
    if (!found) return NextResponse.json({ error: "Appointment not found" }, { status: 404 });

    return NextResponse.json(found);
  } catch (error) {
    console.error("Failed to fetch appointment:", error);
    return NextResponse.json({ error: "Failed to fetch appointment" }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const businessId = await ensureBusiness();
    if (!businessId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const found = await findOwnedAppointment(id, businessId);
    if (!found) return NextResponse.json({ error: "Appointment not found" }, { status: 404 });

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { updates, errors, rescheduling, cancelling } = sanitizeAppointmentPatch(body);
    if (errors.length > 0) {
      return NextResponse.json({ error: errors.join("; ") }, { status: 400 });
    }

    // ── Double-booking check on reschedule (exclude self) ──
    if (rescheduling) {
      const date = String(updates.date);
      const startTime = String(updates.startTime);
      const endTime = String(updates.endTime || computeDefaultEndTime(startTime));

      const others = await db
        .select({
          id: appointment.id,
          date: appointment.date,
          startTime: appointment.startTime,
          endTime: appointment.endTime,
          status: appointment.status,
        })
        .from(appointment)
        .where(
          and(
            eq(appointment.businessId, businessId),
            eq(appointment.date, date),
          ),
        );

      const conflict = detectTimeConflict(
        others.filter((a) => a.id !== id),
        date,
        startTime,
        endTime,
      );
      if (conflict) {
        return NextResponse.json(
          { error: "This time slot overlaps with an existing booking. Please choose a different time." },
          { status: 409 },
        );
      }
      if (!updates.endTime) updates.endTime = computeDefaultEndTime(startTime);
    }

    // ── Cancel bookkeeping ──
    if (cancelling) {
      updates.cancelledAt = new Date();
    } else if (found.status === "cancelled" && updates.status !== "cancelled") {
      // Un-cancelling clears the cancel trail.
      updates.cancelledAt = null;
      updates.cancelReason = "";
    }

    updates.updatedAt = new Date();
    await db.update(appointment).set(updates).where(eq(appointment.id, id));

    const [updated] = await db.select().from(appointment).where(eq(appointment.id, id));
    return NextResponse.json(updated);
  } catch (error) {
    console.error("Failed to update appointment:", error);
    return NextResponse.json({ error: "Failed to update appointment" }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const businessId = await ensureBusiness();
    if (!businessId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const found = await findOwnedAppointment(id, businessId);
    if (!found) return NextResponse.json({ error: "Appointment not found" }, { status: 404 });

    await db.delete(appointment).where(eq(appointment.id, id));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete appointment:", error);
    return NextResponse.json({ error: "Failed to delete appointment" }, { status: 500 });
  }
}
