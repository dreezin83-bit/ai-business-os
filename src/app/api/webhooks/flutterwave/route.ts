/**
 * POST /api/webhooks/flutterwave — Flutterwave payment webhook (THE live path).
 *
 * Handles the subscribe-first checkout: on a successful $399 setup charge,
 *  1. verifies verif-hash (fail closed) + server-verifies the transaction,
 *  2. creates/finds the business from signup metadata,
 *  3. enrolls the customer in the $199/mo payment plan (start_date +31d —
 *     Reading-A deferral keeps month 1 = $399; nothing extra is charged),
 *  4. persists the local subscription (flutterwaveSubId, paymentProvider
 *     "flutterwave", amount = RECURRING_CENTS),
 *  5. opens the monthly credit period (fire-and-forget, idempotent),
 *  6. provisions Vapi voice once onboarding is complete (fire-and-forget).
 *
 * Idempotent: flutterwaveSubId dedup + IF NOT EXISTS semantics everywhere.
 * Tenant-isolated: businessId resolved from signup email metadata (or legacy
 * meta.businessId).
 *
 * Security: valid verif-hash required (FLUTTERWAVE_WEBHOOK_SECRET). Never
 * returns 5xx — Flutterwave retries on failure, and we prefer a clean ack.
 *
 * Required env: FLUTTERWAVE_SECRET_KEY, FLUTTERWAVE_WEBHOOK_SECRET
 */
import { NextResponse } from "next/server";
import { db } from "@/db";
import { aiBrainConfig, business, subscription } from "@/db/schema";
import { eq } from "drizzle-orm";
import { generateId } from "@/lib/utils";
import { openCreditPeriod } from "@/lib/credits";
import {
  createFlutterwaveSubscription,
  CURRENCY,
  ensurePaymentPlan,
  majorToCents,
  RECURRING_CENTS,
  shouldSkipRecurringEnrollment,
  type SignupMetadata,
  verifyFlutterwaveSignature,
  verifyFlutterwaveTransaction,
} from "@/lib/flutterwave";
import { canProvisionVoice, provisionVapiVoice } from "@/lib/vapi-provisioning";
import { recordTimelineEvent } from "@/lib/timeline";

const FW_WEBHOOK_SECRET = process.env.FLUTTERWAVE_WEBHOOK_SECRET;

// ─── Extract signup metadata ─────────────────────────────────────
function extractSignupMetadata(data: any): SignupMetadata | null {
  const m = data.meta;
  if (!m?.signupEmail) return null;
  return {
    signupEmail: String(m.signupEmail || ""),
    signupName: String(m.signupName || ""),
    signupCompany: String(m.signupCompany || ""),
    plan: m.plan === "professional" ? "professional" : "starter",
  };
}

