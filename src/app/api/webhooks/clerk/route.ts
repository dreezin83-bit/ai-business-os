import { NextResponse } from "next/server";
import { verifyWebhook } from "@clerk/nextjs/webhooks";
import { db } from "@/db";
import { business, aiBrainConfig } from "@/db/schema";
import { eq } from "drizzle-orm";
import { generateId } from "@/lib/utils";

/**
 * POST /api/webhooks/clerk — production Clerk webhook handler.
 *
 * Flow:
 *   1. Verify the Svix signature with Clerk's official verifyWebhook() (which
 *      reads CLERK_WEBHOOK_SIGNING_SECRET or the explicit signingSecret).
 *   2. Route by event type:
 *      - user.created  → idempotent find-or-create of the tenant business row
 *                        (plus a default AI Brain config) for the new owner.
 *      - user.updated  → sync the owner's profile (name/email/phone/website)
 *                        onto their business row(s).
 *      - user.deleted  → cleanup: delete the owner's business row(s) (all
 *                        child records cascade).
 *
 * This route must stay PUBLIC (no auth) — /api/webhooks(.*) is whitelisted in
 * src/proxy.ts. Security comes from Svix signature verification, not a session.
 *
 * Required env: CLERK_WEBHOOK_SIGNING_SECRET (set in Vercel from
 * Clerk → Webhooks → Settings → Signing secret).
 *
 * Requires the Node.js runtime so the Web Crypto key import used by
 * standardwebhooks (Clerk's verification lib) is available.
 */
export const runtime = "nodejs";

/** Pull the verified user data into the shape the business row stores. */
function userFields(data: any) {
  const name =
    [data?.first_name, data?.last_name].filter(Boolean).join(" ") ||
    data?.email_addresses?.[0]?.email_address ||
    "Business Owner";
  return {
    name,
    email: data?.email_addresses?.[0]?.email_address || "",
    phone: data?.phone_numbers?.[0]?.phone_number || "",
  };
}

/** Idempotently ensure a business + default AI Brain config exist for an owner. */
async function ensureBusinessForOwner(ownerId: string, data: any) {
  const [existing] = await db
    .select()
    .from(business)
    .where(eq(business.ownerId, ownerId));
  if (existing) return existing;

  const { name, email, phone } = userFields(data);
  const businessId = generateId();
  const newBusiness = {
    id: businessId,
    name: name + "'s Business",
    ownerId,
    phone,
    email,
    website: "",
    address: "",
  };
  await db.insert(business).values(newBusiness);

  await db.insert(aiBrainConfig).values({
    id: generateId(),
    businessId,
    systemPrompt:
      "You are a helpful assistant for a service business. Answer questions about services, pricing, and scheduling.",
    businessInfo: "",
    services: "[]",
    faqs: "[]",
    pricingGuidance: "",
    companyPolicies: "",
    serviceAreas: "[]",
    businessHours: "{}",
    greetingMessage: "Hello! How can I help you today?",
  });

  return newBusiness;
}

/** Keep the owner's business profile in sync with Clerk on user.updated. */
async function syncBusinessProfile(ownerId: string, data: any) {
  const { name, email, phone } = userFields(data);
  const businesses = await db
    .update(business)
    .set({
      name: name + "'s Business",
      email,
      phone,
      updatedAt: new Date(),
    })
    .where(eq(business.ownerId, ownerId))
    .returning();

  // No local business yet (e.g. event arrived out of order) — backfill one.
  if (businesses.length === 0) {
    return ensureBusinessForOwner(ownerId, data);
  }
  return businesses[0];
}

/** Remove the owner's tenant rows (children cascade). */
async function cleanupBusiness(ownerId: string) {
  const deleted = await db
    .delete(business)
    .where(eq(business.ownerId, ownerId))
    .returning({ id: business.id });
  return deleted;
}

export async function POST(request: Request) {
  try {
    const signingSecret = process.env.CLERK_WEBHOOK_SIGNING_SECRET;
    if (!signingSecret) {
      console.error(
        "[clerk] CLERK_WEBHOOK_SIGNING_SECRET is not set — rejecting webhook"
      );
      return NextResponse.json(
        { error: "Webhook signing secret not configured" },
        { status: 500 }
      );
    }

    let evt;
    try {
      evt = await verifyWebhook(request, { signingSecret });
    } catch (err) {
      console.error("[clerk] Signature verification failed:", err);
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 403 }
      );
    }

    const type = evt.type as string;
    const data = (evt.data ?? {}) as any;
    const userId = data.id;

    if (!userId) {
      return NextResponse.json(
        { error: "Missing user id in event data" },
        { status: 400 }
      );
    }

    switch (type) {
      case "user.created":
        await ensureBusinessForOwner(userId, data);
        break;
      case "user.updated":
        await syncBusinessProfile(userId, data);
        break;
      case "user.deleted":
        await cleanupBusiness(userId);
        break;
      default:
        // Acknowledge all other events (session.created, organization.*, etc.)
        break;
    }

    return NextResponse.json({ received: true, type });
  } catch (error) {
    console.error("[clerk] Webhook error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}
