import { NextResponse } from "next/server";
import { db } from "@/db";
import { business, aiBrainConfig } from "@/db/schema";
import { eq } from "drizzle-orm";
import { generateId } from "@/lib/utils";

async function verifySvix(request, rawBody) {
  const secret = process.env.CLERK_WEBHOOK_SECRET;
  const svixId = request.headers.get("svix-id");
  const ts = request.headers.get("svix-timestamp");
  const sig = request.headers.get("svix-signature");
  try {
    const signed = svixId + "." + ts + "." + rawBody;
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey("raw", enc.encode((secret.split("whsec_").pop() || secret)), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
    for (const s of sig.split(" ").map(x => x.split(",")[1]).filter(Boolean)) {
      if (await crypto.subtle.verify("HMAC", key, Uint8Array.from([...atob(s)].map(c => c.charCodeAt(0))), enc.encode(signed))) return true;
    }
    return false;
  } catch { return false; }
}

export async function POST(request) {
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
