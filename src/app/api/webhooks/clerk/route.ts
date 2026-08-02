import { NextResponse } from "next/server";
import { db } from "@/db";
import { business, aiBrainConfig } from "@/db/schema";
import { eq } from "drizzle-orm";
import { generateId } from "@/lib/utils";

async function verifySvix(
  request: Request,
  rawBody: string
): Promise<boolean> {
  const secret = process.env.CLERK_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[clerk] CLERK_WEBHOOK_SECRET is not set — rejecting all webhooks");
    return false;
  }
  const svixId = request.headers.get("svix-id");
  const ts = request.headers.get("svix-timestamp");
  const sig = request.headers.get("svix-signature");
  if (!svixId || !ts || !sig) {
    console.error("[clerk] Missing Svix headers");
    return false;
  }
  try {
    const signed = svixId + "." + ts + "." + rawBody;
    const enc = new TextEncoder();
    const rawSecret = secret.startsWith("whsec_") ? secret.slice(6) : secret;
    const key = await crypto.subtle.importKey(
      "raw",
      enc.encode(rawSecret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );
    // Svix signatures are format: "v1,<base64> v1,<base64>..."
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
    if (!(await verifySvix(request, rawBody))) return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
    const body = JSON.parse(rawBody);
    if (body.type !== "user.created") return NextResponse.json({ received: true });
    const { id, email_addresses, phone_numbers, first_name, last_name } = body.data || {};
    const name = [first_name, last_name].filter(Boolean).join(" ") || email_addresses?.[0]?.email_address || "Business Owner";
    const email = email_addresses?.[0]?.email_address || "";
    const phone = phone_numbers?.[0]?.phone_number || "";
    const [existing] = await db.select().from(business).where(eq(business.ownerId, id));
    if (existing) return NextResponse.json({ business: existing });
    const businessId = generateId();
    await db.insert(business).values({ id: businessId, name: name + "'s Business", ownerId: id, phone, email, website: "", address: "" });
    await db.insert(aiBrainConfig).values({ id: generateId(), businessId, systemPrompt: "You are a helpful assistant for a service business.", businessInfo: "", services: "[]", faqs: "[]", pricingGuidance: "", companyPolicies: "", serviceAreas: "[]", businessHours: "{}", greetingMessage: "Hello! How can I help you today?" });
    return NextResponse.json({ business: { id: businessId } });
  } catch (error) { console.error("Clerk webhook error:", error); return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 }); }
}
