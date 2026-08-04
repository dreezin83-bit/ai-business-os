/**
 * POST /api/paystack/checkout — Initialize Paystack payment.
 *
 * Creates a Paystack transaction for the subscription plan and returns
 * an authorization_url the client redirects to for payment.
 *
 * Pricing: $499 setup + $199/month. Amount is in kobo (NGN) or cents (USD).
 *
 * Required env: PAYSTACK_SECRET_KEY, NEXT_PUBLIC_APP_URL
 */

import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { db } from "@/db";
import { business } from "@/db/schema";
import { eq } from "drizzle-orm";

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;
const PAYSTACK_API = "https://api.paystack.co";

interface PlanConfig {
  id: string;
  amount: number;   // in kobo (NGN) — 49900 = $499
  recurring: number; // monthly after setup
  label: string;
}

const PLANS: Record<string, PlanConfig> = {
  starter: { id: "starter", amount: 49900, recurring: 19900, label: "Starter ($499 setup + $199/mo)" },
  professional: { id: "professional", amount: 49900, recurring: 19900, label: "Professional ($499 setup + $199/mo)" },
};

export async function POST(request: Request) {
  try {
    const user = await currentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const [biz] = await db.select().from(business).where(eq(business.ownerId, user.id)).limit(1);
    if (!biz) return NextResponse.json({ error: "No business found — complete onboarding first" }, { status: 404 });

    let plan: string;
    try {
      const body = await request.json();
      plan = body.plan || "starter";
    } catch { plan = "starter"; }

    const planCfg = PLANS[plan] || PLANS.starter;
    const email = biz.email || user.emailAddresses?.[0]?.emailAddress || "";

    if (!PAYSTACK_SECRET) {
      return NextResponse.json({ error: "Payment provider not configured" }, { status: 503 });
    }

    // Create Paystack transaction
    const res = await fetch(`${PAYSTACK_API}/transaction/initialize`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        amount: planCfg.amount,
        currency: "USD",
        metadata: { businessId: biz.id, plan: planCfg.id },
        callback_url: `${process.env.NEXT_PUBLIC_APP_URL || ""}/dashboard/settings?payment=done`,
      }),
    });

    const data = await res.json() as any;
    if (!data.status) {
      console.error("[paystack-checkout] Paystack error:", data);
      return NextResponse.json({ error: data.message || "Payment initialization failed" }, { status: 502 });
    }

    return NextResponse.json({
      authorization_url: data.data.authorization_url,
      reference: data.data.reference,
      access_code: data.data.access_code,
    });
  } catch (err: any) {
    console.error("[paystack-checkout]", err?.message);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
