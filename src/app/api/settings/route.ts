import { NextResponse } from "next/server";
import { db } from "@/db";
import { business, usageAiCall } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { ensureBusiness } from "@/lib/business";

export async function GET() {
  try {
    const businessId = await ensureBusiness();
    if (!businessId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const [found] = await db.select().from(business).where(eq(business.id, businessId));
    if (!found) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Fetch last AI call timestamp (tenant-safe)
    const [lastCall] = await db
      .select({ createdAt: usageAiCall.createdAt })
      .from(usageAiCall)
      .where(eq(usageAiCall.businessId, businessId))
      .orderBy(desc(usageAiCall.createdAt))
      .limit(1);

    return NextResponse.json({
      ...found,
      lastCallAt: lastCall?.createdAt || null,
    });
  } catch (error) {
    console.error("Failed to fetch settings:", error);
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const businessId = await ensureBusiness();
    if (!businessId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const [found] = await db.select().from(business).where(eq(business.id, businessId));
    if (!found) return NextResponse.json({ error: "Business not found" }, { status: 404 });

    const updates: Record<string, string> = {};
    if (body.name !== undefined) updates.name = body.name;
    if (body.phone !== undefined) updates.phone = body.phone;
    if (body.email !== undefined) updates.email = body.email;
    if (body.website !== undefined) updates.website = body.website;
    if (body.address !== undefined) updates.address = body.address;

    await db.update(business).set(updates).where(eq(business.id, found.id));
    const [updated] = await db.select().from(business).where(eq(business.id, found.id));
    return NextResponse.json(updated);
  } catch (error) {
    console.error("Failed to update settings:", error);
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
}