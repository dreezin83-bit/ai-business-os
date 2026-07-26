"use client";

import { useEffect, useState } from "react";
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
      <Loader2 className="h-6 w-6 animate-spin text-blue-400" />
      <p className="text-sm text-slate-400">Loading your dashboard...</p>
    </div>
  );

  if (!stats) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-5">
      <div className="h-14 w-14 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center">
        <BarChart3 className="h-6 w-6 text-slate-500" />
      </div>
      <p className="text-sm text-slate-400">Failed to load dashboard</p>
      <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
        Retry
      </Button>
    </div>
  );

  const statCards = [
    {
      label: "Total Leads", value: stats.totalLeads, icon: Users,
      gradient: "from-blue-600/20 to-blue-800/10", border: "border-blue-500/20",
      iconBg: "bg-blue-500/10", iconColor: "text-blue-400", accent: "bg-blue-500",
    },
    {
      label: "Today's Appts", value: stats.todayAppointments, icon: Calendar,
      gradient: "from-purple-600/20 to-purple-800/10", border: "border-purple-500/20",
      iconBg: "bg-purple-500/10", iconColor: "text-purple-400", accent: "bg-purple-500",
    },
    {
      label: "Est. Revenue", value: `$${(stats.totalLeads * 1800).toLocaleString()}`, icon: DollarSign,
      gradient: "from-amber-600/20 to-orange-800/10", border: "border-amber-500/20",
      iconBg: "bg-amber-500/10", iconColor: "text-amber-400", accent: "bg-amber-500",
    },
    {
      label: "Conversations", value: stats.recentConversations, icon: Bot,
      gradient: "from-emerald-600/20 to-green-800/10", border: "border-emerald-500/20",
      iconBg: "bg-emerald-500/10", iconColor: "text-emerald-400", accent: "bg-emerald-500",
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            {getGreeting()} <span className="text-slate-400">👋</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">Here&apos;s what&apos;s happening with your business today.</p>
        </div>
      </div>

      {/* Stat cards — colorful */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {statCards.map((s) => (
          <div
            key={s.label}
            className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${s.gradient} border ${s.border} p-5 group cursor-default`}
          >
            {/* Top accent line */}
            <div className={`absolute top-0 left-0 right-0 h-0.5 ${s.accent} rounded-t-2xl opacity-50`} />
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-widest">{s.label}</span>
              <div className={`h-9 w-9 rounded-xl ${s.iconBg} border ${s.border} flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                <s.icon className={`h-4 w-4 ${s.iconColor}`} />
              </div>
            </div>
            <div className="text-2xl font-bold text-white tracking-tight">{s.value}</div>
            <p className="text-[11px] text-slate-500 mt-1">
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
        <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white">Recent Leads</h3>
            <Link href="/dashboard/leads">
              <Button variant="ghost" size="sm" className="text-xs text-slate-400 hover:text-white gap-1">
                View all <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </div>
          {stats.recentLeads.length === 0 ? (
            <div className="text-center py-10">
              <div className="h-14 w-14 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mx-auto mb-3">
                <Users className="h-6 w-6 text-blue-400/50" />
              </div>
              <p className="text-sm text-slate-400 mb-1">No leads yet</p>
              <p className="text-xs text-slate-500 mb-4">When your AI captures leads, they&apos;ll appear here.</p>
              <Link href="/dashboard/chatbot">
                <Button size="sm" className="text-xs h-9 rounded-full bg-blue-600 hover:bg-blue-500 text-white">
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
                  className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-800/50 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-8 w-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-[11px] font-semibold text-blue-400 shrink-0">
                      {lead.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-200 truncate">{lead.name}</p>
                      <p className="text-xs text-slate-500 truncate">{lead.serviceRequest || "No description"}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className={`${getStatusColor(lead.status)} text-white text-[10px] border-0 shrink-0`}>
                    {getStatusLabel(lead.status)}
                  </Badge>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Pipeline */}
        <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white">Pipeline</h3>
            <Link href="/dashboard/leads">
              <Button variant="ghost" size="sm" className="text-xs text-slate-400 hover:text-white gap-1">
                View all <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </div>
          {stats.leadPipeline.length === 0 ? (
            <div className="text-center py-10">
              <div className="h-14 w-14 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mx-auto mb-3">
                <BarChart3 className="h-6 w-6 text-purple-400/50" />
              </div>
              <p className="text-sm text-slate-400 mb-1">Pipeline empty</p>
              <p className="text-xs text-slate-500">Leads will move through stages automatically.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {stats.leadPipeline.map((stage) => {
                const pct = Math.min((stage.count / Math.max(stats.totalLeads, 1)) * 100, 100);
                return (
                  <div key={stage.status} className="group">
                    <div className="flex items-center gap-3 mb-1.5">
                      <div className={`h-2.5 w-2.5 rounded-full ${getStatusColor(stage.status)}`} />
                      <span className="text-sm text-slate-300 flex-1">{getStatusLabel(stage.status)}</span>
                      <span className="text-sm font-semibold text-white tabular-nums">{stage.count}</span>
                    </div>
                    <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${getStatusColor(stage.status)} transition-all duration-500`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Upcoming Appointments */}
        <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white">Upcoming Appointments</h3>
            <Link href="/dashboard/appointments">
              <Button variant="ghost" size="sm" className="text-xs text-slate-400 hover:text-white gap-1">
                View all <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </div>
          {stats.upcomingAppts.length === 0 ? (
            <div className="text-center py-10">
              <div className="h-14 w-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-3">
                <Calendar className="h-6 w-6 text-amber-400/50" />
              </div>
              <p className="text-sm text-slate-400 mb-1">No appointments</p>
              <p className="text-xs text-slate-500">Customers can book through your AI chatbot.</p>
            </div>
          ) : (
            <div className="space-y-0.5">
              {stats.upcomingAppts.slice(0, 5).map((apt) => (
                <div
                  key={apt.id}
                  className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-800/50 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-8 w-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-[11px] font-semibold text-amber-400 shrink-0">
                      {apt.customerName.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-200 truncate">{apt.customerName}</p>
                      <p className="text-xs text-slate-500 truncate">
                        {apt.service} &middot; {apt.date} at {apt.startTime}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[10px] border-slate-700 text-slate-400 shrink-0">
                    {getStatusLabel(apt.status)}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "AI Command", href: "/dashboard/ai-command", icon: Sparkles, color: "text-purple-400", bg: "bg-purple-500/10", border: "border-purple-500/20" },
              { label: "Add Lead", href: "/dashboard/leads", icon: PlusCircle, color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20" },
              { label: "AI Brain", href: "/dashboard/ai-brain", icon: Bot, color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
              { label: "Chatbot", href: "/dashboard/chatbot", icon: MessageSquare, color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20" },
            ].map((a) => (
              <Link
                key={a.label}
                href={a.href}
                className={`flex items-center gap-3 p-3.5 rounded-xl ${a.bg} border ${a.border} hover:brightness-125 transition-all duration-200 text-sm font-medium text-slate-200 group`}
              >
                <a.icon className={`h-4 w-4 ${a.color} group-hover:scale-110 transition-transform duration-200`} />
                {a.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
