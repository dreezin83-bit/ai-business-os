/**
 * GET /api/admin/stats — aggregate platform stats + analytics (consolidated)
 * Requires: Clerk admin role
 */
import { NextResponse } from "next/server";
import { db } from "@/db";
import {
  business, subscription, usageAiCall, communicationLog,
  lead, appointment, conversation,
} from "@/db/schema";
import { eq, and, sql, count, sum, gte, desc } from "drizzle-orm";
import { requireAdmin } from "@/lib/admin-auth";

const lastNMonths = (n: number): string[] => {
  const m: string[] = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    m.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  return m;
};
const lastNDays = (n: number): string[] => {
  const d: string[] = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const dt = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    d.push(dt.toISOString().slice(0, 10));
  }
  return d;
};
const tm = (iso: string) => iso.slice(0, 7);
const td = (iso: string) => iso.slice(0, 10);

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized — admin only" }, { status: 403 });

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  today.setHours(0, 0, 0, 0);
  const ws = new Date(today);
  ws.setDate(ws.getDate() - ws.getDay());
  ws.setHours(0, 0, 0, 0);
  const ms = new Date(today.getFullYear(), today.getMonth(), 1);
  const d90 = new Date(now.getTime() - 90 * 86400000);
  const d60 = new Date(now.getTime() - 60 * 86400000);

  const [
    tb, ab, sb, ts, mr,
    at, aw, smt, emt, nw, nm,
    allb, subs,
    leads, appts, convs, aic, comms,
  ] = await Promise.all([
    db.select({ total: count() }).from(business),
    db.select({ total: count() }).from(business).where(eq(business.status, "active")),
    db.select({ total: count() }).from(business).where(eq(business.status, "suspended")),
    db.select({ total: count() }).from(subscription).where(eq(subscription.status, "active")),
    db.select({ total: sum(subscription.amount) }).from(subscription).where(eq(subscription.status, "active")),
    db.select({ total: count() }).from(usageAiCall).where(sql`${usageAiCall.createdAt} >= ${today.toISOString()}`),
    db.select({ total: count() }).from(usageAiCall).where(sql`${usageAiCall.createdAt} >= ${ws.toISOString()}`),
    db.select({ total: count() }).from(communicationLog).where(and(eq(communicationLog.type, "sms"), sql`${communicationLog.sentAt} >= ${today.toISOString()}`)),
    db.select({ total: count() }).from(communicationLog).where(and(eq(communicationLog.type, "email"), sql`${communicationLog.sentAt} >= ${today.toISOString()}`)),
    db.select({ total: count() }).from(business).where(sql`${business.createdAt} >= ${ws.toISOString()}`),
    db.select({ total: count() }).from(business).where(sql`${business.createdAt} >= ${ms.toISOString()}`),
    db.select({ id: business.id, name: business.name, category: business.category, status: business.status, onboardingComplete: business.onboardingComplete, createdAt: business.createdAt }).from(business).orderBy(desc(business.createdAt)),
    db.select({ plan: subscription.plan, amount: subscription.amount }).from(subscription).where(eq(subscription.status, "active")),
    db.select({ id: lead.id, businessId: lead.businessId, status: lead.status, createdAt: lead.createdAt }).from(lead).where(gte(lead.createdAt, d90)),
    db.select({ id: appointment.id, businessId: appointment.businessId, status: appointment.status, createdAt: appointment.createdAt }).from(appointment).where(gte(appointment.createdAt, d90)),
    db.select({ id: conversation.id, businessId: conversation.businessId, status: conversation.status, createdAt: conversation.createdAt }).from(conversation).where(gte(conversation.createdAt, d90)),
    db.select({ id: usageAiCall.id, businessId: usageAiCall.businessId, tokensIn: usageAiCall.tokensIn, tokensOut: usageAiCall.tokensOut, createdAt: usageAiCall.createdAt }).from(usageAiCall).where(gte(usageAiCall.createdAt, d60)),
    db.select({ id: communicationLog.id, businessId: communicationLog.businessId, type: communicationLog.type, status: communicationLog.status, sentAt: communicationLog.sentAt }).from(communicationLog).where(gte(communicationLog.sentAt, d60)),
  ]);

  const b = { total: tb[0]?.total || 0, active: ab[0]?.total || 0, suspended: sb[0]?.total || 0 };
  const s = { active: ts[0]?.total || 0, mrrCents: Number(mr[0]?.total || 0), mrrDollars: (Number(mr[0]?.total || 0) / 100).toFixed(2) };
  const a = { aiCallsToday: at[0]?.total || 0, aiCallsThisWeek: aw[0]?.total || 0, smsSentToday: smt[0]?.total || 0, emailsSentToday: emt[0]?.total || 0 };
  const su = { thisWeek: nw[0]?.total || 0, thisMonth: nm[0]?.total || 0 };

  const pc: Record<string, number> = {};
  for (const x of subs) pc[x.plan || "unknown"] = (pc[x.plan || "unknown"] || 0) + 1;
  const pb = Object.entries(pc).map(([plan, total]) => ({ plan, total }));

  const m12 = lastNMonths(12);
  const sbm: Record<string, number> = {};
  for (const m of m12) sbm[m] = 0;
  for (const bz of allb) {
    const m = tm(bz.createdAt instanceof Date ? bz.createdAt.toISOString() : String(bz.createdAt));
    if (sbm[m] !== undefined) sbm[m]++;
  }
  const cc: Record<string, number> = {};
  for (const bz of allb) cc[bz.category || "other"] = (cc[bz.category || "other"] || 0) + 1;
  const cats = Object.entries(cc).sort(([, x], [, y]) => y - x).map(([category, total]) => ({ category, total }));
  const onb = allb.filter((bz) => bz.onboardingComplete).length;

  const d30 = lastNDays(30);
  const acbd: Record<string, number> = {}, smbd: Record<string, number> = {}, embd: Record<string, number> = {};
  for (const d of d30) { acbd[d] = 0; smbd[d] = 0; embd[d] = 0; }
  for (const c of aic) {
    const day = td(c.createdAt instanceof Date ? c.createdAt.toISOString() : String(c.createdAt));
    if (acbd[day] !== undefined) acbd[day]++;
  }
  for (const c of comms) {
    const day = td(c.sentAt instanceof Date ? c.sentAt.toISOString() : String(c.sentAt));
    if (c.type === "sms" && smbd[day] !== undefined) smbd[day]++;
    if (c.type === "email" && embd[day] !== undefined) embd[day]++;
  }

  const bnm = new Map(allb.map((bz) => [bz.id, bz.name]));
  const abb: Record<string, { name: string; calls: number; tokens: number }> = {};
  for (const c of aic) {
    if (!abb[c.businessId]) abb[c.businessId] = { name: bnm.get(c.businessId) || "Unknown", calls: 0, tokens: 0 };
    abb[c.businessId].calls++;
    abb[c.businessId].tokens += (c.tokensIn || 0) + (c.tokensOut || 0);
  }
  const tt = Object.entries(abb).sort(([, x], [, y]) => y.calls - x.calls).slice(0, 10).map(([id, d]) => ({ id, name: d.name, calls: d.calls, tokens: d.tokens }));

  const ra: { type: string; name: string; businessId: string; businessName: string; detail: string; timestamp: string }[] = [];
  for (const bz of allb.slice(0, 5)) {
    ra.push({ type: "signup", name: bz.name || "Unnamed", businessId: bz.id, businessName: bz.name || "Unnamed", detail: `New business "${bz.name}"`, timestamp: bz.createdAt instanceof Date ? bz.createdAt.toISOString() : String(bz.createdAt) });
  }
  for (const l of leads.slice(-5).reverse()) {
    ra.push({ type: "lead", name: `Lead #${l.id.slice(0, 8)}`, businessId: l.businessId, businessName: bnm.get(l.businessId) || "Unknown", detail: `Lead (${l.status})`, timestamp: l.createdAt instanceof Date ? l.createdAt.toISOString() : String(l.createdAt) });
  }
  for (const ap of appts.slice(-5).reverse()) {
    ra.push({ type: "appointment", name: `Appt #${ap.id.slice(0, 8)}`, businessId: ap.businessId, businessName: bnm.get(ap.businessId) || "Unknown", detail: `Appointment (${ap.status})`, timestamp: ap.createdAt instanceof Date ? ap.createdAt.toISOString() : String(ap.createdAt) });
  }
  ra.sort((x, y) => new Date(y.timestamp).getTime() - new Date(x.timestamp).getTime());

  const tl = leads.length;
  const lc = leads.filter((l) => ["qualified", "converted", "scheduled"].includes(l.status)).length;
  const ta = appts.length;
  const ac = appts.filter((ap) => ap.status === "completed").length;
  const tc = convs.length;
  const cr = convs.filter((c) => c.status === "resolved" || c.status === "closed").length;

  return NextResponse.json({
    businesses: {
      ...b, onboarded: onb,
      onboardingRate: allb.length ? ((onb / allb.length) * 100).toFixed(1) : "0.0",
      monthlySignups: m12.map((m) => ({ month: m, total: sbm[m] })),
      categories: cats,
    },
    subscriptions: { ...s, planBreakdown: pb },
    activity: { ...a, recent: ra.slice(0, 20) },
    signups: su,
    usage: {
      dailyAiCalls: d30.map((d) => ({ date: d, total: acbd[d] })),
      dailySms: d30.map((d) => ({ date: d, total: smbd[d] })),
      dailyEmails: d30.map((d) => ({ date: d, total: embd[d] })),
      aiCallsLast30Days: Object.values(acbd).reduce((x, v) => x + v, 0),
      smsLast30Days: Object.values(smbd).reduce((x, v) => x + v, 0),
      emailsLast30Days: Object.values(embd).reduce((x, v) => x + v, 0),
      topTenants: tt,
    },
    conversion: {
      totalLeads: tl, leadsConverted: lc,
      leadConversionRate: tl ? ((lc / tl) * 100).toFixed(1) : "0.0",
      totalAppointments: ta, appointmentsCompleted: ac,
      totalConversations: tc, conversationsResolved: cr,
      conversationResolutionRate: tc ? ((cr / tc) * 100).toFixed(1) : "0.0",
    },
  });
}
