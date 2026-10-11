import { NextResponse } from "next/server";
import { ensureBusiness } from "@/lib/business";
import { makeChatbotToken } from "@/lib/credits";

/**
 * GET /api/chatbot/embed-token — returns a tenant-specific signed embed token
 * (owner decision #6: every newly generated embed script includes a signed token,
 * HMAC over businessId+expiry via CHATBOT_EMBED_SECRET).
 * Authed: resolves the business server-side from the Clerk session — never trusts a client ID.
 */
export async function GET() {
  const businessId = await ensureBusiness();
  if (!businessId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { token, expiresAt } = makeChatbotToken(businessId);
    return NextResponse.json({ token, expiresAt, businessId });
  } catch (err: any) {
    return NextResponse.json(
      { error: "CHATBOT_EMBED_SECRET is not configured on the server" },
      { status: 500 }
    );
  }
}