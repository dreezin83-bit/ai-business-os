/**
 * Phone Number Management API
 *
 * GET    /api/business/[id]/phone  — list phone numbers for a business
 * POST   /api/business/[id]/phone  — buy a new phone number
 * DELETE /api/business/[id]/phone  — release a phone number (body: { phoneNumberId })
 */
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { phoneNumber, business } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { generateId } from "@/lib/utils";
import {
  buyPhoneNumber,
  deletePhoneNumber as vapiDeletePhoneNumber,
  createPhoneNumber,
} from "@/lib/vapi-client";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  const { id } = await params;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify ownership
  const [biz] = await db
    .select()
    .from(business)
    .where(and(eq(business.id, id), eq(business.ownerId, userId)))
    .limit(1);

  if (!biz) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const numbers = await db
    .select()
    .from(phoneNumber)
    .where(eq(phoneNumber.businessId, id))
    .orderBy(phoneNumber.createdAt);

  return NextResponse.json(numbers);
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  const { id } = await params;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify ownership
  const [biz] = await db
    .select()
    .from(business)
    .where(and(eq(business.id, id), eq(business.ownerId, userId)))
    .limit(1);

  if (!biz) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const areaCode = body.areaCode || undefined;

    // Build the server URL for this business
    const serverUrl = `https://ai-business-os-six.vercel.app/api/voice/vapi/${biz.vapiWebhookToken}`;

    // Buy a phone number from Vapi
    const vapiNumber = await buyPhoneNumber({ areaCode });

    // Assign the server URL to the purchased number
    await createPhoneNumber({
      number: vapiNumber.number,
      name: `${biz.name || "Business"} Voice Line`,
      serverUrl,
    });

    // Save to our database
    const recordId = generateId();
    const [record] = await db
      .insert(phoneNumber)
      .values({
        id: recordId,
        businessId: id,
        vapiPhoneNumberId: vapiNumber.id,
        number: vapiNumber.number,
        serverUrl,
        provider: vapiNumber.provider,
      })
      .returning();

    // Mark voice setup as ready
    await db
      .update(business)
      .set({ voiceSetupReady: true })
      .where(eq(business.id, id));

    return NextResponse.json(record);
  } catch (error: any) {
    console.error("[Phone API] Failed to buy number:", error?.message);
    return NextResponse.json(
      { error: error?.message || "Failed to purchase phone number" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  const { id } = await params;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify ownership
  const [biz] = await db
    .select()
    .from(business)
    .where(and(eq(business.id, id), eq(business.ownerId, userId)))
    .limit(1);

  if (!biz) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const body = await req.json();
    const { phoneNumberId: recordId } = body;

    if (!recordId) {
      return NextResponse.json({ error: "phoneNumberId is required" }, { status: 400 });
    }

    // Find the record
    const [record] = await db
      .select()
      .from(phoneNumber)
      .where(
        and(
          eq(phoneNumber.id, recordId),
          eq(phoneNumber.businessId, id)
        )
      )
      .limit(1);

    if (!record) {
      return NextResponse.json({ error: "Phone number not found" }, { status: 404 });
    }

    // Delete from Vapi
    await vapiDeletePhoneNumber(record.vapiPhoneNumberId);

    // Delete from our DB
    await db
      .delete(phoneNumber)
      .where(eq(phoneNumber.id, recordId));

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[Phone API] Failed to release number:", error?.message);
    return NextResponse.json(
      { error: error?.message || "Failed to release phone number" },
      { status: 500 }
    );
  }
}
