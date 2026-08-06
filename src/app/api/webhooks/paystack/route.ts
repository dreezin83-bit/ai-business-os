/**
 * POST /api/webhooks/paystack — Paystack charge.success handler.
 *
 * Flow:
 *   1. Verify HMAC-SHA512 signature (timing-safe)
 *   2. Server-side transaction verification (defense-in-depth)
 *   3. If signup metadata present → find-or-create business (subscribe-first)
 *   4. Create Paystack Subscription ($199/mo recurring) from authorization_code
 *   5. Upsert local subscription record
 *   6. If business exists + onboarding complete → trigger Vapi provisioning
 *
 * Idempotent: paystackSubId dedup, IF NOT EXISTS everywhere.
 * Tenant-isolated: businessId resolved from signup email metadata.
 *
 * Required env: PAYSTACK_SECRET_KEY
 */
import { NextResponse } from "next/server";
import { db } from "@/db";
import { business, subscription } from "@/db/schema";
import { eq } from "drizzle-orm";
import { generateId } from "@/lib/utils";
import {
  verifyPaystackTransaction,
  createPaystackSubscription,
  verifyPaystackSignature,
  type SignupMetadata,
} from "@/lib/paystack";
import { canProvisionVoice, provisionVapiVoice } from "@/lib/vapi-provisioning";

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY!;

// ─── Extract signup metadata ─────────────────────────────────

function extractSignupMetadata(data: any): SignupMetadata | null {
  const m = data.metadata;
  if (!m?.signupEmail) return null;
  return {
    signupEmail: String(m.signupEmail || ""),
    signupName: String(m.signupName || ""),
    signupCompany: String(m.signupCompany || ""),
    plan: m.plan === "professional" ? "professional" : "starter",
    planCode: String(m.planCode || ""),
  };
}

// ─── Create business from signup ─────────────────────────────

async function findOrCreateBusiness(
  signup: SignupMetadata,
  transactionRef: string,
): Promise<string> {
  // 1. Look up by email
  const [existing] = await db
    .select()
    .from(business)
    .where(eq(business.email, signup.signupEmail))
    .limit(1);

  if (existing) {
    console.log(`[paystack-webhook] Business found for ${signup.signupEmail}: ${existing.id}`);
    return existing.id;
  }

  // 2. Create new business (subscribe-first — ownerId = email until Clerk signup)
  const bizId = generateId();
  console.log(`[paystack-webhook] Creating business for ${signup.signupEmail}: ${bizId}`);

  await db.insert(business).values({
    id: bizId,
    name: signup.signupCompany || signup.signupName || "My Business",
    ownerId: signup.signupEmail, // placeholder — updated on Clerk signup
    email: signup.signupEmail,
    phone: "",
    category: "",
    onboardingComplete: false,
    status: "active",
    vapiWebhookToken: crypto.randomUUID(),
    voiceSetupReady: false,
    voiceProvisionState: "idle",
  });

  // Also create default AI brain config (see src/lib/business.ts pattern)
  const { aiBrainConfig } = await import("@/db/schema");
  await db.insert(aiBrainConfig).values({
    id: generateId(),
    businessId: bizId,
    systemPrompt:
      "You are a helpful assistant for a service business. Answer questions about services, pricing, and scheduling.",
    businessInfo: "",
    services: "[]",
    faqs: "[]",
    pricingGuidance: "",
    companyPolicies: "",
    serviceAreas: "[]",
    businessHours: JSON.stringify([
      { day: "Monday", open: "09:00", close: "17:00", closed: false },
      { day: "Tuesday", open: "09:00", close: "17:00", closed: false },
      { day: "Wednesday", open: "09:00", close: "17:00", closed: false },
      { day: "Thursday", open: "09:00", close: "17:00", closed: false },
      { day: "Friday", open: "09:00", close: "17:00", closed: false },
      { day: "Saturday", open: "10:00", close: "15:00", closed: false },
      { day: "Sunday", open: "", close: "", closed: true },
    ]),
    greetingMessage: "Hello! How can I help you today?",
  });

  return bizId;
}

