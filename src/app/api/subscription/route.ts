/**
 * GET  /api/subscription — current business subscription status
 * POST /api/subscription — cancel subscription
 */
import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { db } from "@/db";
import { business, subscription } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  try {
    const user = await currentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const [biz] = await db.select().from(business).where(eq(business.ownerId, user.id)).limit(1);
    if (!biz) return NextResponse.json({ error: "No business found" }, { status: 404 });

    const [sub] = await db.select().from(subscription).where(eq(subscription.businessId, biz.id)).orderBy(eq(subscription.createdAt, subscription.createdAt)).limit(1);

    if (!sub) {
      return NextResponse.json({ plan: "starter", status: "pending", hasSubscription: false });
    }

    return NextResponse.json({
      plan: sub.plan || "starter",
      status: sub.status || "active",
      amount: sub.amount || 0,
      currency: sub.currency || "usd",
      interval: sub.interval || "month",
      flutterwaveSubId: sub.flutterwaveSubId,
      currentPeriodStart: sub.currentPeriodStart,
      currentPeriodEnd: sub.currentPeriodEnd,
      canceledAt: sub.canceledAt,
      hasSubscription: true,
    });
  } catch (error) {
    console.error("Subscription fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch subscription" }, { status: 500 });
  }
}

export async function POST() {
  try {
    const user = await currentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const [biz] = await db.select().from(business).where(eq(business.ownerId, user.id)).limit(1);
    if (!biz) return NextResponse.json({ error: "No business found" }, { status: 404 });

    const [sub] = await db.select().from(subscription).where(eq(subscription.businessId, biz.id)).limit(1);
    if (!sub) return NextResponse.json({ error: "No active subscription" }, { status: 404 });

    await db
      .update(subscription)
      .set({ status: "canceled", canceledAt: new Date() })
      .where(eq(subscription.id, sub.id));

    return NextResponse.json({ status: "canceled", message: "Subscription canceled. Service continues until end of billing period." });
  } catch (error) {
    console.error("Subscription cancel error:", error);
    return NextResponse.json({ error: "Failed to cancel subscription" }, { status: 500 });
  }
}
