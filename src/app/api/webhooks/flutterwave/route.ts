/**
 * Flutterwave Payment Webhook — DISABLED.
 *
 * Owner has switched to Paystack. This endpoint returns 410 Gone.
 * New payments should use /api/paystack/checkout and the Paystack webhook.
 */

import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: "Flutterwave is no longer supported — use Paystack" },
    { status: 410 }
  );
}

// Dead code below preserved for reference
/*
import { NextResponse } from "next/server";
import { db } from "@/db";
import { business, subscription } from "@/db/schema";
import { eq } from "drizzle-orm";
import { generateId } from "@/lib/utils";
import { provisionVapiVoice, canProvisionVoice } from "@/lib/vapi-provisioning";
import crypto from "crypto";

// ─── Types ──────────────────────────────────────────────────

interface FlutterwaveWebhookPayload {
  event: string;
  data: {
    id: number;
    tx_ref: string;
    amount: number;
    currency: string;
    status: string;
    customer: {
      email: string;
      name?: string;
    };
    meta?: {
      businessId?: string;
      plan?: string;
    };
    created_at: string;
  };
}

// ─── Signature verification ─────────────────────────────────

function verifyFlutterwaveSignature(payload: string, signature: string): boolean {
  const secret = process.env.FLUTTERWAVE_WEBHOOK_SECRET;
  if (!secret) {
    console.warn("[flutterwave] FLUTTERWAVE_WEBHOOK_SECRET not set — skipping signature check");
    return true;
  }

  try {
    const hash = crypto.createHmac("sha256", secret).update(payload).digest("hex");
    return hash === signature;
  } catch {
    return false;
  }
}

// ─── Handler ───────────────────────────────────────────────

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();

    // ── Verify signature ──
    const signature = request.headers.get("verif-hash") || "";
    if (!verifyFlutterwaveSignature(rawBody, signature)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
    }

    // ── Parse payload ──
    let payload: FlutterwaveWebhookPayload;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    // Only process charge.completed events
    if (payload.event !== "charge.completed") {
      console.log(`[flutterwave] Ignoring event: ${payload.event}`);
      return NextResponse.json({ received: true });
    }

    const { data } = payload;
    if (data.status !== "successful") {
      console.log(`[flutterwave] Payment not successful: ${data.status}`);
      return NextResponse.json({ received: true });
    }

    const businessId = data.meta?.businessId;
    if (!businessId) {
      console.log(`[flutterwave] No businessId in meta — cannot link payment`);
      return NextResponse.json({ received: true, note: "Missing businessId in meta" });
    }

    console.log(`[flutterwave] Payment confirmed for business ${businessId} — amount=${data.amount} ${data.currency}`);

    // ── Upsert subscription ──
    const [existingSub] = await db
      .select()
      .from(subscription)
      .where(eq(subscription.businessId, businessId));

    const now = new Date();
    const subId = existingSub?.id || generateId();

    if (existingSub) {
      await db
        .update(subscription)
        .set({
          status: "active",
          plan: data.meta?.plan || existingSub.plan || "starter",
          amount: data.amount,
          currency: data.currency,
          flutterwaveSubId: String(data.id),
          currentPeriodStart: now,
          currentPeriodEnd: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000), // +30 days
          updatedAt: now,
        })
        .where(eq(subscription.id, existingSub.id));
    } else {
      await db.insert(subscription).values({
        id: subId,
        businessId,
        status: "active",
        plan: data.meta?.plan || "starter",
        amount: data.amount,
        currency: data.currency,
        interval: "month",
        flutterwaveSubId: String(data.id),
        currentPeriodStart: now,
        currentPeriodEnd: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
      });
    }

    console.log(`[flutterwave] Subscription ${existingSub ? "updated" : "created"} for business ${businessId}`);

    // ── Check if we can provision voice ──
    const canProvision = await canProvisionVoice(businessId);
    if (canProvision) {
      console.log(`[flutterwave] Business ${businessId} ready for voice provisioning — triggering...`);
      // Fire-and-forget: don't block the webhook response
      provisionVapiVoice(businessId)
        .then((result) => {
          console.log(`[flutterwave] Provisioning result for ${businessId}: ${result.success ? "SUCCESS" : "FAILED"}`);
          if (!result.success) {
            console.error(`[flutterwave] Provisioning error: ${result.error}`);
          }
        })
        .catch((err) => {
          console.error(`[flutterwave] Provisioning threw:`, err);
        });
    } else {
      console.log(`[flutterwave] Business ${businessId} not yet ready for provisioning (onboarding incomplete?)`);
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error("[flutterwave] Error:", error?.message);
    return NextResponse.json({ received: true, error: "Internal error" }, { status: 200 });
  }
}
*/
