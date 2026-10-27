/**
 * POST /api/flutterwave/topup — buy extra AI credits (owner decision 2026-10-23).
 *
 * Authenticated: the caller's own workspace is resolved with ensureBusiness(),
 * never taken from the body — a tenant can only top up itself.
 *
 * Body: { amountUsd: number, email: string }
 *   - minimum $10 (TOPUP_MIN_USD); $10 → 2,000 credits at $0.005/credit
 *   - email is the Flutterwave receipt address (the dashboard already has it
 *     from Clerk); it is NOT used to find or create the tenant.
 *
 * Only PAID workspaces may top up: a workspace whose subscription is not
 * verified gets 402, because the free trial is a 50-message allowance and must
 * not be extendable by buying credits.
 *
 * The returned redirect_url is Flutterwave's hosted page. Credits are granted
 * only by the webhook, from the amount Flutterwave verifies server-side — this
 * route never grants anything itself.
 *
 * Required env: FLUTTERWAVE_SECRET_KEY, NEXT_PUBLIC_APP_URL
 */
import { NextResponse } from "next/server";
import { ensureBusiness } from "@/lib/business";
import { getWorkspaceEntitlements } from "@/lib/trial";
import {
  TOPUP_MIN_USD,
  TOPUP_PURPOSE,
  TOPUP_REF_PREFIX,
  validateTopupAmount,
} from "@/lib/credit-topup";
import { CURRENCY } from "@/lib/flutterwave";
import { initializePayment } from "@/lib/flutterwave-client";
import { APP_URL } from "@/lib/domains";

export async function POST(request: Request) {
  const businessId = await ensureBusiness();
  if (!businessId) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Unauthorized" } },
      { status: 401 }
    );
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // ── Paid workspaces only (a top-up must never extend the free trial) ──
  const entitlements = await getWorkspaceEntitlements(businessId);
  if (entitlements.tier !== "paid") {
    return NextResponse.json(
      {
        error: {
          code: "TOPUP_REQUIRES_SUBSCRIPTION",
          message: "Credit top-ups are available on a paid plan. Subscribe to keep going.",
        },
      },
      { status: 402 }
    );
  }

  // ── Validate the amount before touching the payment provider ──
  const validation = validateTopupAmount(body?.amountUsd);
  if (!validation.ok) {
    return NextResponse.json(
      {
        error: {
          code: validation.error,
          message:
            validation.error === "BELOW_MINIMUM"
              ? `Top-ups start at $${TOPUP_MIN_USD}.`
              : validation.error === "ABOVE_MAXIMUM"
                ? "That top-up amount is too large."
                : "Enter a valid top-up amount.",
        },
      },
      { status: 400 }
    );
  }

  const email = String(body?.email ?? "").trim();
  if (!email) {
    return NextResponse.json(
      { error: { code: "EMAIL_REQUIRED", message: "An email is required for the receipt." } },
      { status: 400 }
    );
  }

  if (!process.env.FLUTTERWAVE_SECRET_KEY) {
    return NextResponse.json(
      { error: "Payment provider not configured" },
      { status: 503 }
    );
  }
  if (!process.env.NEXT_PUBLIC_APP_URL) {
    return NextResponse.json({ error: "App URL not configured" }, { status: 503 });
  }

  try {
    const redirectUrl = `${APP_URL}/dashboard/settings?topup=done`;
    const checkoutUrl = await initializePayment({
      tx_ref: `${TOPUP_REF_PREFIX}-${businessId}-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`,
      amount: validation.amountUsd,
      currency: CURRENCY,
      redirect_url: redirectUrl,
      customer: { email, name: "" },
      meta: {
        purpose: TOPUP_PURPOSE,
        businessId,
        credits: validation.credits,
      },
      payment_options: "card",
    });

    return NextResponse.json({
      redirect_url: checkoutUrl,
      amountUsd: validation.amountUsd,
      credits: validation.credits,
      minimumUsd: TOPUP_MIN_USD,
    });
  } catch (err: any) {
    console.error("[flutterwave-topup]", err?.message);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function GET() {
  // Small discovery endpoint so the dashboard can render the price without
  // hardcoding the credit maths in the client.
  return NextResponse.json({
    minimumUsd: TOPUP_MIN_USD,
    creditUsdUnit: 0.005,
    example: { amountUsd: TOPUP_MIN_USD, credits: Math.floor(TOPUP_MIN_USD / 0.005) },
  });
}
