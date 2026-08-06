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

