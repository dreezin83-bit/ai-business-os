import { NextResponse } from "next/server";
import { db } from "@/db";
import { business, aiBrainConfig } from "@/db/schema";
import { eq } from "drizzle-orm";
import { ensureBusiness } from "@/lib/business";

/**
 * Mirrors the chat route's isConfigured gate (a business counts as
 * "setup complete" once its AI brain has a non-empty services list), but
 * tolerant of both storage formats that exist today:
 * - JSON array string ("[\"AC repair\",\"Heating\"]") — written by the
 *   chat-route onboarding flow and the AI Brain editor.
 * - Raw non-JSON text ("AC repair\nHeating repair") — written by the
 *   /api/onboarding wizard, which stores the textarea value as-is.
 * Either format with real content counts as configured.
 */
function servicesConfigured(raw: string | null | undefined): boolean {
  if (!raw) return false;
  const trimmed = String(raw).trim();
  if (!trimmed) return false;
  if (trimmed.startsWith("[")) {
    try {
      const s = JSON.parse(trimmed);
      return Array.isArray(s) && s.length > 0 && s[0] !== "";
    } catch {
      return false;
    }
  }
  // Non-JSON list (wizard path) — non-empty means real services were entered.
  return true;
}

/**
 * GET /api/business/current
 * Returns the authenticated user's current business profile.
 * Tenant-scoped: resolves the business from the Clerk session via ensureBusiness()
 * (which auto-creates the business row on first access).
 *
 * Consumers:
 * - /dashboard/ai-brain (uses name, phone, email, website)
 * - /dashboard layout (uses servicesConfigured for the "Complete your setup" banner)
 */
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const businessId = await ensureBusiness();
    if (!businessId) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Unauthorized" } },
        { status: 401 }
      );
    }

    const [[biz], [config]] = await Promise.all([
      db.select().from(business).where(eq(business.id, businessId)).limit(1),
      db
        .select({ services: aiBrainConfig.services })
        .from(aiBrainConfig)
        .where(eq(aiBrainConfig.businessId, businessId))
        .limit(1),
    ]);
    if (!biz) {
      return NextResponse.json(
        { error: { code: "BUSINESS_NOT_FOUND", message: "Business not found" } },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: biz.id,
      name: biz.name,
      phone: biz.phone ?? "",
      email: biz.email ?? "",
      website: biz.website ?? "",
      address: biz.address ?? "",
      category: biz.category ?? "",
      onboardingComplete: biz.onboardingComplete,
      // True once the AI brain has real services — the same gate the chat
      // route uses to decide "needs setup help".
      servicesConfigured: servicesConfigured(config?.services),
    });
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error("[business/current] Failed to load current business", {
      errorName: err.name,
      errorMessage: err.message,
      stack: err.stack,
    });
    return NextResponse.json(
      { error: { code: "BUSINESS_LOAD_FAILED", message: "Failed to load business" } },
      { status: 500 }
    );
  }
}
