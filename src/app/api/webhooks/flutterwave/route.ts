/**
 * Flutterwave Webhook Handler
 *
 * Listens for charge.completed events and triggers Vapi auto-setup
 * (phone number purchase + assistant creation) for new contractors.
 *
 * Flutterwave docs: https://developer.flutterwave.com/reference/webhooks
 *
 * Required env vars:
 *   FLUTTERWAVE_SECRET_HASH — from your Flutterwave dashboard > Settings > Webhooks
 *
 * Middleware: /api/webhooks(.*) is already public in src/middleware.ts
 */

import { NextResponse } from "next/server";
import { autoSetupVapi } from "@/lib/vapi-auto-setup";

/** Verify the webhook signature using Flutterwave's verif-hash header */
function verifySignature(request: Request): boolean {
  const secretHash = process.env.FLUTTERWAVE_SECRET_HASH;
  if (!secretHash) {
    console.warn("[Flutterwave] FLUTTERWAVE_SECRET_HASH not set — accepting all webhooks (insecure)");
    return true;
  }

  const verifHash = request.headers.get("verif-hash") || "";
  if (verifHash !== secretHash) {
    console.error("[Flutterwave] Invalid verif-hash signature");
    return false;
  }

  return true;
}

export async function POST(request: Request) {
  // Verify signature
  if (!verifySignature(request)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  try {
    const payload = await request.json();
    const event = payload.event || payload["event.type"];
    const data = payload.data || {};

    console.log(`[Flutterwave] Event: ${event}, tx_ref: ${data.tx_ref || "N/A"}`);

    // Only handle successful charge events
    if (event !== "charge.completed") {
      return NextResponse.json({ status: "ignored", event }, { status: 200 });
    }

    // Verify the charge was successful
    if (data.status !== "successful") {
      console.log(`[Flutterwave] Charge not successful: status=${data.status}`);
      return NextResponse.json({ status: "skipped", reason: "charge not successful" });
    }

    // Extract business ID from metadata
    const meta = data.meta || {};
    const businessId = meta.businessId || data.meta?.business_id;

    if (!businessId) {
      console.log("[Flutterwave] No businessId in metadata — skipping auto-setup");
      return NextResponse.json({ status: "skipped", reason: "no businessId" });
    }

    console.log(`[Flutterwave] Triggering Vapi auto-setup for business ${businessId}`);

    // Fire-and-forget: don't block the webhook response
    autoSetupVapi(businessId)
      .then((result) => {
        if (result.success) {
          console.log(
            `[Flutterwave] Auto-setup complete for ${businessId}: phone=${result.phoneNumber}`
          );
        } else {
          console.error(
            `[Flutterwave] Auto-setup failed for ${businessId}: ${result.error}`
          );
        }
      })
      .catch((err) => {
        console.error(`[Flutterwave] Auto-setup error:`, err);
      });

    return NextResponse.json({
      status: "received",
      businessId,
      action: "auto-setup-triggered",
    });
  } catch (error: any) {
    console.error("[Flutterwave] Webhook error:", error?.message);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 200 }
    );
  }
}
