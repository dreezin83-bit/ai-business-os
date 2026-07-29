"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  Calendar,
  MessageSquare,
  Phone,
  Bot,
  TrendingUp,
  ArrowRight,
  Loader2,
  BarChart3,
  Zap,
  Clock,
  PhoneMissed,
} from "lucide-react";
import { getStatusColor, getStatusLabel } from "@/lib/utils";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface DashboardStats {
  totalLeads: number;
  todayAppointments: number;
  upcomingAppointments: number;
  recentConversations: number;
  missedCalls: number;
  pendingFollowUps: number;
  leadPipeline: { status: string; count: number }[];
  recentLeads: { id: string; name: string; serviceRequest: string; status: string; createdAt: string }[];
  upcomingAppts: { id: string; customerName: string; service: string; date: string; startTime: string; status: string }[];
  weeklyLeads: number[];
  weeklyChange: number;
}

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function getDayLabels(): string[] {
  const today = new Date().getDay();
  const labels: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    labels.push(DAY_LABELS[d.getDay()]);
  }
  return labels;
}

function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 animate-pulse">
      <div className="flex items-center justify-between mb-4">
        <div className="h-3 w-20 bg-white/[0.06] rounded" />
        <div className="h-9 w-9 rounded-xl bg-white/[0.04]" />
      </div>
      <div className="h-7 w-16 bg-white/[0.06] rounded mb-2" />
      <div className="h-3 w-24 bg-white/[0.04] rounded" />
    </div>
  );
}

function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 p-3 animate-pulse">
      <div className="h-8 w-8 rounded-lg bg-white/[0.06]" />
      <div className="flex-1 space-y-1.5">
        <div className="h-3.5 w-32 bg-white/[0.06] rounded" />
        <div className="h-2.5 w-48 bg-white/[0.04] rounded" />
      </div>
    </div>
  );
}

