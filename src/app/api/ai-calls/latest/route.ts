/**
 * GET /api/ai-calls/latest — the most recent AI voice call for the
 * current business (last-call tracking). Auth required (tenant-isolated).
 */
import { NextResponse } from "next/server";
import { db } from "@/db";
import { aiCall } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { ensureBusiness } from "@/lib/business";

export async function GET() {
  try {
    const businessId = await ensureBusiness();
    if (!businessId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const [latest] = await db
      .select()
      .from(aiCall)
      .where(eq(aiCall.businessId, businessId))
      .orderBy(desc(aiCall.startedAt), desc(aiCall.createdAt))
      .limit(1);

    if (!latest) {
      return NextResponse.json({ call: null });
    }
    return NextResponse.json({ call: latest });
  } catch (error) {
    console.error("Failed to fetch latest call:", error);
    return NextResponse.json({ error: "Failed to fetch latest call" }, { status: 500 });
  }
}
