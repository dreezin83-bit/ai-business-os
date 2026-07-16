import { NextResponse } from "next/server";
import { db } from "@/db";
import { appointment, business } from "@/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@clerk/nextjs/server";
import { ensureBusiness } from "@/lib/business";


export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const businessId = await ensureBusiness();
    if (!businessId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const [found] = await db.select().from(appointment).where(eq(appointment.id, id));
    if (!found || found.businessId !== businessId) {
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
    }

    const body = await request.json();
    const updates: Record<string, string> = {};
    if (body.status !== undefined) updates.status = body.status;
    if (body.notes !== undefined) updates.notes = body.notes;

    await db.update(appointment).set(updates).where(eq(appointment.id, id));
    const [updated] = await db.select().from(appointment).where(eq(appointment.id, id));
    return NextResponse.json(updated);
  } catch (error) {
    console.error("Failed to update appointment:", error);
    return NextResponse.json({ error: "Failed to update appointment" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const businessId = await ensureBusiness();
    if (!businessId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const [found] = await db.select().from(appointment).where(eq(appointment.id, id));
    if (!found || found.businessId !== businessId) {
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
    }

    await db.delete(appointment).where(eq(appointment.id, id));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete appointment:", error);
    return NextResponse.json({ error: "Failed to delete appointment" }, { status: 500 });
  }
}