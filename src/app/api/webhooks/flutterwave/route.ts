/**
 * Flutterwave Webhook Handler
 *
 * Listens for charge.completed events and automates phone number provisioning
 * for businesses that have just upgraded their subscription.
 *
 * Flow:
 *  1. Verify the webhook signature (verif-hash header)
 *  2. Parse the charge.completed event
 *  3. Look up the business from metadata.businessId
 *  4. Buy a Vapi phone number for the business
 *  5. Set its serverUrl to the business's Vapi webhook endpoint
 *  6. Save the phone number to the phone_numbers table
 *  7. Mark the business as voice_setup_ready
 *
 * Public route: /api/webhooks(.*) is already whitelisted in middleware.
 *
 * Required env: FLUTTERWAVE_SECRET_HASH, VAPI_API_KEY
 */

import { NextResponse } from "next/server";
import { db } from "@/db";
import { business, phoneNumber } from "@/db/schema";
import { eq } from "drizzle-orm";
import { generateId } from "@/lib/utils";
import { buyPhoneNumber, createPhoneNumber, updatePhoneNumber } from "@/lib/vapi-client";

/** Verify webhook signature via Flutterwave's verif-hash header */
function verifySignature(request: Request): boolean {
  const secretHash = process.env.FLUTTERWAVE_SECRET_HASH;
  if (!secretHash) {
    console.warn("[Flutterwave] FLUTTERWAVE_SECRET_HASH not set — accepting all (insecure)");
    return true;
  }
  const verifHash = request.headers.get("verif-hash") || "";
  return verifHash === secretHash;
}

export async function POST(request: Request) {
  if (!verifySignature(request)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: any;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const event = payload.event || payload["event.type"];
  const data = payload.data || {};

  console.log(`[Flutterwave] Event: ${event}, tx_ref: ${data.tx_ref || "N/A"}`);

  // ── Only handle successful charge completions ──────────────
  if (event !== "charge.completed") {
    return NextResponse.json({ status: "ignored", event }, { status: 200 });
  }

  if (data.status !== "successful") {
    console.log(`[Flutterwave] Charge not successful: status=${data.status}`);
    return NextResponse.json({ status: "skipped", reason: "not successful" });
  }

  // ── Extract business ID from metadata ─────────────────────
  const meta = data.meta || {};
  const businessId = meta.businessId || meta.business_id || null;

  if (!businessId) {
    console.log("[Flutterwave] No businessId in metadata — skipping");
    return NextResponse.json({ status: "skipped", reason: "no businessId" });
  }

  // ── Look up the business ──────────────────────────────────
  const [biz] = await db
    .select()
    .from(business)
    .where(eq(business.id, businessId))
    .limit(1);

  if (!biz) {
    console.error(`[Flutterwave] Business ${businessId} not found`);
    return NextResponse.json({ status: "skipped", reason: "business not found" });
  }

  // Don't double-provision
  const existingNumbers = await db
    .select()
    .from(phoneNumber)
    .where(eq(phoneNumber.businessId, businessId));

  if (existingNumbers.length > 0) {
    console.log(`[Flutterwave] Business ${businessId} already has ${existingNumbers.length} phone(s)`);
    return NextResponse.json({
      status: "skipped",
      reason: "already provisioned",
      phoneCount: existingNumbers.length,
    });
  }

  // ── Auto-provision phone number ───────────────────────────
  try {
    const serverUrl = `https://ai-business-os-six.vercel.app/api/voice/vapi/${biz.vapiWebhookToken}`;

    // Buy a number from Vapi's pool
    const vapiNumber = await buyPhoneNumber({});

    // Configure it with the business's server URL
    await createPhoneNumber({
      number: vapiNumber.number,
      name: `${biz.name || "Business"} Voice Line`,
      serverUrl,
      serverUrlSecret: process.env.VAPI_WEBHOOK_SECRET || "",
    });

    // Save to our database
    const recordId = generateId();
    await db.insert(phoneNumber).values({
      id: recordId,
      businessId,
      vapiPhoneNumberId: vapiNumber.id,
      number: vapiNumber.number,
      serverUrl,
      provider: vapiNumber.provider,
    });

    // Mark business as voice-ready
    await db
      .update(business)
      .set({ voiceSetupReady: true })
      .where(eq(business.id, businessId));

    console.log(
      `[Flutterwave] Provisioned ${vapiNumber.number} for business ${businessId}`
    );

    return NextResponse.json({
      status: "provisioned",
      businessId,
      phoneNumber: vapiNumber.number,
    });
  } catch (error: any) {
    console.error(`[Flutterwave] Provisioning failed for ${businessId}:`, error?.message);
    return NextResponse.json(
      { status: "error", error: error?.message },
      { status: 200 } // Never 5xx — Flutterwave would retry
    );
  }
}
