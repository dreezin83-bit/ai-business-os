import { NextResponse } from "next/server";

/**
 * Meta WhatsApp Cloud API webhook — DISABLED.
 *
 * Owner scope: website chatbot, Vapi voice, and Resend email only — no
 * WhatsApp/SMS. The previous handler here had NO signature verification on
 * POST (Meta signs deliveries with X-Hub-Signature-256; this handler accepted
 * any payload), yet it created leads, triggered paid AI completions, and sent
 * outbound WhatsApp messages via the app's Meta access token. An attacker
 * could POST a forged inbound message to spend AI/API credits and message
 * arbitrary phone numbers.
 *
 * This endpoint returns 410 Gone so any traffic from a Meta Developer Console
 * webhook configuration is rejected (fail closed). Remove the webhook
 * configuration from the Meta Developer Console; WhatsApp is not in scope.
 */
export async function GET() {
  return NextResponse.json(
    { error: { code: "GONE", message: "WhatsApp is disabled — not in scope" } },
    { status: 410 }
  );
}

export async function POST() {
  return NextResponse.json(
    { error: { code: "GONE", message: "WhatsApp is disabled — not in scope" } },
    { status: 410 }
  );
}
