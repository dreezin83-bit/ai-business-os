import { NextResponse } from "next/server";
import { db } from "@/db";
import { communicationSettings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { ensureBusiness } from "@/lib/business";
import { generateId } from "@/lib/utils";

export async function GET() {
  try {
    const businessId = await ensureBusiness();
    if (!businessId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const [settings] = await db
      .select()
      .from(communicationSettings)
      .where(eq(communicationSettings.businessId, businessId));

    if (!settings) {
      return NextResponse.json({
        emailEnabled: true,
        whatsappEnabled: false,
        smsEnabled: true,
        primaryMethod: "email",
      });
    }

    return NextResponse.json(settings);
  } catch (error) {
    console.error("Failed to fetch communication settings:", error);
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const businessId = await ensureBusiness();
    if (!businessId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { emailEnabled, whatsappEnabled, smsEnabled, primaryMethod } = body;

    const [existing] = await db
      .select()
      .from(communicationSettings)
      .where(eq(communicationSettings.businessId, businessId));

    const data = {
      emailEnabled: emailEnabled ?? true,
      whatsappEnabled: whatsappEnabled ?? false,
      smsEnabled: smsEnabled ?? true,
      primaryMethod: primaryMethod || "email",
    };

    if (existing) {
      await db
        .update(communicationSettings)
        .set(data)
        .where(eq(communicationSettings.businessId, businessId));
    } else {
      await db
        .insert(communicationSettings)
        .values({ id: generateId(), businessId, ...data });
    }

    const [updated] = await db
      .select()
      .from(communicationSettings)
      .where(eq(communicationSettings.businessId, businessId));

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Failed to save communication settings:", error);
    return NextResponse.json({ error: "Failed to save settings" }, { status: 500 });
  }
}