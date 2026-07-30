/**
 * GET /api/admin/analytics — cross-tenant analytics for Super Admin dashboard
 * Requires: Clerk admin role
 *
 * Returns revenue trends, business growth, usage analytics, category breakdown,
 * plan distribution, top tenants, and recent platform activity.
 */
import { NextResponse } from "next/server";
import { db } from "@/db";
import {
  business,
  subscription,
  usageAiCall,
  communicationLog,
  lead,
  appointment,
  conversation,
} from "@/db/schema";
import { eq, and, sql, count, sum, desc, asc, gte } from "drizzle-orm";
import { requireAdmin } from "@/lib/admin-auth";

/** Generate an array of the last N months as "YYYY-MM" strings */
function lastNMonths(n: number): string[] {
  const months: string[] = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const label = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    months.push(label);
  }
  return months;
}

/** Generate an array of the last N days as "YYYY-MM-DD" strings */
function lastNDays(n: number): string[] {
  const days: string[] = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const label = d.toISOString().slice(0, 10);
    days.push(label);
  }
  return days;
}

/** Convert ISO date string to "YYYY-MM" */
function toMonthLabel(iso: string): string {
  return iso.slice(0, 7);
}

/** Convert ISO date string to "YYYY-MM-DD" */
function toDayLabel(iso: string): string {
  return iso.slice(0, 10);
}

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized — admin only" }, { status: 403 });
  }

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // ── 1. Fetch raw data in parallel ─────────────────────────
  const [
    allBusinesses,
    allSubscriptions,
    allLeads,
    allAppointments,
    allConversations,
    allAiCalls,
    allComms,
  ] = await Promise.all([
    // All businesses (for category breakdown + monthly signups)
    db.select({
      id: business.id,
      name: business.name,
      category: business.category,
      status: business.status,
      onboardingComplete: business.onboardingComplete,
      createdAt: business.createdAt,
    }).from(business).orderBy(desc(business.createdAt)),

    // All subscriptions (for MRR + plan breakdown)
    db.select({
      plan: subscription.plan,
      status: subscription.status,
      amount: subscription.amount,
      businessId: subscription.businessId,
      createdAt: subscription.createdAt,
    }).from(subscription),

    // Leads (last 90 days for conversion metrics)
    db.select({
      id: lead.id,
      businessId: lead.businessId,
      status: lead.status,
      createdAt: lead.createdAt,
    }).from(lead).where(
      gte(lead.createdAt, new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000))
    ),

    // Appointments (last 90 days)
    db.select({
      id: appointment.id,
      businessId: appointment.businessId,
      status: appointment.status,
      createdAt: appointment.createdAt,
    }).from(appointment).where(
      gte(appointment.createdAt, new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000))
    ),

    // Conversations (last 90 days)
    db.select({
      id: conversation.id,
      businessId: conversation.businessId,
      status: conversation.status,
      createdAt: conversation.createdAt,
    }).from(conversation).where(
      gte(conversation.createdAt, new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000))
    ),

    // AI calls (last 60 days for daily chart)
    db.select({
      id: usageAiCall.id,
      businessId: usageAiCall.businessId,
      tokensIn: usageAiCall.tokensIn,
      tokensOut: usageAiCall.tokensOut,
      createdAt: usageAiCall.createdAt,
    }).from(usageAiCall).where(
      gte(usageAiCall.createdAt, new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000))
    ),

    // Communication logs (last 60 days)
    db.select({
      id: communicationLog.id,
      businessId: communicationLog.businessId,
      type: communicationLog.type,
      status: communicationLog.status,
      sentAt: communicationLog.sentAt,
    }).from(communicationLog).where(
      gte(communicationLog.sentAt, new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000))
    ),
  ]);

  // ── 2. Compute analytics ──────────────────────────────────

  // --- Revenue ---
  const activeSubs = allSubscriptions.filter((s) => s.status === "active");
  const mrrCents = activeSubs.reduce((acc, s) => acc + (s.amount || 0), 0);

  // Plan distribution
  const planCounts: Record<string, number> = {};
  for (const s of activeSubs) {
    planCounts[s.plan || "unknown"] = (planCounts[s.plan || "unknown"] || 0) + 1;
  }
  const planBreakdown = Object.entries(planCounts).map(([plan, total]) => ({ plan, total }));

  // --- Business growth (monthly signups, last 12 months) ---
  const months12 = lastNMonths(12);
  const signupsByMonth: Record<string, number> = {};
  const activeByMonth: Record<string, number> = {};
  for (const m of months12) {
    signupsByMonth[m] = 0;
    activeByMonth[m] = 0;
  }
  for (const b of allBusinesses) {
    const month = toMonthLabel(b.createdAt instanceof Date ? b.createdAt.toISOString() : String(b.createdAt));
    if (signupsByMonth[month] !== undefined) signupsByMonth[month]++;
    if (b.status === "active" && activeByMonth[month] !== undefined) activeByMonth[month]++;
  }

  const monthlySignups = months12.map((m) => ({ month: m, total: signupsByMonth[m] }));
  const monthlyActive = months12.map((m) => ({ month: m, total: activeByMonth[m] }));

  // --- Category breakdown ---
  const catCounts: Record<string, number> = {};
  for (const b of allBusinesses) {
    catCounts[b.category || "other"] = (catCounts[b.category || "other"] || 0) + 1;
  }
  const categories = Object.entries(catCounts)
    .sort(([, a], [, b]) => b - a)
    .map(([category, total]) => ({ category, total }));

  // --- Status counts ---
  const statusCounts: Record<string, number> = { active: 0, suspended: 0 };
  for (const b of allBusinesses) {
    const s = b.status || "active";
    statusCounts[s] = (statusCounts[s] || 0) + 1;
  }

  // --- Onboarding rate ---
  const onboardedCount = allBusinesses.filter((b) => b.onboardingComplete).length;

  // --- Daily usage (last 30 days) ---
  const days30 = lastNDays(30);
  const aiCallsByDay: Record<string, number> = {};
  const smsByDay: Record<string, number> = {};
  const emailByDay: Record<string, number> = {};
  for (const d of days30) {
    aiCallsByDay[d] = 0;
    smsByDay[d] = 0;
    emailByDay[d] = 0;
  }
  for (const c of allAiCalls) {
    const day = toDayLabel(c.createdAt instanceof Date ? c.createdAt.toISOString() : String(c.createdAt));
    if (aiCallsByDay[day] !== undefined) aiCallsByDay[day]++;
  }
  for (const c of allComms) {
    const day = toDayLabel(c.sentAt instanceof Date ? c.sentAt.toISOString() : String(c.sentAt));
    if (c.type === "sms" && smsByDay[day] !== undefined) smsByDay[day]++;
    if (c.type === "email" && emailByDay[day] !== undefined) emailByDay[day]++;
  }

  const dailyAiCalls = days30.map((d) => ({ date: d, total: aiCallsByDay[d] }));
  const dailySms = days30.map((d) => ({ date: d, total: smsByDay[d] }));
  const dailyEmails = days30.map((d) => ({ date: d, total: emailByDay[d] }));

  // Total AI tokens
  const totalTokensIn = allAiCalls.reduce((a, c) => a + (c.tokensIn || 0), 0);
  const totalTokensOut = allAiCalls.reduce((a, c) => a + (c.tokensOut || 0), 0);

  // --- Top tenants by AI call volume ---
  const aiByBusiness: Record<string, { name: string; calls: number; tokens: number }> = {};
  for (const c of allAiCalls) {
    if (!aiByBusiness[c.businessId]) {
      aiByBusiness[c.businessId] = { name: "", calls: 0, tokens: 0 };
    }
    aiByBusiness[c.businessId].calls++;
    aiByBusiness[c.businessId].tokens += (c.tokensIn || 0) + (c.tokensOut || 0);
  }
  // Lookup business names
  const bizNameMap = new Map(allBusinesses.map((b) => [b.id, b.name]));
  for (const [id, data] of Object.entries(aiByBusiness)) {
    data.name = bizNameMap.get(id) || "Unknown";
  }

  const topTenants = Object.entries(aiByBusiness)
    .sort(([, a], [, b]) => b.calls - a.calls)
    .slice(0, 10)
    .map(([id, data]) => ({ id, name: data.name, calls: data.calls, tokens: data.tokens }));

  // --- Recent activity feed (last 10 items) ---
  const recentActivity: {
    type: string;
    name: string;
    businessId: string;
    businessName: string;
    detail: string;
    timestamp: string;
  }[] = [];

  // Last 5 signups
  for (const b of allBusinesses.slice(0, 5)) {
    recentActivity.push({
      type: "signup",
      name: b.name || "Unnamed",
      businessId: b.id,
      businessName: b.name || "Unnamed",
      detail: `New business "${b.name}" signed up in ${b.category || "other"}`,
      timestamp: b.createdAt instanceof Date ? b.createdAt.toISOString() : String(b.createdAt),
    });
  }

  // Last 5 leads
  for (const l of allLeads.slice(-5).reverse()) {
    recentActivity.push({
      type: "lead",
      name: `Lead #${l.id.slice(0, 8)}`,
      businessId: l.businessId,
      businessName: bizNameMap.get(l.businessId) || "Unknown",
      detail: `New lead created (status: ${l.status})`,
      timestamp: l.createdAt instanceof Date ? l.createdAt.toISOString() : String(l.createdAt),
    });
  }

  // Last 5 appointments
  for (const a of allAppointments.slice(-5).reverse()) {
    recentActivity.push({
      type: "appointment",
      name: `Appt #${a.id.slice(0, 8)}`,
      businessId: a.businessId,
      businessName: bizNameMap.get(a.businessId) || "Unknown",
      detail: `Appointment booked (status: ${a.status})`,
      timestamp: a.createdAt instanceof Date ? a.createdAt.toISOString() : String(a.createdAt),
    });
  }

  // Sort recent by timestamp descending, take top 20
  recentActivity.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
  const activityFeed = recentActivity.slice(0, 20);

  // --- Conversion metrics ---
  const totalLeads = allLeads.length;
  const leadsConverted = allLeads.filter((l) => l.status === "qualified" || l.status === "converted" || l.status === "scheduled").length;
  const totalAppts = allAppointments.length;
  const apptsCompleted = allAppointments.filter((a) => a.status === "completed").length;
  const totalConversations = allConversations.length;
  const conversationsResolved = allConversations.filter((c) => c.status === "resolved" || c.status === "closed").length;

  // ── 3. Build response ────────────────────────────────────
  return NextResponse.json({
    // Revenue
    revenue: {
      mrrCents,
      mrrDollars: (mrrCents / 100).toFixed(2),
      activeSubscriptions: activeSubs.length,
      planBreakdown,
    },
    // Businesses
    businesses: {
      total: allBusinesses.length,
      active: statusCounts.active || 0,
      suspended: statusCounts.suspended || 0,
      onboarded: onboardedCount,
      onboardingRate: allBusinesses.length > 0
        ? ((onboardedCount / allBusinesses.length) * 100).toFixed(1)
        : "0.0",
      monthlySignups,
      categories,
    },
    // Usage
    usage: {
      aiCallsLast30Days: Object.values(aiCallsByDay).reduce((a, v) => a + v, 0),
      smsLast30Days: Object.values(smsByDay).reduce((a, v) => a + v, 0),
      emailsLast30Days: Object.values(emailByDay).reduce((a, v) => a + v, 0),
      totalTokensIn,
      totalTokensOut,
      dailyAiCalls,
      dailySms,
      dailyEmails,
      topTenants,
    },
    // Activity
    activity: {
      recent: activityFeed,
    },
    // Conversion
    conversion: {
      totalLeads,
      leadsConverted,
      leadConversionRate: totalLeads > 0
        ? ((leadsConverted / totalLeads) * 100).toFixed(1)
        : "0.0",
      totalAppointments: totalAppts,
      appointmentsCompleted: apptsCompleted,
      totalConversations,
      conversationsResolved,
      conversationResolutionRate: totalConversations > 0
        ? ((conversationsResolved / totalConversations) * 100).toFixed(1)
        : "0.0",
    },
  });
}
