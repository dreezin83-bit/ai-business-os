/**
 * POST /api/flutterwave/checkout — Subscribe-first Flutterwave checkout.
 *
 * NO AUTHENTICATION REQUIRED. The user pays BEFORE creating an account.
 *
 * Body: { email, name, companyName?, plan? }
 *
 * Flow:
 *   1. Ensure the $199/mo Flutterwave payment plan exists (idempotent)
 *   2. Initialize a $399 one-time setup transaction (NO plan attached —
 *      attaching the plan would replace the $399 with the $199 plan amount)
 *   3. Embed signup metadata so the webhook can create the account + enrollment
 *   4. Return redirect_url for the client-side redirect (Flutterwave hosted page)
 *
 * Pricing (owner-ratified offer, unchanged):
 *   $399 USD for the first month (this one charge), then $199 USD/month
 *   recurring via the payment plan (first plan charge deferred ~30 days by the
 *   plan's start_date — the plan is charged from month 2 onward).
 *   Currency: USD. Flutterwave v3 amounts are in MAJOR units (399 = $399.00).
 *
 * Required env: FLUTTERWAVE_SECRET_KEY, NEXT_PUBLIC_APP_URL
 */
import { NextResponse } from "next/server";
import {
  CURRENCY,
  ensurePaymentPlan,
  SETUP_FEE_MAJOR,
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
    // ── Ensure the $199/mo recurring plan exists (idempotent) ──
    // The plan itself is harmless at this point: the $399 setup payment does
    // NOT attach to it (see header note), so nothing is charged at checkout
    // beyond the $399. The webhook uses the returned plan id to enroll the
    // customer after the setup charge succeeds.
    await ensurePaymentPlan();

    // ── Build signup metadata ───────────────────────────────────
    const meta: Record<string, unknown> = {
      signupEmail: email,
      signupName: name,
      signupCompany: companyName,
      plan,
      paymentType: "setup",
    };

    // ── Initialize the $399 one-time setup transaction ──────────
    // redirect_url follows APP_URL: single host today, app subdomain once
    // the split activates (NEXT_PUBLIC_APP_URL = app.sagenifyai.com).
    const redirectUrl = `${APP_URL}/onboarding?payment=done`;
    const checkoutUrl = await initializePayment({
      tx_ref: `sagenify-setup-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`,
      amount: SETUP_FEE_MAJOR, // 399 = $399.00 USD (major units)
      currency: CURRENCY,
      redirect_url: redirectUrl,
      customer: { email, name },
      meta,
      payment_options: "card",
    });

    return NextResponse.json({ redirect_url: checkoutUrl });
  } catch (err: any) {
    console.error("[flutterwave-checkout]", err?.message);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}