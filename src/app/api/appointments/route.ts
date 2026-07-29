import { NextResponse } from "next/server";
import { db } from "@/db";
import { appointment, business } from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { auth } from "@clerk/nextjs/server";
import { ensureBusiness } from "@/lib/business";
import { generateId } from "@/lib/utils";
import { notifyContractorOfNewAppointment, sendCustomerAppointmentConfirmation } from "@/lib/notifications";


export async function GET() {
  try {
    const businessId = await ensureBusiness();
    if (!businessId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const appointments = await db
      .select()
      .from(appointment)
      .where(eq(appointment.businessId, businessId))
      .orderBy(desc(appointment.date), desc(appointment.startTime));
    return NextResponse.json(appointments);
  } catch (error) {
    console.error("Failed to fetch appointments:", error);
    return NextResponse.json({ error: "Failed to fetch appointments" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const businessId = await ensureBusiness();
    if (!businessId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { customerName, customerPhone, customerEmail, service, date, startTime, endTime, notes, leadId } = body;

    if (!customerName || !service || !date || !startTime) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Double booking check — checks for ANY overlapping appointments, not just exact startTime matches
    const existing = await db
      .select()
      .from(appointment)
      .where(
        and(
          eq(appointment.businessId, businessId),
          eq(appointment.date, date),
          eq(appointment.status, "scheduled")
        )
      );

    const conflict = existing.some(
      (a) => startTime < a.endTime && (endTime || "") > a.startTime
    );

    if (conflict) {
      return NextResponse.json(
        { error: "This time slot overlaps with an existing booking. Please choose a different time." },
        { status: 409 }
      );
    }

    const newAppointment = {
      id: generateId(),
      businessId,
      leadId: leadId || null,
      customerName,
      customerPhone: customerPhone || "",
      customerEmail: customerEmail || "",
      service,
      date,
      startTime,
      endTime: endTime || "",
      status: "scheduled",
      notes: notes || "",
      googleEventId: "",
    };

    await db.insert(appointment).values(newAppointment);

    // Fire-and-forget notifications
    Promise.all([
      notifyContractorOfNewAppointment(businessId, newAppointment.id),
      sendCustomerAppointmentConfirmation(businessId, newAppointment.id),
    ]).catch((err) => console.error("[appointments] Notification error:", err));

    return NextResponse.json(newAppointment, { status: 201 });
  } catch (error) {
    console.error("Failed to create appointment:", error);
    return NextResponse.json({ error: "Failed to create appointment" }, { status: 500 });
  }
}