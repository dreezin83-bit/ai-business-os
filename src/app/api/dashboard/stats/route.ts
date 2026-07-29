import { NextResponse } from "next/server";
import { db } from "@/db";
import { lead, appointment, conversation, communicationLog } from "@/db/schema";
import { eq, and, gte, lte, sql, desc } from "drizzle-orm";
import { ensureBusiness } from "@/lib/business";

/**
 * GET /api/dashboard/stats
 * Returns real-time stats for the Business Overview dashboard.
 * All data scoped to the authenticated user's business.
 */
export async function GET() {
  try {
    const businessId = await ensureBusiness();
    if (!businessId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split("T")[0];

    // ─── Date ranges for weekly chart ───
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    const sevenDaysAgoStr = sevenDaysAgo.toISOString().split("T")[0];

    const fourteenDaysAgo = new Date(today);
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 13);
    const fourteenDaysAgoStr = fourteenDaysAgo.toISOString().split("T")[0];

    // ─── Run all queries in parallel ───
    const [
      totalLeadsResult,
      todayAppts,
      upcomingAppts,
      activeConvos,
      missedCalls,
      pendingFollowUps,
      pipelineData,
      recentLeads,
      upcomingApptsList,
      thisWeekLeads,
      lastWeekLeads,
    ] = await Promise.all([
      // Total lead count
      db.select({ count: sql<number>`count(*)::int` }).from(lead).where(eq(lead.businessId, businessId)),

      // Today's appointments
      db.select({ count: sql<number>`count(*)::int` }).from(appointment).where(
        and(eq(appointment.businessId, businessId), eq(appointment.date, todayStr), eq(appointment.status, "scheduled"))
      ),

      // Upcoming appointments (today onward, scheduled)
      db.select({ count: sql<number>`count(*)::int` }).from(appointment).where(
        and(eq(appointment.businessId, businessId), gte(appointment.date, todayStr), eq(appointment.status, "scheduled"))
      ),

      // Active conversations (last 7 days)
      db.select({ count: sql<number>`count(*)::int` }).from(conversation).where(
        and(eq(conversation.businessId, businessId), gte(conversation.createdAt, sevenDaysAgo))
      ),

      // Missed/bounced communication logs (proxy for missed calls)
      db.select({ count: sql<number>`count(*)::int` }).from(communicationLog).where(
        and(eq(communicationLog.businessId, businessId), eq(communicationLog.status, "failed"))
      ),

      // Pending follow-ups (leads needing action)
      db.select({ count: sql<number>`count(*)::int` }).from(lead).where(
        and(eq(lead.businessId, businessId), sql`${lead.status} IN ('new', 'contacted')`)
      ),

      // Lead pipeline (grouped by status)
      db.select({ status: lead.status, count: sql<number>`count(*)::int` }).from(lead).where(
        eq(lead.businessId, businessId)
      ).groupBy(lead.status),

      // Recent leads (last 5)
      db.select({ id: lead.id, name: lead.name, serviceRequest: lead.serviceRequest, status: lead.status, createdAt: lead.createdAt })
        .from(lead).where(eq(lead.businessId, businessId)).orderBy(desc(lead.createdAt)).limit(5),

      // Upcoming appointments (next 5)
      db.select({ id: appointment.id, customerName: appointment.customerName, service: appointment.service, date: appointment.date, startTime: appointment.startTime, status: appointment.status })
        .from(appointment).where(and(eq(appointment.businessId, businessId), gte(appointment.date, todayStr))).orderBy(sql`${appointment.date} ASC, ${appointment.startTime} ASC`).limit(5),

      // This week's daily lead counts
      db.select({ date: sql<string>`${lead.createdAt}::date`, count: sql<number>`count(*)::int` }).from(lead).where(
        and(eq(lead.businessId, businessId), gte(lead.createdAt, sevenDaysAgo))
      ).groupBy(sql`${lead.createdAt}::date`).orderBy(sql`${lead.createdAt}::date`),

      // Last week's lead count (for week-over-week comparison)
      db.select({ count: sql<number>`count(*)::int` }).from(lead).where(
        and(
          eq(lead.businessId, businessId),
          gte(lead.createdAt, fourteenDaysAgo),
          lte(lead.createdAt, new Date(sevenDaysAgo.getTime() - 1))
        )
      ),
    ]);

    // ─── Build weekly chart data (fill gaps for days with 0 leads) ───
    const weeklyMap = new Map<string, number>();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split("T")[0];
      weeklyMap.set(key, 0);
    }
    for (const row of thisWeekLeads) {
      const dateStr = typeof row.date === "string" ? row.date.substring(0, 10) : row.date;
      weeklyMap.set(dateStr, Number(row.count));
    }
    const weeklyLeads = Array.from(weeklyMap.values());

    // ─── Week-over-week change ───
    const thisWeekTotal = thisWeekLeads.reduce((sum, r) => sum + Number(r.count), 0);
    const lastWeekTotal = Number(lastWeekLeads[0]?.count ?? 0);
    const weeklyChange = lastWeekTotal > 0
      ? Math.round(((thisWeekTotal - lastWeekTotal) / lastWeekTotal) * 100)
      : thisWeekTotal > 0 ? 100 : 0;

    return NextResponse.json({
      totalLeads: Number(totalLeadsResult[0]?.count ?? 0),
      todayAppointments: Number(todayAppts[0]?.count ?? 0),
      upcomingAppointments: Number(upcomingAppts[0]?.count ?? 0),
      recentConversations: Number(activeConvos[0]?.count ?? 0),
      missedCalls: Number(missedCalls[0]?.count ?? 0),
      pendingFollowUps: Number(pendingFollowUps[0]?.count ?? 0),
      leadPipeline: pipelineData.map(r => ({ status: r.status, count: Number(r.count) })),
      recentLeads: recentLeads.map(l => ({
        id: l.id,
        name: l.name,
        serviceRequest: l.serviceRequest || "",
        status: l.status,
        createdAt: l.createdAt?.toISOString() ?? "",
      })),
      upcomingAppts: upcomingApptsList.map(a => ({
        id: a.id,
        customerName: a.customerName,
        service: a.service,
        date: a.date,
        startTime: a.startTime,
        status: a.status,
      })),
      weeklyLeads,
      weeklyChange,
    });
  } catch (error: any) {
    console.error("[dashboard/stats] Error:", error?.message);
    return NextResponse.json({ error: "Failed to load dashboard stats" }, { status: 500 });
  }
}
