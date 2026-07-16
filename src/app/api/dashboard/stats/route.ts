import { NextResponse } from "next/server";
import { db } from "@/db";
import { lead, appointment, conversation, missedCall, automationRule } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { ensureBusiness } from "@/lib/business";

export async function GET() {
  try {
    const businessId = await ensureBusiness();
    if (!businessId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const todayStr = new Date().toISOString().split("T")[0];

    // Parallel queries
    const [leadsList, appointmentsList, conversationsList, missedCalls, rules] = await Promise.all([
      db.select().from(lead).where(eq(lead.businessId, businessId)).orderBy(desc(lead.createdAt)),
      db.select().from(appointment).where(eq(appointment.businessId, businessId)).orderBy(desc(appointment.date)),
      db.select().from(conversation).where(eq(conversation.businessId, businessId)).orderBy(desc(conversation.createdAt)),
      db.select().from(missedCall).where(eq(missedCall.businessId, businessId)).orderBy(desc(missedCall.calledAt)),
      db.select().from(automationRule).where(eq(automationRule.businessId, businessId)),
    ]);

    const totalLeads = leadsList.length;
    const todayAppointments = appointmentsList.filter((a) => a.date === todayStr && a.status !== "cancelled").length;
    const upcomingAppointments = appointmentsList.filter((a) => a.date >= todayStr && a.status !== "cancelled").length;
    const recentConversations = conversationsList.length;
    const missedCallsCount = missedCalls.filter((m) => !m.handled).length;
    const pendingFollowUps = rules.filter((r) => r.enabled).length;

    // Pipeline counts
    const pipelineStatuses = ["new", "contacted", "appointment_booked", "quote_sent", "won", "lost"];
    const leadPipeline = pipelineStatuses
      .map((status) => ({
        status,
        count: leadsList.filter((l) => l.status === status).length,
      }))
      .filter((s) => s.count > 0);

    // Recent leads
    const recentLeads = leadsList.slice(0, 5).map((l) => ({
      id: l.id,
      name: l.name,
      serviceRequest: l.serviceRequest,
      status: l.status,
      createdAt: l.createdAt?.toString() || "",
    }));

    // Upcoming appointments
    const upcomingAppts = appointmentsList
      .filter((a) => a.date >= todayStr && a.status !== "cancelled")
      .slice(0, 5)
      .map((a) => ({
        id: a.id,
        customerName: a.customerName,
        service: a.service,
        date: a.date,
        startTime: a.startTime,
        status: a.status,
      }));

    // Weekly leads trend (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const weekLeads = leadsList.filter((l) => new Date(l.createdAt) >= sevenDaysAgo);
    const prevWeekLeads = leadsList.filter(
      (l) =>
        new Date(l.createdAt) >= new Date(sevenDaysAgo.getTime() - 7 * 86400000) &&
        new Date(l.createdAt) < sevenDaysAgo
    );

    // Weekly breakdown
    const weeklyLeads = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(sevenDaysAgo);
      d.setDate(d.getDate() + i);
      const dayStr = d.toISOString().split("T")[0];
      return weekLeads.filter((l) => new Date(l.createdAt).toISOString().split("T")[0] === dayStr).length;
    });

    const weeklyChange = prevWeekLeads.length > 0
      ? Math.round(((weekLeads.length - prevWeekLeads.length) / prevWeekLeads.length) * 100)
      : weekLeads.length > 0 ? 100 : 0;

    return NextResponse.json({
      totalLeads,
      todayAppointments,
      upcomingAppointments,
      recentConversations,
      missedCalls: missedCallsCount,
      pendingFollowUps,
      leadPipeline,
      recentLeads,
      upcomingAppts,
      weeklyLeads,
      weeklyChange,
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);
    return NextResponse.json({ error: "Failed to fetch dashboard stats" }, { status: 500 });
  }
}