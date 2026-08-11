import { NextResponse } from "next/server";
import { db } from "@/db";
import { business } from "@/db/schema";
import { eq } from "drizzle-orm";
import { ensureBusiness } from "@/lib/business";

/**
 * GET /api/business/current
 * Returns the authenticated user's current business profile.
 * Tenant-scoped: resolves the business from the Clerk session via ensureBusiness()
 * (which auto-creates the business row on first access).
 *
 * Consumers:
 * - /dashboard/ai-brain (uses name, phone, email, website)
 */
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const businessId = await ensureBusiness();
    if (!businessId) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Unauthorized" } },
        { status: 401 }
      );
    }

    const [biz] = await db.select().from(business).where(eq(business.id, businessId)).limit(1);
    if (!biz) {
      return NextResponse.json(
        { error: { code: "BUSINESS_NOT_FOUND", message: "Business not found" } },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: biz.id,
      name: biz.name,
      phone: biz.phone ?? "",
      email: biz.email ?? "",
      website: biz.website ?? "",
      address: biz.address ?? "",
      category: biz.category ?? "",
      onboardingComplete: biz.onboardingComplete,
    });
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error("[business/current] Failed to load current business", {
      errorName: err.name,
      errorMessage: err.message,
      stack: err.stack,
    });
    return NextResponse.json(
      { error: { code: "BUSINESS_LOAD_FAILED", message: "Failed to load business" } },
      { status: 500 }
    );
  }
}
