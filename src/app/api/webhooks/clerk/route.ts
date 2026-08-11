import { NextResponse } from "next/server";
import { db } from "@/db";
import { business, aiBrainConfig } from "@/db/schema";
import { eq } from "drizzle-orm";
import { generateId } from "@/lib/utils";

/**
 * Clerk webhook (user.created).
 *
 * Requests are verified with Svix HMAC-SHA256 before any processing and the
 * handler FAILS CLOSED: if CLERK_WEBHOOK_SECRET is not configured or the
 * signature/timestamp is invalid, the webhook is rejected (403). This prevents
 * forged user.created events from creating businesses for arbitrary users.
 *
 * Env: CLERK_WEBHOOK_SECRET must be set in Vercel (from Clerk → Webhooks →
 * signing secret) for the webhook to process events.
 */
const SVIX_TOLERANCE_MS = 5 * 60 * 1000; // 5 minutes, matching Svix's default

async function verifySvix(request: Request, rawBody: string): Promise<boolean> {
  const secret = process.env.CLERK_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[clerk] CLERK_WEBHOOK_SECRET is not set — rejecting all webhooks");
    return false;
  }
  const svixId = request.headers.get("svix-id");
  const tsHeader = request.headers.get("svix-timestamp");
  const sig = request.headers.get("svix-signature");
  if (!svixId || !tsHeader || !sig) {
    console.error("[clerk] Missing Svix headers");
    return false;
  }
  // Reject stale timestamps to prevent replay attacks
  const ts = Number(tsHeader);
  if (!Number.isFinite(ts) || Math.abs(Date.now() - ts * 1000) > SVIX_TOLERANCE_MS) {
    console.error("[clerk] Svix timestamp outside tolerance — rejecting");
    return false;
  }
  try {
    const signed = `${svixId}.${tsHeader}.${rawBody}`;
    const enc = new TextEncoder();
    const rawSecret = secret.startsWith("whsec_") ? secret.slice(6) : secret;
    const key = await crypto.subtle.importKey(
      "raw",
      enc.encode(rawSecret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );
    // Svix signatures are space-separated: "v1,<base64> v1,<base64>..."
    for (const part of sig.split(" ")) {
      const [, b64] = part.split(",");
      if (!b64) continue;
      const sigBytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      if (await crypto.subtle.verify("HMAC", key, sigBytes, enc.encode(signed))) {
        return true;
      }
    }
    return false;
  } catch (err) {
    console.error("[clerk] Svix verification error:", err);
    return false;
  }
}

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    if (!(await verifySvix(request, rawBody))) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
    }
    const body = JSON.parse(rawBody);
    // Only user.created is handled; other events are acknowledged
    if (body.type !== "user.created") {
      return NextResponse.json({ received: true });
    }
    const { id, email_addresses, phone_numbers, first_name, last_name } = body.data || {};
    if (!id) {
      return NextResponse.json({ error: "Missing user ID" }, { status: 400 });
    }
    const name = [first_name, last_name].filter(Boolean).join(" ") || email_addresses?.[0]?.email_address || "Business Owner";
    const email = email_addresses?.[0]?.email_address || "";
    const phone = phone_numbers?.[0]?.phone_number || "";

    // Check if business already exists for this user
    const [existing] = await db.select().from(business).where(eq(business.ownerId, id));
    if (existing) {
      return NextResponse.json({ business: existing });
    }

    // Create business
    const businessId = generateId();
    const newBusiness = {
      id: businessId,
      name: name + "'s Business",
      ownerId: id,
      phone,
      email,
      website: "",
      address: "",
    };
    await db.insert(business).values(newBusiness);

    // Create default AI brain config
    await db.insert(aiBrainConfig).values({
      id: generateId(),
      businessId,
      systemPrompt: "You are a helpful assistant for a service business. Answer questions about services, pricing, and scheduling.",
      businessInfo: "",
      services: "[]",
      faqs: "[]",
      pricingGuidance: "",
      companyPolicies: "",
      serviceAreas: "[]",
      businessHours: "{}",
      greetingMessage: "Hello! How can I help you today?",
    });
    return NextResponse.json({ business: newBusiness });
  } catch (error) {
    console.error("[clerk] Webhook error:", error);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