// ─── Create business from signup ────────────────────────────────
async function findOrCreateBusiness(
  signup: SignupMetadata,
  chargeId: number | string,
): Promise<string> {
  // 1. Look up by email
  const [existing] = await db
    .select()
    .from(business)
    .where(eq(business.email, signup.signupEmail))
    .limit(1);
  if (existing) {
    console.log(
      `[flutterwave-webhook] Business found for ${signup.signupEmail}: ${existing.id}`,
    );
    return existing.id;
  }
  // 2. Create new business (subscribe-first — ownerId = email until Clerk signup)
  const bizId = generateId();
  console.log(
    `[flutterwave-webhook] Creating business for ${signup.signupEmail} (charge ${chargeId}): ${bizId}`,
  );
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

// ─── Handler ─────────────────────────────────────────────────────
export async function POST(request: Request) {
  try {
    // ── Verify verif-hash (webhook secret hash) — fail closed ──
    const verifHash = request.headers.get("verif-hash");
    if (!(await verifyFlutterwaveSignature(verifHash, FW_WEBHOOK_SECRET))) {
      console.warn("[flutterwave-webhook] Invalid verif-hash — rejecting");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    // ── Parse payload ──
    let payload: any;
    try {
      payload = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
    const event = payload.event;
    const data = payload.data || {};

    // ── Gate on event + status ──
    // Only successful $399 setup charges drive account creation. Renewal
    // charges (plan payments) carry no signup metadata — they are logged and
    // skipped here (known gap, tracked: period extension/churn on renewals).
    if (event !== "charge.completed") {
      console.log(
        `[flutterwave-webhook] Ignoring event ${event} (tx_ref: ${data.tx_ref || "n/a"})`,
      );
      return NextResponse.json({ received: true, event });
    }
    if (data.status !== "successful") {
      console.log(
        `[flutterwave-webhook] Charge not successful: status=${data.status} (tx_ref: ${data.tx_ref || "n/a"})`,
      );
      return NextResponse.json({ received: true, note: "not successful" });
    }

    console.log(
      `[flutterwave-webhook] Verified signature — charge.completed tx_ref: ${data.tx_ref}, amount: ${majorToCents(data.amount) / 100} ${data.currency || "USD"}`,
    );

    // ── Server-side verification (defense in depth) ──
    const verified = await verifyFlutterwaveTransaction(data.tx_ref);
    if (!verified) {
      console.error(
        `[flutterwave-webhook] Server-side verification failed for ${data.tx_ref}`,
      );
      return NextResponse.json(
        { error: "Payment not verified server-side" },
        { status: 402 },
      );
    }

    // ── Resolve business ──
    const signup = extractSignupMetadata(data);
    let businessId: string;

    if (signup) {
      // Subscribe-first flow: create or find business from signup metadata
      businessId = await findOrCreateBusiness(signup, data.id ?? data.tx_ref);
    } else {
      // Legacy flow: businessId in payment metadata
      const meta = data.meta || {};
      businessId = meta.businessId || meta.business_id || null;
      if (!businessId) {
        console.log(
          `[flutterwave-webhook] No signup metadata or businessId — skipping (likely a renewal charge for an existing plan)`,
        );
        return NextResponse.json({
          received: true,
          note: "Missing businessId",
        });
      }
    }

    // ── Recurring enrollment ($199/mo via payment plan) ──
    let flutterwaveSubscriptionId: number | null = null;
    let subscriptionFailed = false;

    // Read the local subscription FIRST. If this business already holds a
    // Flutterwave enrollment link, NEVER re-enroll: a retried webhook (lost
    // 200/202 ack after fulfillment) must not create a second plan
    // subscription — that would double up the month-2 $199 charges. The
    // pre-check makes the entire fulfill path idempotent for retries.
    const [existingSub] = await db
      .select()
      .from(subscription)
      .where(eq(subscription.businessId, businessId));
    const existingFlutterwaveSubId = existingSub?.flutterwaveSubId ?? null;

    if (shouldSkipRecurringEnrollment(existingFlutterwaveSubId)) {
      flutterwaveSubscriptionId = Number(existingFlutterwaveSubId);
      console.log(
        `[flutterwave-webhook] Subscription ${existingFlutterwaveSubId} already recorded for ${businessId} — skipping enrollment (idempotent retry)`,
      );
    } else {
      // Record the setup payment on the timeline (billing milestone).
      await recordTimelineEvent({
        businessId,
        scope: "billing",
        event: "setup_payment_received",
        detail: `${(majorToCents(data.amount) / 100).toFixed(2)} setup payment captured (charge ${data.id}, tx_ref: ${data.tx_ref})`,
        status: "success",
      });

      const customerEmail = verified.customer?.email || data.customer?.email || "";
      if (customerEmail) {
        try {
          const plan = await ensurePaymentPlan();
          const externalRef = `sub-${businessId}-${data.id ?? Date.now()}`;
          const sub = await createFlutterwaveSubscription(
            customerEmail,
            plan.id,
            externalRef,
          );
          flutterwaveSubscriptionId = sub.id;
          console.log(
            `[flutterwave-webhook] Flutterwave subscription created: ${flutterwaveSubscriptionId} for business ${businessId}`,
          );
          await recordTimelineEvent({
            businessId,
            scope: "billing",
            event: "subscription_created",
            detail: `Flutterwave recurring plan $199/month enrolled (subscription ${flutterwaveSubscriptionId}); first plan charge deferred by plan start_date`,
            status: "success",
          });
        } catch (err: any) {
          console.error(
            `[flutterwave-webhook] Failed to create Flutterwave subscription: ${err?.message}`,
          );
          subscriptionFailed = true;
          await recordTimelineEvent({
            businessId,
            scope: "billing",
            event: "subscription_creation_failed",
            detail: `Setup payment captured but recurring enrollment failed: ${(err as any)?.message || "unknown error"}`,
            status: "failed",
          });
          // One-time $399 succeeded but recurring setup failed. Return 202 to
          // flag the partial state — Flutterwave won't retry, but the business
          // is marked as "pending_subscription" for manual/retry.
        }
      } else {
        console.error(
          "[flutterwave-webhook] No customer email on verified charge — skipping enrollment",
        );
        subscriptionFailed = true;
      }
    }

    // ── Upsert local subscription ──
    const now = new Date();
    const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    // Only mark active if the Flutterwave enrollment was actually created.
    // If it failed, persist as "pending_subscription" — won't pass the
    // provisioning gate, and can be retried from an admin endpoint.
    const subStatus = subscriptionFailed ? "pending_subscription" : "active";

    // Idempotent upsert: refresh the existing row on retries, insert once.
    // Post-upsert dedup guard (kept per review, defense in depth alongside the
    // pre-enrollment guard): if the enrollment id we resolved is already what
    // the stored row holds — idempotent retry of an already-fulfilled charge —
    // skip the write entirely so the stored flutterwaveSubId stays stable.
    if (
      flutterwaveSubscriptionId &&
      existingSub?.flutterwaveSubId === String(flutterwaveSubscriptionId)
    ) {
      console.log(
        `[flutterwave-webhook] Subscription ${flutterwaveSubscriptionId} already recorded — skipping upsert`,
      );
    } else if (existingSub) {
      await db
        .update(subscription)
        .set({
          status: subStatus,
          plan: (data.meta?.plan as string) || existingSub.plan || "starter",
          amount: RECURRING_CENTS, // $199/mo recurring (NOT the $399 setup charge)
          currency: (data.currency || CURRENCY).toUpperCase(),
          flutterwaveSubId:
            flutterwaveSubscriptionId != null
              ? String(flutterwaveSubscriptionId)
              : existingSub.flutterwaveSubId,
          paymentProvider: "flutterwave",
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
        plan: (data.meta?.plan as string) || "starter",
        amount: RECURRING_CENTS, // $199/mo recurring
        currency: (data.currency || CURRENCY).toUpperCase(),
        interval: "month",
        flutterwaveSubId:
          flutterwaveSubscriptionId != null
            ? String(flutterwaveSubscriptionId)
            : undefined,
        paymentProvider: "flutterwave",
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
      });
    }
    console.log(
      `[flutterwave-webhook] Local subscription saved for ${businessId} (status: ${subStatus})`,
    );

    // ── Open/refresh the tenant credit period (auto-grants monthly_included, idempotent) ──
    // Fire-and-forget: never blocks the Flutterwave ack. openCreditPeriod
    // dedupes on (reason, external_reference).
    openCreditPeriod(businessId, now, periodEnd).catch((err) => {
      console.error(
        `[flutterwave-webhook] openCreditPeriod error for ${businessId}:`,
        err?.message,
      );
    });

    // ── On subscription failure, return 202 Accepted ──
    if (subscriptionFailed) {
      return NextResponse.json(
        {
          received: true,
          status: "partial",
          detail:
            "Setup payment captured; recurring enrollment failed. Retry pending.",
        },
        { status: 202 },
      );
    }

    // ── Check Vapi provisioning ──
    const canProvision = await canProvisionVoice(businessId);
    if (canProvision) {
      console.log(
        `[flutterwave-webhook] Business ${businessId} ready — triggering Vapi provisioning`,
      );
      provisionVapiVoice(businessId)
        .then((r) => {
          console.log(
            `[flutterwave-webhook] Provisioning result: ${r.success ? "OK" : "FAIL"}`,
          );
        })
        .catch((err) => {
          console.error(`[flutterwave-webhook] Provisioning error:`, err);
        });
    } else {
      console.log(
        `[flutterwave-webhook] Business ${businessId} not ready for provisioning (onboarding incomplete or no active sub)`,
      );
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error("[flutterwave-webhook] Error:", error?.message);
    // Always return 200 to Flutterwave — never expose internal errors
    return NextResponse.json({ received: true, error: "Internal" }, { status: 200 });
  }
}