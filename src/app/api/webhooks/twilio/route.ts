import { NextResponse } from "next/server";

/**
 * Twilio WhatsApp/SMS webhook — DISABLED.
 *
 * Owner scope: voice (Vapi), website, and Resend email only — not WhatsApp/SMS.
 * This endpoint returns 410 Gone to prevent any traffic from reaching legacy
 * Twilio WhatsApp configurations.
 */
export async function POST() {
  return NextResponse.json(
    { error: "WhatsApp/SMS is not a supported channel" },
    { status: 410 }
  );
}
