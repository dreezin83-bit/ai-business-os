import { NextResponse } from "next/server";

/**
 * Legacy Twilio voice call handler — DISABLED.
 *
 * This was the pre-Vapi Twilio webhook for incoming calls. Voice is now fully
 * handled by Vapi (see /api/voice/vapi/[webhookToken] and /api/voice/provision);
 * nothing in the codebase references this route anymore.
 *
 * Returns 410 Gone so any traffic from legacy Twilio voice configurations is
 * rejected instead of writing to the database.
 */
export async function POST() {
  return NextResponse.json(
    { error: { code: "GONE", message: "Legacy Twilio voice handler is disabled — voice is handled by Vapi" } },
    { status: 410 }
  );
}
