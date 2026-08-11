import { NextResponse } from "next/server";

/**
 * Legacy inbound email webhook — DISABLED.
 *
 * Superseded by the canonical, verified handler at
 * /api/webhooks/resend/inbound (business-domain exact-match routing +
 * RESEND_WEBHOOK_SECRET verification). This legacy handler had NO signature
 * verification yet ran paid AI completions and sent outbound email for any
 * payload; it also matched businesses by lead email instead of the "To"
 * address, so a spoofed "reply" from a known lead could trigger AI work and
 * outbound replies for the wrong tenant.
 *
 * Returns 410 Gone so any traffic from a legacy email-provider webhook
 * configuration is rejected (fail closed). Ensure the email provider
 * dashboard points at /api/webhooks/resend/inbound instead.
 */
export async function POST() {
  return NextResponse.json(
    { error: { code: "GONE", message: "Legacy inbound email webhook disabled — use /api/webhooks/resend/inbound" } },
    { status: 410 }
  );
}