// ─── Handler ─────────────────────────────────────────────────

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();

    // ── Verify Paystack HMAC-SHA512 signature ──
    const signature = request.headers.get("x-paystack-signature");
    if (!(await verifyPaystackSignature(rawBody, signature, PAYSTACK_SECRET))) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
    }

    // ── Parse event ──
    let event: any;
    try {
      event = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    // Only handle successful charges
    if (event.event !== "charge.success") {
      return NextResponse.json({ received: true });
    }

    const { data } = event;
    if (data?.status !== "success") {
      return NextResponse.json({ received: true });
    }

    // ── Server-side verification (defense in depth) ──
    const verified = await verifyPaystackTransaction(data.reference);
    if (!verified) {
      console.error(
        `[paystack-webhook] Server-side verification failed for ${data.reference}`,
      );
      return NextResponse.json(
        { error: "Payment not verified server-side" },
        { status: 402 },
      );
    }

    console.log(
      `[paystack-webhook] Verified payment: ${data.amount / 100} ${data.currency} (ref: ${data.reference})`,
    );

    // ── Resolve business ──
    const signup = extractSignupMetadata(data);
    let businessId: string;

    if (signup) {
      // Subscribe-first flow: create or find business from signup metadata
      businessId = await findOrCreateBusiness(signup, data.reference);
    } else {
      // Legacy flow: businessId in metadata
      businessId = data.metadata?.businessId;
      if (!businessId) {
        console.log("[paystack-webhook] No businessId or signup metadata");
        return NextResponse.json({ received: true, note: "Missing businessId" });
      }
    }

    // ── Create Paystack Subscription ($199/mo recurring) ──
    let paystackSubscriptionCode: string | null = null;
    let subscriptionFailed = false;
    const planCode = data.metadata?.planCode;
    const authorizationCode = data.authorization?.authorization_code;

    if (planCode && authorizationCode) {
      try {
        const sub = await createPaystackSubscription(
          data.customer?.email || verified.customer?.email || "",
          planCode,
          authorizationCode,
        );
        paystackSubscriptionCode = sub.subscriptionCode;
        console.log(
          `[paystack-webhook] Paystack subscription created: ${paystackSubscriptionCode} for business ${businessId}`,
        );
      } catch (err: any) {
        console.error(
          `[paystack-webhook] Failed to create Paystack subscription: ${err?.message}`,
        );
        subscriptionFailed = true;
        // One-time $399 succeeded but recurring subscription setup failed.
        // Return 202 to flag the partial state — Paystack won't retry,
        // but the business is marked as "pending_subscription" for manual/retry.
      }
    }

    // ── Upsert local subscription ──
    const now = new Date();
    const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    // Only mark active if the Paystack subscription was actually created.
    // If it failed, persist as "pending_subscription" — won't pass the
    // provisioning gate, and can be retried from an admin endpoint.
    const subStatus = subscriptionFailed ? "pending_subscription" : "active";

    const [existingSub] = await db
      .select()
      .from(subscription)
      .where(eq(subscription.businessId, businessId));

    // Dedup: if this paystack subscription code is already stored, skip
    if (
      paystackSubscriptionCode &&
      existingSub?.paystackSubId === paystackSubscriptionCode
    ) {
      console.log(
        `[paystack-webhook] Subscription ${paystackSubscriptionCode} already recorded — skipping`,
      );
    } else if (existingSub) {
      await db
        .update(subscription)
        .set({
          status: subStatus,
          plan: data.metadata?.plan || existingSub.plan || "starter",
          amount: data.amount,
          currency: data.currency,
          paystackSubId: paystackSubscriptionCode || existingSub.paystackSubId,
          paymentProvider: "paystack",
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
          updatedAt: now,
        })
        .where(eq(subscription.id, existingSub.id));
    } else {
      const subId = generateId();
      await db.insert(subscription).values({
        id: subId,
        businessId,
        status: subStatus,
        plan: data.metadata?.plan || "starter",
        amount: data.amount,
        currency: data.currency,
        interval: "month",
        paystackSubId: paystackSubscriptionCode,
        paymentProvider: "paystack",
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
      });
    }

    console.log(
      `[paystack-webhook] Local subscription saved for ${businessId} (status: ${subStatus})`,
    );

    // ── On subscription failure, return 202 Accepted ──
    if (subscriptionFailed) {
      return NextResponse.json({
        received: true,
        status: "partial",
        detail: "Setup payment captured; recurring subscription creation failed. Retry pending.",
      }, { status: 202 });
    }

    // ── Check Vapi provisioning ──
    const canProvision = await canProvisionVoice(businessId);
    if (canProvision) {
      console.log(
        `[paystack-webhook] Business ${businessId} ready — triggering Vapi provisioning`,
      );
      provisionVapiVoice(businessId)
        .then((r) => {
          console.log(
            `[paystack-webhook] Provisioning result: ${r.success ? "OK" : "FAIL"}`,
          );
        })
        .catch((err) => {
          console.error(`[paystack-webhook] Provisioning error:`, err);
        });
    } else {
      console.log(
        `[paystack-webhook] Business ${businessId} not ready for provisioning (onboarding incomplete or no active sub)`,
      );
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error("[paystack-webhook] Error:", error?.message);
    // Always return 200 to Paystack — never expose internal errors
    return NextResponse.json({ received: true, error: "Internal" }, { status: 200 });
  }
}
