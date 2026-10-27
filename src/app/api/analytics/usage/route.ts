/**
 * GET /api/analytics/usage — billable AI usage for the authenticated tenant.
 *
 * Implements the usage half of ANALYTICS-DATA-CONTRACT.md ("Separate
 * /api/analytics/usage returns billable quantities by tenant, period, event
 * type, unit, provider, without raw content") and gives the dashboard usage
 * bars a single endpoint that matches the owner-ratified credit rules:
 *
 *   - paid  = $20/month provider cost = 4,000 credits (CREDITS_INCLUDED_PER_PERIOD)
 *   - trial = 50 AI chat messages, voice locked
 *   - 1 credit = $0.005 blended provider cost; balances are integer milli-credits
 *     in the ledger and whole credits in this response
 *
 * Rules honoured here:
 *   - TENANT SAFETY: every query is scoped to the caller's businessId from
 *     ensureBusiness(). Only aggregates leave this route — no message bodies,
 *     no provider payloads, no per-event rows.
 *   - NO FABRICATION: when the credit tables are unreadable in an environment
 *     the response is marked dataQuality "partial" with a warning, and the
 *     numeric fields are the real ledger sums we could read (never invented).
 *   - The window is the CURRENT billing period from the subscription; the
 *     daily series covers the last 7 days clipped to that period.
 */

import { NextResponse } from "next/server";
import { db } from "@/db";
import { usageEvent } from "@/db/schema";
import { and, eq, gte, lte, sql, type SQL } from "drizzle-orm";
import { ensureBusiness } from "@/lib/business";
import {
  CREDITS_INCLUDED_PER_PERIOD,
  CREDITS_WARN_REMAINING_PCT,
  getCreditStatus,
  type CreditStatus,
} from "@/lib/credits";
import { TRIAL_MESSAGE_LIMIT, getWorkspaceEntitlements } from "@/lib/trial";

export const dynamic = "force-dynamic";

interface UsageBucket {
  eventType: string;
  source: string;
  provider: string | null;
  unit: string;
  events: number;
  quantity: number;
  credits: number;
}

/** milli-credits → whole credits for display (same rounding as the dashboard). */
function toCredits(milli: number): number {
  return Math.round(Number(milli) / 1000);
}

