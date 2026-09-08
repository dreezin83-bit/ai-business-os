import { NextResponse } from "next/server";
import { verifyWebhook } from "@clerk/nextjs/webhooks";
import { db } from "@/db";
import { business, aiBrainConfig } from "@/db/schema";
import { eq } from "drizzle-orm";
import { generateId } from "@/lib/utils";
import { userFields, businessName, resolveBusinessName, isDefaultName } from "@/lib/clerk-webhook";

/**
 * POST /api/webhooks/clerk — production Clerk webhook handler.
 *
 * Flow:
 *   1. Verify the Svix signature with Clerk's official verifyWebhook() (which
 *      reads CLERK_WEBHOOK_SIGNING_SECRET or the explicit signingSecret).
 *   2. Route by event type:
 *      - user.created  → idempotent find-or-create of the tenant business row
 *                        (plus a default AI Brain config) for the new owner.
 *                        Business name resolves from unsafeMetadata.businessName
 *                        (set by onboarding), falling back to the user's name.
 *      - user.updated  → sync the owner's profile (name/email/phone) onto their
 *                        business row(s) WITHOUT clobbering values the user set
 *                        during onboarding (empty/default fields only).
 *      - user.deleted  → cleanup: delete the owner's business row(s) (all
 *                        child records cascade via schema FK ON DELETE CASCADE).
 *      - all other events are acknowledged (200).
 *
 * This route must stay PUBLIC (no auth) — /api/webhooks(.*) is whitelisted in
 * src/proxy.ts. Security comes from Svix signature verification, not a session.
 *
 * Required env: CLERK_WEBHOOK_SIGNING_SECRET (set in Vercel from
 * Clerk → Webhooks → Settings → Signing secret). Without it the route rejects
 * all events (fail-closed 500).
 *
 * Requires the Node.js runtime so the Web Crypto key import used by
 * standardwebhooks (Clerk's verification lib) is available.
 */
export const runtime = "nodejs";

/** Default AI Brain config seeded alongside every new tenant business. */
function defaultBrainConfig(businessId: string) {
  return {
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
    businessHours: JSON.stringify([
      { day: "Monday", open: "09:00", close: "17:00", closed: false },
      { day: "Tuesday", open: "09:00", close: "17:00", closed: false },
      { day: "Wednesday", open: "09:00", close: "17:00", closed: false },
      { day: "Thursday", open: "09:00", close: "17:00", closed: false },
      { day: "Friday", open: "09:00", close: "17:00", closed: false },
      { day: "Saturday", open: "10:00", close: "15:00", closed: false },
      { day: "Sunday", open: "", close: "", closed: true },
    ]),
    greetingMessage: "Hello! How can I help you today?",
  };
}

/** Idempotently ensure a business + default AI Brain config exist for an owner. */
async function ensureBusinessForOwner(ownerId: string, data: any) {
  const [existing] = await db
    .select()
    .from(business)
    .where(eq(business.ownerId, ownerId))
    .limit(1);
  if (existing) return existing;

  const { email, phone } = userFields(data);
  const businessId = generateId();
  const newBusiness = {
    id: businessId,
    name: businessName(resolveBusinessName(data)),
    ownerId,
    phone,
    email,
    website: "",
    address: "",
  };
  await db.insert(business).values(newBusiness);
  await db.insert(aiBrainConfig).values(defaultBrainConfig(businessId));
  return newBusiness;
}

/**
 * Keep the owner's business profile in sync with Clerk on user.updated.
 * Never clobbers data the user set during onboarding:
 *  - name is only overwritten while the row still holds a placeholder/default
 *    and onboarding is not yet complete;
 *  - email/phone are only filled in if currently empty.
 */
async function syncBusinessProfile(ownerId: string, data: any) {
  const { email, phone } = userFields(data);
  const rows = await db
    .select()
    .from(business)
    .where(eq(business.ownerId, ownerId));

  // No local business yet (e.g. event arrived out of order) — backfill one.
  if (rows.length === 0) {
    return ensureBusinessForOwner(ownerId, data);
  }

  const profileName = businessName(resolveBusinessName(data));
  for (const b of rows) {
    const patch: Record<string, unknown> = { updatedAt: new Date() };
    if (!b.onboardingComplete && isDefaultName(b.name)) {
      patch.name = profileName;
    }
    if (!b.email) patch.email = email;
    if (!b.phone) patch.phone = phone;
    await db.update(business).set(patch).where(eq(business.id, b.id));
  }
  return rows[0];
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
    const signingSecret =
      process.env.CLERK_WEBHOOK_SIGNING_SECRET ??
      process.env.CLERK_WEBHOOK_SECRET;
    if (!signingSecret) {
      console.error(
        "[clerk] CLERK_WEBHOOK_SIGNING_SECRET / CLERK_WEBHOOK_SECRET is not set — rejecting webhook"
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
      return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
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