export default function OverviewPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard/stats")
      .then((r) => r.json())
      .then((d) => {
        setStats(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Build chart data
  const dayLabels = getDayLabels();
  const chartData = stats
    ? stats.weeklyLeads.map((count, i) => ({
        day: dayLabels[i],
        leads: count,
      }))
    : [];

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div>
          <div className="h-7 w-40 bg-white/[0.06] rounded mb-2" />
          <div className="h-4 w-64 bg-white/[0.04] rounded" />
        </div>
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader><div className="h-4 w-32 bg-white/[0.06] rounded" /></CardHeader>
            <CardContent><div className="h-48 bg-white/[0.03] rounded-xl" /></CardContent>
          </Card>
          <Card>
            <CardHeader><div className="h-4 w-32 bg-white/[0.06] rounded" /></CardHeader>
            <CardContent className="space-y-2">
              <SkeletonRow /><SkeletonRow /><SkeletonRow />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-5">
        <div className="h-14 w-14 rounded-2xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center">
          <BarChart3 className="h-6 w-6 text-white/20" />
        </div>
        <p className="text-sm text-white/40">Failed to load overview</p>
        <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
          Retry
        </Button>
      </div>
    );
  }

  // Derived metrics
  const leadsCaptured = stats.totalLeads;
  const appointmentsBooked = stats.todayAppointments + stats.upcomingAppointments;
  const conversationsHandled = stats.recentConversations;
  const responseRate = stats.totalLeads > 0
    ? Math.round((conversationsHandled / stats.totalLeads) * 100)
    : 0;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <TrendingUp className="h-6 w-6" /> Business Overview
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Your business at a glance — leads, appointments, and AI performance.
        </p>
      </div>

      {/* Section 1: Business Overview — 4 clickable stat cards */}
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-white/25 mb-3">
          Business Overview
        </p>
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          {/* Active Leads */}
          <Link href="/dashboard/leads" className="group">
            <div className="stat-card cursor-pointer group-hover:border-blue-500/20 group-hover:bg-blue-500/[0.03] transition-all duration-300">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] text-white/40 font-semibold uppercase tracking-widest">Active Leads</span>
                <div className="h-9 w-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <Users className="h-4 w-4 text-blue-400" />
                </div>
              </div>
              <div className="text-2xl font-bold text-white">{stats.totalLeads}</div>
              <p className="text-[11px] text-white/30 mt-1 flex items-center gap-1">
                <span className={stats.weeklyChange >= 0 ? "text-emerald-400" : "text-red-400"}>
                  {stats.weeklyChange >= 0 ? "+" : ""}{stats.weeklyChange}%
                </span>
                vs last week
              </p>
            </div>
          </Link>

          {/* Appointments Today */}
          <Link href="/dashboard/appointments" className="group">
            <div className="stat-card cursor-pointer group-hover:border-purple-500/20 group-hover:bg-purple-500/[0.03] transition-all duration-300">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] text-white/40 font-semibold uppercase tracking-widest">Today&apos;s Appts</span>
                <div className="h-9 w-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <Calendar className="h-4 w-4 text-purple-400" />
                </div>
              </div>
              <div className="text-2xl font-bold text-white">{stats.todayAppointments}</div>
              <p className="text-[11px] text-white/30 mt-1">
                {stats.upcomingAppointments} upcoming
              </p>
            </div>
          </Link>

          {/* Messages Today */}
          <Link href="/dashboard/messages" className="group">
            <div className="stat-card cursor-pointer group-hover:border-emerald-500/20 group-hover:bg-emerald-500/[0.03] transition-all duration-300">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] text-white/40 font-semibold uppercase tracking-widest">Messages</span>
                <div className="h-9 w-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <MessageSquare className="h-4 w-4 text-emerald-400" />
                </div>
              </div>
              <div className="text-2xl font-bold text-white">{stats.recentConversations}</div>
              <p className="text-[11px] text-white/30 mt-1">
                AI conversations
              </p>
            </div>
          </Link>

          {/* Call Volume */}
          <Link href="/dashboard/missed-calls" className="group">
            <div className="stat-card cursor-pointer group-hover:border-amber-500/20 group-hover:bg-amber-500/[0.03] transition-all duration-300">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] text-white/40 font-semibold uppercase tracking-widest">Call Volume</span>
                <div className="h-9 w-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <Phone className="h-4 w-4 text-amber-400" />
                </div>
              </div>
              <div className="text-2xl font-bold text-white">
                {stats.missedCalls + stats.recentConversations}
              </div>
              <p className="text-[11px] text-white/30 mt-1">
                <span className="text-amber-400">{stats.missedCalls}</span> missed
              </p>
            </div>
          </Link>
        </div>
      </div>

      {/* Section 2: AI Performance — 4 metric cards */}
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-white/25 mb-3">
          AI Performance
        </p>
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <div className="stat-card">
            <div className="flex items-center gap-2 mb-2">
              <Bot className="h-3.5 w-3.5 text-blue-400" />
              <span className="text-[10px] text-white/40 font-semibold uppercase tracking-widest">Conversations</span>
            </div>
            <div className="text-xl font-bold text-white">{conversationsHandled}</div>
            <p className="text-[11px] text-white/25 mt-0.5">AI handled</p>
          </div>

          <div className="stat-card">
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-3.5 w-3.5 text-emerald-400" />
              <span className="text-[10px] text-white/40 font-semibold uppercase tracking-widest">Leads Captured</span>
            </div>
            <div className="text-xl font-bold text-white">{leadsCaptured}</div>
            <p className="text-[11px] text-white/25 mt-0.5">by AI chatbot</p>
          </div>

          <div className="stat-card">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="h-3.5 w-3.5 text-purple-400" />
              <span className="text-[10px] text-white/40 font-semibold uppercase tracking-widest">Appts Booked</span>
            </div>
            <div className="text-xl font-bold text-white">{appointmentsBooked}</div>
            <p className="text-[11px] text-white/25 mt-0.5">total scheduled</p>
          </div>

          <div className="stat-card">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="h-3.5 w-3.5 text-amber-400" />
              <span className="text-[10px] text-white/40 font-semibold uppercase tracking-widest">Response Rate</span>
            </div>
            <div className="text-xl font-bold text-white">{responseRate}%</div>
            <div className="mt-1.5 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-500 rounded-full transition-all duration-700"
                style={{ width: `${Math.min(responseRate, 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Section 3 & 4: Chart + Activity */}
      <div className="grid gap-4 lg:grid-cols-5">
        {/* Call Analytics Chart */}
        <Card className="lg:col-span-3">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-blue-400" />
                Lead Activity
              </CardTitle>
              <span className="text-[10px] text-white/30">Last 7 days</span>
            </div>
          </CardHeader>
          <CardContent>
            {chartData.every((d) => d.leads === 0) ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <BarChart3 className="h-8 w-8 text-white/10 mb-2" />
                <p className="text-xs text-white/30">No lead activity this week</p>
              </div>
            ) : (
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 100% / 0.04)" vertical={false} />
                    <XAxis
                      dataKey="day"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "hsl(0 0% 100% / 0.25)", fontSize: 11 }}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "hsl(0 0% 100% / 0.2)", fontSize: 10 }}
                      allowDecimals={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(0 0% 3%)",
                        border: "1px solid hsl(0 0% 100% / 0.08)",
                        borderRadius: "12px",
                        fontSize: "12px",
                        color: "hsl(0 0% 93%)",
                      }}
                      cursor={{ fill: "hsl(0 0% 100% / 0.03)" }}
                    />
                    <Bar
                      dataKey="leads"
                      fill="hsl(217 91% 60%)"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={36}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Customer Activity */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Clock className="h-4 w-4 text-purple-400" />
                Recent Activity
              </CardTitle>
              <Link href="/dashboard/leads">
                <Button variant="ghost" size="sm" className="text-xs text-white/40 hover:text-white gap-1 h-7">
                  View all <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-1">
            {stats.recentLeads.length === 0 && stats.upcomingAppts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Clock className="h-8 w-8 text-white/10 mb-2" />
                <p className="text-xs text-white/30">No recent activity</p>
              </div>
            ) : (
              <>
                {/* Recent Leads */}
                {stats.recentLeads.slice(0, 3).map((lead) => (
                  <Link
                    key={lead.id}
                    href={`/dashboard/leads/${lead.id}`}
                    className="flex items-center justify-between p-2.5 rounded-xl hover:bg-white/[0.03] transition-colors group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-8 w-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-[10px] font-semibold text-blue-400 shrink-0">
                        {lead.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-white/80 truncate">{lead.name}</p>
                        <p className="text-[11px] text-white/30 truncate">
                          {lead.serviceRequest || "New lead"}
                        </p>
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className={`${getStatusColor(lead.status)} text-white text-[10px] border-0 shrink-0 ml-2`}
                    >
                      {getStatusLabel(lead.status)}
                    </Badge>
                  </Link>
                ))}

                {/* Upcoming Appointments */}
                {stats.upcomingAppts.slice(0, 2).map((apt) => (
                  <Link
                    key={apt.id}
                    href="/dashboard/appointments"
                    className="flex items-center justify-between p-2.5 rounded-xl hover:bg-white/[0.03] transition-colors group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-8 w-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-[10px] font-semibold text-purple-400 shrink-0">
                        {apt.customerName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-white/80 truncate">{apt.customerName}</p>
                        <p className="text-[11px] text-white/30 truncate">
                          {apt.service} &middot; {apt.date} at {apt.startTime}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-[10px] border-white/[0.08] text-white/35 shrink-0 ml-2">
                      {getStatusLabel(apt.status)}
                    </Badge>
                  </Link>
                ))}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick insights strip */}
      <div className="flex items-center gap-3 bg-white/[0.02] border border-white/[0.06] rounded-xl px-4 py-3">
        <div className="h-8 w-8 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
          <Zap className="h-3.5 w-3.5 text-amber-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-white/70">
            {stats.missedCalls > 0
              ? `You have ${stats.missedCalls} missed calls — set up call forwarding to never miss a lead.`
              : stats.totalLeads === 0
              ? "Get started by setting up your AI chatbot to capture leads 24/7."
              : stats.pendingFollowUps > 0
              ? `${stats.pendingFollowUps} automation rules active — your AI is working around the clock.`
              : "Your AI is handling conversations. Check lead activity above for trends."}
          </p>
        </div>
        {stats.missedCalls > 0 && (
          <Link href="/dashboard/missed-calls">
            <Button size="sm" className="h-8 text-xs">
              <PhoneMissed className="h-3 w-3 mr-1" />
              Setup
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
}