export async function GET() {
  const businessId = await ensureBusiness();
  if (!businessId) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Unauthorized" } },
      { status: 401 }
    );
  }

  const asOf = new Date();
  const entitlements = await getWorkspaceEntitlements(businessId);

  // ── Allowance + status: the wallet for paid, the message count for trial ──
  let status: CreditStatus | null = null;
  const warnings: string[] = [];

  try {
    status = await getCreditStatus(businessId);
  } catch (err) {
    warnings.push("Credit wallet is unavailable in this environment");
    console.error("[analytics/usage] credit status failed", {
      businessId,
      error: err instanceof Error ? err.message : String(err),
    });
  }

  const periodStart = status?.periodStart ?? null;
  const periodEnd = status?.periodEnd ?? null;

  // ── Ledger aggregation for the current period ─────────────────────────
  // Grouped by (event type, source, provider, unit) — the contract's billable
  // dimensions — with quantities and credits summed in the database.
  let buckets: UsageBucket[] = [];
  let daily: Array<{ date: string; chatCredits: number; voiceCredits: number }> = [];

  if (periodStart && periodEnd) {
    const scope = (extra?: SQL) =>
      and(
        eq(usageEvent.businessId, businessId),
        eq(usageEvent.periodStartAt, periodStart),
        ...(extra ? [extra] : [])
      );

    try {
      const rows = await db
        .select({
          eventType: usageEvent.eventType,
          source: usageEvent.source,
          provider: usageEvent.provider,
          unit: usageEvent.unit,
          events: sql<number>`count(*)::int`,
          quantity: sql<number>`coalesce(sum(${usageEvent.quantity}), 0)::int`,
          creditsMilli: sql<number>`coalesce(sum(${usageEvent.creditsMilli}), 0)::bigint`,
        })
        .from(usageEvent)
        .where(scope())
        .groupBy(
          usageEvent.eventType,
          usageEvent.source,
          usageEvent.provider,
          usageEvent.unit
        );

      buckets = rows.map((r) => ({
        eventType: r.eventType,
        source: r.source,
        provider: r.provider ?? null,
        unit: r.unit,
        events: Number(r.events),
        quantity: Number(r.quantity),
        credits: toCredits(Number(r.creditsMilli)),
      }));
    } catch (err) {
      warnings.push("Usage summary is unavailable in this environment");
      console.error("[analytics/usage] bucket query failed", {
        businessId,
        error: err instanceof Error ? err.message : String(err),
      });
    }

    // ── Daily series (chat vs voice), last 7 days clipped to the period ──
    const sevenDaysAgo = new Date(asOf.getTime() - 7 * 86400000);
    const windowStart = sevenDaysAgo > periodStart ? sevenDaysAgo : periodStart;
    try {
      const dailyRows = await db
        .select({
          date: sql<string>`to_char(${usageEvent.occurredAt}, 'YYYY-MM-DD')`,
          chatMilli: sql<number>`coalesce(sum(case when ${usageEvent.eventType} <> 'voice.call.minutes' then ${usageEvent.creditsMilli} else 0 end), 0)::bigint`,
          voiceMilli: sql<number>`coalesce(sum(case when ${usageEvent.eventType} = 'voice.call.minutes' then ${usageEvent.creditsMilli} else 0 end), 0)::bigint`,
        })
        .from(usageEvent)
        .where(
          and(
            eq(usageEvent.businessId, businessId),
            eq(usageEvent.periodStartAt, periodStart),
            gte(usageEvent.occurredAt, windowStart),
            lte(usageEvent.occurredAt, asOf)
          )
        )
        .groupBy(sql`to_char(${usageEvent.occurredAt}, 'YYYY-MM-DD')`)
        .orderBy(sql`to_char(${usageEvent.occurredAt}, 'YYYY-MM-DD')`);

      daily = dailyRows.map((r) => ({
        date: r.date,
        chatCredits: toCredits(Number(r.chatMilli)),
        voiceCredits: toCredits(Number(r.voiceMilli)),
      }));
    } catch (err) {
      warnings.push("Daily usage series is unavailable in this environment");
      console.error("[analytics/usage] daily query failed", {
        businessId,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  } else {
    warnings.push("No billing period is open for this workspace yet");
  }

  const chatCredits = buckets
    .filter((b) => b.eventType !== "voice.call.minutes")
    .reduce((sum, b) => sum + b.credits, 0);
  const voiceCredits = buckets
    .filter((b) => b.eventType === "voice.call.minutes")
    .reduce((sum, b) => sum + b.credits, 0);

  return NextResponse.json({
    tenant: { businessId },
    asOf: asOf.toISOString(),
    timezone: "UTC",
    window: {
      from: periodStart?.toISOString() ?? null,
      to: periodEnd?.toISOString() ?? null,
    },
    tier: entitlements.tier,
    dataQuality: warnings.length === 0 ? "complete" : "partial",
    allowance:
      entitlements.tier === "paid"
        ? {
            creditsIncluded: CREDITS_INCLUDED_PER_PERIOD,
            creditsUsed: status?.consumed ?? chatCredits + voiceCredits,
            creditsRemaining: status?.remaining ?? 0,
            chatCredits,
            voiceCredits,
            warnAtRemainingPct: CREDITS_WARN_REMAINING_PCT,
            status: status?.status ?? "active",
          }
        : {
            // Trial is counted in MESSAGES, never in credits.
            trialMessageLimit: TRIAL_MESSAGE_LIMIT,
            trialMessagesUsed: entitlements.trialMessagesUsed,
            trialMessagesRemaining: entitlements.trialMessagesRemaining,
            voiceLocked: entitlements.voiceLocked,
            creditsIncluded: 0,
            chatCredits,
            voiceCredits,
            status: entitlements.chatBlocked ? "exhausted" : "active",
          },
    buckets,
    daily,
    warnings,
  });
}
