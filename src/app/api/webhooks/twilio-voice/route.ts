import { NextResponse } from "next/server";

/**
 * Twilio Voice webhook — DISABLED.
 *
 * Owner scope: voice is handled by Vapi, not Twilio.
 * The Vapi voice webhooks are at:
 * - /api/voice/vapi/[webhookToken] (assistant calls)
 * - /api/voice/incoming (incoming call handling)
 *
 * This endpoint returns 410 Gone to prevent traffic from legacy
 * Twilio Voice configurations.
 */
export async function POST() {
  return NextResponse.json(
    { error: "Twilio Voice is not configured — use Vapi instead" },
    { status: 410 }
  );
}
