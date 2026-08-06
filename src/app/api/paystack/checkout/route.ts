/**
 * POST /api/paystack/checkout — Subscribe-first Paystack checkout.
 *
 * NO AUTHENTICATION REQUIRED.  The user pays BEFORE creating an account.
 *
 * Body: { email, name, companyName?, plan? }
 *
 * Flow:
 *   1. Ensure $199/mo Paystack Plan exists (idempotent)
 *   2. Initialize $399 one-time setup transaction
 *   3. Embed signup metadata + plan code (so webhook can create account + subscription)
 *   4. Return authorization_url for client-side redirect
 *
 * Pricing: $399 USD setup (one-time) + $199 USD/month (recurring, via Paystack Subscription)
 * Currency: USD, amounts in CENTS (39900 = $399.00)
 *
 * Required env: PAYSTACK_SECRET_KEY, NEXT_PUBLIC_APP_URL
 */
import { NextResponse } from "next/server";
import { ensurePaystackPlan, SETUP_FEE_CENTS, CURRENCY } from "@/lib/paystack";

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;
const PAYSTACK_API = "https://api.paystack.co";

export async function POST(request: Request) {
  // ── Parse body ────────────────────────────────────────
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const email = String(body.email || "").trim();
  const name = String(body.name || "").trim();
  const companyName = String(body.companyName || "").trim();
  const plan = (body.plan === "professional" ? "professional" : "starter") as "starter" | "professional";

  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  // ── Validate env ──────────────────────────────────────
  if (!PAYSTACK_SECRET) {
    return NextResponse.json({ error: "Payment provider not configured" }, { status: 503 });
  }
  if (!process.env.NEXT_PUBLIC_APP_URL) {
    return NextResponse.json({ error: "App URL not configured" }, { status: 503 });
  }

  try {
    // ── Ensure recurring plan exists ────────────────────
    const planCfg = await ensurePaystackPlan(plan);

    // ── Build signup metadata ───────────────────────────
    const metadata: Record<string, any> = {
      signupEmail: email,
      signupName: name,
      signupCompany: companyName,
      plan,
      planCode: planCfg.planCode,
      paymentType: "setup",
    };

    // ── Initialize $399 setup transaction ───────────────
    const res = await fetch(`${PAYSTACK_API}/transaction/initialize`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        amount: SETUP_FEE_CENTS, // 39900 = $399.00 USD
        currency: CURRENCY,
        metadata,
        callback_url: `${process.env.NEXT_PUBLIC_APP_URL}/onboarding?payment=done`,
      }),
    });

    const data = (await res.json()) as any;
    if (!data.status) {
      console.error("[paystack-checkout] Paystack error:", data);
      return NextResponse.json(
        { error: data.message || "Payment initialization failed" },
        { status: 502 },
      );
    }

    return NextResponse.json({
      authorization_url: data.data.authorization_url,
      reference: data.data.reference,
      access_code: data.data.access_code,
    });
  } catch (err: any) {
    console.error("[paystack-checkout]", err?.message);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
