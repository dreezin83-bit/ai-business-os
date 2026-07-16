import { NextResponse } from "next/server";
import { db } from "@/db";
import { communicationLog } from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { ensureBusiness } from "@/lib/business";

export async function GET(request: Request) {
  try {
    const businessId = await ensureBusiness();
    if (!businessId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const leadId = searchParams.get("leadId");
    const type = searchParams.get("type");
    const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "50", 10), 1), 200);

    // Build filters
    const filters = [eq(communicationLog.businessId, businessId)];

    if (leadId) {
      filters.push(eq(communicationLog.leadId, leadId));
    }

    if (type) {
      filters.push(eq(communicationLog.type, type));
    }

    const logs = await db
      .select()
      .from(communicationLog)
      .where(and(...filters))
      .orderBy(desc(communicationLog.sentAt))
      .limit(limit);

    return NextResponse.json(logs);
  } catch (error) {
    console.error("Failed to fetch communication history:", error);
    return NextResponse.json({ error: "Failed to fetch history" }, { status: 500 });
  }
}