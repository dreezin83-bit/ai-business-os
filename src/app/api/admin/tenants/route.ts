/**
 * GET /api/admin/tenants — list all businesses
 * Requires: Clerk admin role
 */
import { NextResponse } from "next/server";
import { db } from "@/db";
import { business, subscription, phoneNumber } from "@/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { requireAdmin } from "@/lib/admin-auth";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized — admin only" }, { status: 403 });
  }

  const businesses = await db.select().from(business).orderBy(desc(business.createdAt));

  // Fetch subscriptions and phone numbers for all businesses in parallel
  const subMap = new Map<string, any>();
  const phoneMap = new Map<string, string>();

  const [subs, phones] = await Promise.all([
    db.select().from(subscription),
    db.select().from(phoneNumber),
  ]);

  for (const s of subs) subMap.set(s.businessId, s);
  for (const p of phones) {
    if (!phoneMap.has(p.businessId)) phoneMap.set(p.businessId, p.number);
  }

  const tenants = businesses.map((b) => {
    const sub = subMap.get(b.id);
    return {
      id: b.id,
      name: b.name,
      category: b.category,
      plan: sub?.plan || "none",
      subStatus: sub?.status || "none",
      status: b.status || "active",
      phoneNumber: phoneMap.get(b.id) || null,
      onboardingComplete: b.onboardingComplete,
      signedUpAt: b.createdAt,
    };
  });

  return NextResponse.json(tenants);
}
