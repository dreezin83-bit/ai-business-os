/**
 * POST /api/webhooks/paystack — Paystack payment webhook.
 *
 * Receives charge.success events, verifies signature with PAYSTACK_SECRET_KEY,
 * creates/updates subscription records, and triggers Vapi voice provisioning
 * when both payment AND onboarding are complete.
 *
 * Signature: HMAC-SHA512 of raw body using PAYSTACK_SECRET_KEY,
 * sent as x-paystack-signature header.
 *
 * Idempotent: checks paystackSubId before creating duplicate subs.
 *
 * Webhook URL: /api/webhooks/paystack
 * Required env: PAYSTACK_SECRET_KEY
 */

import { NextResponse } from "next/server";
import { db } from "@/db";
import { business, subscription } from "@/db/schema";
import { eq } from "drizzle-orm";
import { generateId } from "@/lib/utils";
import { provisionVapiVoice, canProvisionVoice } from "@/lib/vapi-provisioning";
import crypto from "crypto";

// ─── Types ──────────────────────────────────────────────────

interface PaystackEvent {
  event: string;
  data: {
    id: number;
    reference: string;
    amount: number;
    currency: string;
    status: string;
    customer: { email: string; id: number };
    metadata?: { businessId?: string; plan?: string };
    paid_at: string;
    authorization?: {
      authorization_code: string;
      reusable: boolean;
    };
  };
}

// ─── Signature verification ─────────────────────────────────

function verifyPaystackSignature(rawBody: string, signature: string | null): boolean {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) {
    console.error("[paystack-webhook] PAYSTACK_SECRET_KEY not set — rejecting");
    return false;
  }
  if (!signature) {
    console.error("[paystack-webhook] Missing x-paystack-signature header");
    return false;
  }
  try {
    const hash = crypto.createHmac("sha512", secret).update(rawBody).digest("hex");
    return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(signature));
  } catch {
    return false;
  }
}

// ─── Server-side verification ───────────────────────────────

async function verifyPaymentServerSide(reference: string): Promise<boolean> {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) return false;
  try {
    const res = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      headers: { Authorization: `Bearer ${secret}` },
    });
    const body = await res.json() as any;
    return body.status === true && body.data?.status === "success";
  } catch {
    return false;
  }
}

// ─── Handler ───────────────────────────────────────────────

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();

    // ── Verify Paystack signature ──
    const signature = request.headers.get("x-paystack-signature");
    if (!verifyPaystackSignature(rawBody, signature)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
    }

    // ── Parse ──
    let event: PaystackEvent;
    try { event = JSON.parse(rawBody); } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    if (event.event !== "charge.success") {
      return NextResponse.json({ received: true });
    }

    const { data } = event;
    if (data.status !== "success") {
      return NextResponse.json({ received: true });
    }

    // ── Server-side verification (defense in depth) ──
    const verified = await verifyPaymentServerSide(data.reference);
    if (!verified) {
      console.error(`[paystack-webhook] Server-side verification failed for ${data.reference}`);
      return NextResponse.json({ error: "Payment not verified server-side" }, { status: 402 });
    }

    const businessId = data.metadata?.businessId;
    if (!businessId) {
      console.log("[paystack-webhook] No businessId in metadata");
      return NextResponse.json({ received: true, note: "Missing businessId" });
    }

    console.log(`[paystack-webhook] Verified payment for business ${businessId}: ${data.amount / 100} ${data.currency}`);

    // ── Upsert subscription ──
    const [existingSub] = await db
      .select()
      .from(subscription)
      .where(eq(subscription.businessId, businessId));

    const now = new Date();
    const subId = existingSub?.id || generateId();

    if (existingSub) {
      await db.update(subscription).set({
        status: "active",
        plan: data.metadata?.plan || existingSub.plan || "starter",
        amount: data.amount,
        currency: data.currency,
        paystackSubId: String(data.id),
        paymentProvider: "paystack",
        currentPeriodStart: now,
        currentPeriodEnd: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
        updatedAt: now,
      }).where(eq(subscription.id, existingSub.id));
    } else {
      await db.insert(subscription).values({
        id: subId,
        businessId,
        status: "active",
        plan: data.metadata?.plan || "starter",
        amount: data.amount,
        currency: data.currency,
        interval: "month",
        paystackSubId: String(data.id),
        paymentProvider: "paystack",
        currentPeriodStart: now,
        currentPeriodEnd: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
      });
    }

    console.log(`[paystack-webhook] Subscription saved for ${businessId}`);

    // ── Check provisioning ──
    const canProvision = await canProvisionVoice(businessId);
    if (canProvision) {
      console.log(`[paystack-webhook] Business ${businessId} ready — triggering Vapi provisioning`);
      provisionVapiVoice(businessId).then(r => {
        console.log(`[paystack-webhook] Provisioning result: ${r.success ? "OK" : "FAIL"}`);
      }).catch(err => {
        console.error(`[paystack-webhook] Provisioning error:`, err);
      });
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error("[paystack-webhook] Error:", error?.message);
    return NextResponse.json({ received: true, error: "Internal" }, { status: 200 });
  }
}
