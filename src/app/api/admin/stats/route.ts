/**
 * GET /api/admin/stats — aggregate platform stats
 * Requires: Clerk admin role
 */
import { NextResponse } from "next/server";
import { db } from "@/db";
import {
  business,
  subscription,
  usageAiCall,
  communicationLog,
} from "@/db/schema";
import { eq, and, sql, count, sum } from "drizzle-orm";
import { requireAdmin } from "@/lib/admin-auth";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized — admin only" }, { status: 403 });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const weekStart = new Date(today);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Sunday
  weekStart.setHours(0, 0, 0, 0);

  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

  const [
    totalBusinesses,
    activeBusinesses,
    suspendedBusinesses,
    totalSubscriptions,
    mrrResult,
    aiToday,
    aiWeek,
    smsToday,
    emailsToday,
    newThisWeek,
    newThisMonth,
  ] = await Promise.all([
    db.select({ total: count() }).from(business),
    db.select({ total: count() }).from(business).where(eq(business.status, "active")),
    db.select({ total: count() }).from(business).where(eq(business.status, "suspended")),
    db.select({ total: count() }).from(subscription).where(eq(subscription.status, "active")),
    db
      .select({ total: sum(subscription.amount) })
      .from(subscription)
      .where(eq(subscription.status, "active")),
    db
      .select({ total: count() })
      .from(usageAiCall)
      .where(sql`${usageAiCall.createdAt} >= ${today.toISOString()}`),
    db
      .select({ total: count() })
      .from(usageAiCall)
      .where(sql`${usageAiCall.createdAt} >= ${weekStart.toISOString()}`),
    db
      .select({ total: count() })
      .from(communicationLog)
      .where(
        and(
          eq(communicationLog.type, "sms"),
          sql`${communicationLog.sentAt} >= ${today.toISOString()}`
        )
      ),
    db
      .select({ total: count() })
      .from(communicationLog)
      .where(
        and(
          eq(communicationLog.type, "email"),
          sql`${communicationLog.sentAt} >= ${today.toISOString()}`
        )
      ),
    db
      .select({ total: count() })
      .from(business)
      .where(sql`${business.createdAt} >= ${weekStart.toISOString()}`),
    db
      .select({ total: count() })
      .from(business)
      .where(sql`${business.createdAt} >= ${monthStart.toISOString()}`),
  ]);

  return NextResponse.json({
    businesses: {
      total: totalBusinesses[0]?.total || 0,
      active: activeBusinesses[0]?.total || 0,
      suspended: suspendedBusinesses[0]?.total || 0,
    },
    subscriptions: {
      active: totalSubscriptions[0]?.total || 0,
      mrrCents: mrrResult[0]?.total || 0,
      mrrDollars: ((mrrResult[0]?.total || 0) / 100).toFixed(2),
    },
    activity: {
      aiCallsToday: aiToday[0]?.total || 0,
      aiCallsThisWeek: aiWeek[0]?.total || 0,
      smsSentToday: smsToday[0]?.total || 0,
      emailsSentToday: emailsToday[0]?.total || 0,
    },
    signups: {
      thisWeek: newThisWeek[0]?.total || 0,
      thisMonth: newThisMonth[0]?.total || 0,
    },
  });
}
