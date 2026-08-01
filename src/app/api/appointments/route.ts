import { NextResponse } from "next/server";
import { db } from "@/db";
import { appointment, business } from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { auth } from "@clerk/nextjs/server";
import { ensureBusiness } from "@/lib/business";
import { generateId, timeToMinutes, computeDefaultEndTime } from "@/lib/utils";
import { notifyContractorOfNewAppointment, sendCustomerAppointmentConfirmation } from "@/lib/notifications";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

export async function GET(request: Request) {
  try {
    const businessId = await ensureBusiness();
    if (!businessId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const limit = Math.min(Number(searchParams.get("limit")) || DEFAULT_LIMIT, MAX_LIMIT);

    const appointments = await db
      .select({
        id: appointment.id,
        customerName: appointment.customerName,
        customerPhone: appointment.customerPhone,
        customerEmail: appointment.customerEmail,
        service: appointment.service,
        date: appointment.date,
        startTime: appointment.startTime,
        endTime: appointment.endTime,
        status: appointment.status,
        notes: appointment.notes,
        leadId: appointment.leadId,
        googleEventId: appointment.googleEventId,
        createdAt: appointment.createdAt,
        updatedAt: appointment.updatedAt,
      })
      .from(appointment)
      .where(eq(appointment.businessId, businessId))
      .orderBy(desc(appointment.date), desc(appointment.startTime))
      .limit(limit);

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

    // Double booking check — uses proper time-to-minutes comparison
    const startMins = timeToMinutes(startTime);
    const endMins = timeToMinutes(endTime || computeDefaultEndTime(startTime));
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

    const conflict = startMins >= 0 && endMins >= 0 && existing.some(
      (a) => {
        const aStart = timeToMinutes(a.startTime);
        const aEnd = timeToMinutes(a.endTime);
        if (aStart < 0 || aEnd < 0) return false;
        return startMins < aEnd && endMins > aStart;
      }
    );

    if (conflict) {
      return NextResponse.json(
        { error: "This time slot overlaps with an existing booking. Please choose a different time." },
        { status: 409 }
      );
    }

    const finalEndTime = endTime || computeDefaultEndTime(startTime);

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
      endTime: finalEndTime,
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