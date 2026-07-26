"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Users, Calendar, Bot, ArrowRight, Zap, DollarSign,
  BarChart3, MessageSquare, Sparkles, PlusCircle, Loader2,
} from "lucide-react";
import Link from "next/link";
import { getStatusColor, getStatusLabel } from "@/lib/utils";

interface DashboardStats {
  totalLeads: number; todayAppointments: number; upcomingAppointments: number;
  recentConversations: number; missedCalls: number; pendingFollowUps: number;
  leadPipeline: { status: string; count: number }[];
  recentLeads: { id: string; name: string; serviceRequest: string; status: string; createdAt: string }[];
  upcomingAppts: { id: string; customerName: string; service: string; date: string; startTime: string; status: string }[];
  weeklyLeads: number[]; weeklyChange: number;
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard/stats")
      .then((r) => r.json())
      .then((d) => { setStats(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-5">
      <Loader2 className="h-6 w-6 animate-spin text-white/20" />
      <p className="text-sm text-white/20">Loading your dashboard...</p>
    </div>
  );

  if (!stats) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-5">
      <div className="h-14 w-14 rounded-2xl bg-white/[0.03] border border-white/[0.05] flex items-center justify-center">
        <BarChart3 className="h-6 w-6 text-white/10" />
      </div>
      <p className="text-sm text-white/30">Failed to load dashboard</p>
      <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
        Retry
      </Button>
    </div>
  );

  const statCards = [
    { label: "Total Leads", value: stats.totalLeads, icon: Users, color: "text-blue-400", glow: "shadow-blue-500/5" },
    { label: "Today's Appts", value: stats.todayAppointments, icon: Calendar, color: "text-purple-400", glow: "shadow-purple-500/5" },
    { label: "Est. Revenue", value: `$${(stats.totalLeads * 1800).toLocaleString()}`, icon: DollarSign, color: "text-amber-400", glow: "shadow-amber-500/5" },
    { label: "Conversations", value: stats.recentConversations, icon: Bot, color: "text-green-400", glow: "shadow-green-500/5" },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            {getGreeting()} <span className="text-white/30">👋</span>
          </h1>
          <p className="text-sm text-white/25 mt-1">Here&apos;s what&apos;s happening with your business today.</p>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        {statCards.map((s) => (
          <div
            key={s.label}
            className={`stat-card ${s.glow} group cursor-default`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] text-white/25 font-semibold uppercase tracking-widest">{s.label}</span>
              <div className={`h-8 w-8 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center group-hover:scale-105 transition-transform duration-300`}>
                <s.icon className={`h-3.5 w-3.5 ${s.color}`} />
              </div>
            </div>
            <div className="text-2xl font-bold text-white tracking-tight">{s.value}</div>
            <p className={`text-[11px] mt-1 ${s.color.replace("text", "text")}/30`}>
              {s.label === "Total Leads" ? "+12% this month" :
               s.label === "Today's Appts" ? `${stats.upcomingAppointments} upcoming` :
               s.label === "Est. Revenue" ? "based on avg job" :
               "AI chats this week"}
            </p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Recent Leads */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Leads</CardTitle>
            <Link href="/dashboard/leads">
              <Button variant="ghost" size="sm" className="text-xs gap-1">
                View all <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {stats.recentLeads.length === 0 ? (
              <div className="text-center py-8">
                <div className="h-12 w-12 rounded-2xl bg-white/[0.03] border border-white/[0.04] flex items-center justify-center mx-auto mb-3">
                  <Users className="h-5 w-5 text-white/10" />
                </div>
                <p className="text-sm text-white/20 mb-1">No leads yet</p>
                <p className="text-xs text-white/10 mb-4">When your AI captures leads, they&apos;ll appear here.</p>
                <Link href="/dashboard/chatbot">
                  <Button size="sm" className="text-xs h-8 rounded-full bg-white/[0.06] hover:bg-white/[0.1] text-white/60">
                    <MessageSquare className="h-3 w-3 mr-1.5" /> Set up chatbot
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-0.5">
                {stats.recentLeads.slice(0, 5).map((lead) => (
                  <Link
                    key={lead.id}
                    href={`/dashboard/leads/${lead.id}`}
                    className="flex items-center justify-between p-3 rounded-xl hover:bg-white/[0.04] transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="h-7 w-7 rounded-lg bg-white/[0.04] border border-white/[0.05] flex items-center justify-center text-[10px] font-medium text-white/30 shrink-0">
                        {lead.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-white/70 truncate">{lead.name}</p>
                        <p className="text-xs text-white/20 truncate">{lead.serviceRequest || "No description"}</p>
                      </div>
                    </div>
                    <Badge variant="outline" className={`${getStatusColor(lead.status)} text-white text-[10px] border-0 shrink-0`}>
                      {getStatusLabel(lead.status)}
                    </Badge>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pipeline */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Pipeline</CardTitle>
            <Link href="/dashboard/leads">
              <Button variant="ghost" size="sm" className="text-xs gap-1">
                View all <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {stats.leadPipeline.length === 0 ? (
              <div className="text-center py-8">
                <div className="h-12 w-12 rounded-2xl bg-white/[0.03] border border-white/[0.04] flex items-center justify-center mx-auto mb-3">
                  <BarChart3 className="h-5 w-5 text-white/10" />
                </div>
                <p className="text-sm text-white/20 mb-1">Pipeline empty</p>
                <p className="text-xs text-white/10">Leads will move through stages automatically.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {stats.leadPipeline.map((stage) => {
                  const pct = Math.min((stage.count / Math.max(stats.totalLeads, 1)) * 100, 100);
                  return (
                    <div key={stage.status} className="group">
                      <div className="flex items-center gap-3 mb-1.5">
                        <div className={`h-2 w-2 rounded-full ${getStatusColor(stage.status)}`} />
                        <span className="text-sm text-white/50 flex-1">{getStatusLabel(stage.status)}</span>
                        <span className="text-sm font-semibold text-white/70 tabular-nums">{stage.count}</span>
                      </div>
                      <div className="h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${getStatusColor(stage.status)} transition-all duration-500 group-hover:brightness-125`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Appointments */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Upcoming Appointments</CardTitle>
            <Link href="/dashboard/appointments">
              <Button variant="ghost" size="sm" className="text-xs gap-1">
                View all <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {stats.upcomingAppts.length === 0 ? (
              <div className="text-center py-8">
                <div className="h-12 w-12 rounded-2xl bg-white/[0.03] border border-white/[0.04] flex items-center justify-center mx-auto mb-3">
                  <Calendar className="h-5 w-5 text-white/10" />
                </div>
                <p className="text-sm text-white/20 mb-1">No appointments</p>
                <p className="text-xs text-white/10">Customers can book through your AI chatbot.</p>
              </div>
            ) : (
              <div className="space-y-0.5">
                {stats.upcomingAppts.slice(0, 5).map((apt) => (
                  <div
                    key={apt.id}
                    className="flex items-center justify-between p-3 rounded-xl hover:bg-white/[0.04] transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="h-7 w-7 rounded-lg bg-white/[0.04] border border-white/[0.05] flex items-center justify-center text-[10px] font-medium text-white/30 shrink-0">
                        {apt.customerName.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-white/70 truncate">{apt.customerName}</p>
                        <p className="text-xs text-white/20 truncate">
                          {apt.service} &middot; {apt.date} at {apt.startTime}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-[10px] border-white/[0.08] text-white/40 shrink-0">
                      {getStatusLabel(apt.status)}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "AI Command", href: "/dashboard/ai-command", icon: Sparkles, color: "text-purple-400" },
                { label: "Add Lead", href: "/dashboard/leads", icon: PlusCircle, color: "text-blue-400" },
                { label: "AI Brain", href: "/dashboard/ai-brain", icon: Bot, color: "text-green-400" },
                { label: "Chatbot", href: "/dashboard/chatbot", icon: MessageSquare, color: "text-amber-400" },
              ].map((a) => (
                <Link
                  key={a.label}
                  href={a.href}
                  className="flex items-center gap-2.5 p-3 rounded-xl bg-white/[0.03] border border-white/[0.04] hover:bg-white/[0.06] hover:border-white/[0.08] transition-all duration-200 text-xs font-medium text-white/50 hover:text-white/80 group"
                >
                  <a.icon className={`h-3.5 w-3.5 ${a.color} group-hover:scale-110 transition-transform duration-200`} />
                  {a.label}
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}