/**
 * GET /api/business/[id]/phone — returns the provisioned AI phone numbers for a business.
 * Used by the Settings page to display the AI Phone Number card.
 */

import { NextResponse } from "next/server";
import { db } from "@/db";
import { phoneNumber } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: businessId } = await params;

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
