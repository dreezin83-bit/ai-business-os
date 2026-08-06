/**
 * GET /api/business/[id]/phone — returns the provisioned AI phone numbers for a business.
 * Used by the Settings page to display the AI Phone Number card.
 *
 * Auth: Clerk-protected. The caller must be authenticated and must match
 * the requested business ID (or be a Super Admin with role=super_admin in
 * Clerk public metadata).
 */

import { NextResponse } from "next/server";
import { db } from "@/db";
import { phoneNumber } from "@/db/schema";
import { eq } from "drizzle-orm";
import { ensureBusiness } from "@/lib/business";
import { auth } from "@clerk/nextjs/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: businessId } = await params;

  // ── Auth gate: require a logged-in user ──
  const { userId, sessionClaims } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ── Tenant ownership check ──
  // Super Admin can access any business; regular users must own the business.
  const role = (sessionClaims?.publicMetadata as any)?.role;
  const isSuperAdmin = role === "super_admin";

  if (!isSuperAdmin) {
    const userBusinessId = await ensureBusiness();
    if (!userBusinessId) {
      return NextResponse.json({ error: "No business profile found" }, { status: 403 });
    }
    if (userBusinessId !== businessId) {
      return NextResponse.json(
        { error: "Forbidden: you do not own this business" },
        { status: 403 },
      );
    }
  }

  try {
    const numbers = await db
      .select({
        id: phoneNumber.id,
        number: phoneNumber.number,
        provider: phoneNumber.provider,
        serverUrl: phoneNumber.serverUrl,
      })
      .from(phoneNumber)
      .where(eq(phoneNumber.businessId, businessId));

    return NextResponse.json(numbers);
  } catch (error: any) {
    console.error(`[business-phone] Error for ${businessId}:`, error?.message);
    return NextResponse.json([], { status: 200 }); // empty array is safe
  }
}
