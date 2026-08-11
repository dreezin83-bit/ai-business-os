import { NextResponse } from "next/server";

/**
 * Twilio WhatsApp/SMS webhook — DISABLED.
 *
 * Owner scope: website chatbot, Vapi voice, and Resend email only — no
 * WhatsApp/SMS. This endpoint returns 410 Gone so any traffic from legacy
 * Twilio WhatsApp/SMS configurations is rejected instead of writing to the
 * database or sending messages through Twilio.
 */
export async function POST() {
  return NextResponse.json(
    { error: { code: "GONE", message: "Twilio WhatsApp/SMS is disabled — not in scope" } },
    { status: 410 }
  );
}
