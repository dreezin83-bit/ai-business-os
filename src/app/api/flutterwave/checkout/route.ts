/**
 * POST /api/flutterwave/checkout — Subscribe-first Flutterwave checkout.
 *
 * NO AUTHENTICATION REQUIRED. The user pays BEFORE creating an account.
 *
 * Body: { email, name, companyName?, plan?, cadence? }
 *   cadence: "monthly" (default) | "semiannual" | "annual" — maps to the
 *   landing's three plans and drives the charge amount below.
 *
 * Flow:
 *   1. Ensure the chosen cadence's Flutterwave payment plan exists (idempotent;
 *      monthly + annual only — 6 Months has no native FW interval)
 *   2. Initialize ONE charge for the cadence's full amount ($199 / $1,194 /
 *      $2,268) — no setup fee, no first-month premium. Monthly and annual
 *      attach the plan (payment_plan) so this charge IS the plan's first
 *      payment; 6 Months stands alone and grants a 180-day window.
 *   3. Embed signup metadata (incl. cadence) so the webhook can create the
 *      account and record the same amount for the next cycle.
 *   4. Return redirect_url for the client-side redirect (Flutterwave hosted page).
 *
 * Pricing (owner-ratified 2026-10-24, per-plan terms):
 *   Monthly $199.00 · 6 Months $1,194.00 · Yearly $2,268.00; list $299/mo
 *   dormant. Currency: USD. Flutterwave v3 amounts are in MAJOR units.
 *
 * Required env: FLUTTERWAVE_SECRET_KEY, NEXT_PUBLIC_APP_URL
 */
import { NextResponse } from "next/server";
import {
  BILLING_OPTIONS,
  billingRefPrefix,
  CURRENCY,
  ensurePaymentPlan,
  resolveBillingCadence,
} from "@/lib/flutterwave";
import { initializePayment } from "@/lib/flutterwave-client";
import { APP_URL } from "@/lib/domains";

export async function POST(request: Request) {
  // ── Parse body ────────────────────────────────────────────────
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const email = String(body.email || "").trim();
  const name = String(body.name || "").trim();
  const companyName = String(body.companyName || "").trim();
  const plan = (body.plan === "professional" ? "professional" : "starter") as
    | "starter"
    | "professional";
  // Chosen cadence drives the charge amount (Monthly default — matches the
  // dashboard's current modal; 6-Month/Yearly are opt-in).
  const cadence = resolveBillingCadence(body.cadence);
  const option = BILLING_OPTIONS[cadence];
  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  // ── Validate env ──────────────────────────────────────────────
  if (!process.env.FLUTTERWAVE_SECRET_KEY) {
    return NextResponse.json(
      { error: "Payment provider not configured" },
      { status: 503 },
    );
  }
  if (!process.env.NEXT_PUBLIC_APP_URL) {
    return NextResponse.json(
      { error: "App URL not configured" },
      { status: 503 },
    );
  }

  try {
    // ── Ensure the cadence's payment plan exists (idempotent) ──
    // Monthly + annual have native FW plans (this checkout attaches them as
    // payment_plan so the charge IS the plan's first payment). 6 Months has no
    // native FW interval — ensurePaymentPlan returns null and the charge stands
    // alone, granting a 180-day access window.
    const attachedPlan = option.fwPlan
      ? await ensurePaymentPlan(cadence)
      : null;

    // ── Build signup metadata ───────────────────────────────────
    const meta: Record<string, unknown> = {
      signupEmail: email,
      signupName: name,
      signupCompany: companyName,
      plan,
      cadence,
    };

    // ── Initialize the cadence's period-1 charge ────────────────
    // redirect_url follows APP_URL: single host today, app subdomain once
    // the split activates (NEXT_PUBLIC_APP_URL = app.sagenifyai.com).
    const redirectUrl = `${APP_URL}/onboarding?payment=done`;
    const checkoutUrl = await initializePayment({
      tx_ref: `${billingRefPrefix(cadence)}-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`,
      amount: option.major, // cadence amount in major units (199 / 1194 / 2268)
      currency: CURRENCY,
      redirect_url: redirectUrl,
      customer: { email, name },
      meta,
      payment_options: "card",
      paymentPlan: attachedPlan?.id ?? null,
    });

    return NextResponse.json({ redirect_url: checkoutUrl });
  } catch (err: any) {
    console.error("[flutterwave-checkout]", err?.message);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}