/**
 * GET /api/admin/tenants/[id] — single tenant detail
 * Requires: Clerk admin role
 */
import { NextResponse } from "next/server";
import { db } from "@/db";
import {
  business,
  subscription,
  phoneNumber,
  usageAiCall,
  communicationLog,
  conversation,
} from "@/db/schema";
import { eq, and, sql, count, sum } from "drizzle-orm";
import { requireAdmin } from "@/lib/admin-auth";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized — admin only" }, { status: 403 });
  }

  const { id } = await params;

  const [biz] = await db.select().from(business).where(eq(business.id, id)).limit(1);
  if (!biz) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }

  const [sub, phones, conversations, aiUsage, smsUsage, emailUsage] = await Promise.all([
    db.select().from(subscription).where(eq(subscription.businessId, id)).limit(1),
    db.select().from(phoneNumber).where(eq(phoneNumber.businessId, id)),
    db.select({ count: count() }).from(conversation).where(eq(conversation.businessId, id)),
    db
      .select({
        totalCalls: count(),
        totalTokensIn: sum(usageAiCall.tokensIn),
        totalTokensOut: sum(usageAiCall.tokensOut),
        // today's calls
      })
      .from(usageAiCall)
      .where(eq(usageAiCall.businessId, id)),
    db
      .select({ count: count() })
      .from(communicationLog)
      .where(
        and(
          eq(communicationLog.businessId, id),
          eq(communicationLog.type, "sms")
        )
      ),
    db
      .select({ count: count() })
      .from(communicationLog)
      .where(
        and(
          eq(communicationLog.businessId, id),
          eq(communicationLog.type, "email")
        )
      ),
  ]);

  // Today's AI calls
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [todayAi] = await db
    .select({ count: count() })
    .from(usageAiCall)
    .where(
      and(
        eq(usageAiCall.businessId, id),
        sql`${usageAiCall.createdAt} >= ${today.toISOString()}`
      )
    );

  return NextResponse.json({
    id: biz.id,
    name: biz.name,
    category: biz.category,
    status: biz.status || "active",
    onboardingComplete: biz.onboardingComplete,
    signedUpAt: biz.createdAt,
    phone: biz.phone,
    email: biz.email,
    website: biz.website,
    address: biz.address,
    aiNumbers: phones.map((p) => ({ number: p.number, provider: p.provider })),
    subscription: sub?.[0]
      ? {
          plan: sub[0].plan,
          status: sub[0].status,
          amount: sub[0].amount,
          currency: sub[0].currency,
          interval: sub[0].interval,
          currentPeriodStart: sub[0].currentPeriodStart,
          currentPeriodEnd: sub[0].currentPeriodEnd,
          canceledAt: sub[0].canceledAt,
        }
      : null,
    usage: {
      totalConversations: conversations[0]?.count || 0,
      aiCallsTotal: aiUsage[0]?.totalCalls || 0,
      aiCallsToday: todayAi[0]?.count || 0,
      tokensIn: aiUsage[0]?.totalTokensIn || 0,
      tokensOut: aiUsage[0]?.totalTokensOut || 0,
      smsSent: smsUsage[0]?.count || 0,
      emailsSent: emailUsage[0]?.count || 0,
    },
    suspendedAt: biz.suspendedAt,
  });
}
