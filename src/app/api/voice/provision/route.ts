/**
 * POST /api/voice/provision — trigger or check Vapi provisioning status
 *
 * GET  — returns current provisioning status
 * POST — triggers provisioning (idempotent, safe to retry)
 *
 * Requires authenticated user who owns the business.
 */

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { business, phoneNumber } from "@/db/schema";
import { eq } from "drizzle-orm";
import { ensureBusiness } from "@/lib/business";
import { provisionVapiVoice, canProvisionVoice } from "@/lib/vapi-provisioning";

export async function GET() {
  try {
    const businessId = await ensureBusiness();
    if (!businessId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const [biz] = await db.select().from(business).where(eq(business.id, businessId));
    if (!biz) return NextResponse.json({ error: "Business not found" }, { status: 404 });

    const [pn] = await db
      .select()
      .from(phoneNumber)
      .where(eq(phoneNumber.businessId, businessId));

    return NextResponse.json({
      voiceSetupReady: biz.voiceSetupReady,
      webhookToken: biz.vapiWebhookToken,
      assistantId: biz.vapiAssistantId,
      phoneNumber: pn?.number || null,
      phoneNumberId: pn?.vapiPhoneNumberId || null,
      provisionError: biz.voiceProvisionError || null,
      provisionedAt: biz.voiceProvisionedAt || null,
      canProvision: await canProvisionVoice(businessId),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}

export async function POST() {
  try {
    const businessId = await ensureBusiness();
    if (!businessId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Check prerequisites
    const ready = await canProvisionVoice(businessId);
    if (!ready) {
      return NextResponse.json({
        success: false,
        error: "Business not ready for provisioning. Requires active subscription + completed onboarding.",
      }, { status: 400 });
    }

    // Trigger provisioning (idempotent)
    const result = await provisionVapiVoice(businessId);

    if (!result.success) {
      return NextResponse.json(result, { status: 500 });
    }

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message }, { status: 500 });
  }
}
