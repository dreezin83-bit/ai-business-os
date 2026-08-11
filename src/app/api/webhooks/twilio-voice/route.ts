import { NextResponse } from "next/server";

/**
 * Twilio Voice webhook — DISABLED.
 *
 * Owner scope: voice is handled by Vapi, not Twilio.
 * Active voice webhooks:
 * - /api/voice/vapi/[webhookToken] — Vapi assistant calls
 *
 * This endpoint returns 410 Gone so any traffic from legacy Twilio Voice
 * configurations is rejected instead of writing to the database.
 */
export async function POST() {
  return NextResponse.json(
    { error: { code: "GONE", message: "Twilio voice is disabled — voice is handled by Vapi" } },
    { status: 410 }
  );
}
