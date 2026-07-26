"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, Calendar, Bot, ArrowRight, Zap, DollarSign, BarChart3, MessageSquare, Sparkles, PlusCircle } from "lucide-react";
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

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard/stats").then((r) => r.json()).then((d) => { setStats(d); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <div className="loader" />
      <p className="text-sm text-white/30">Loading your dashboard...</p>
    </div>
  );

  if (!stats) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <BarChart3 className="h-10 w-10 text-white/10" />
      <p className="text-sm text-white/30">Failed to load dashboard</p>
      <Button variant="outline" size="sm" onClick={() => window.location.reload()} className="text-xs">Retry</Button>
    </div>
  );

  const statCards = [
    { label: "Total Leads", value: stats.totalLeads, icon: Users, color: "text-blue-400", bg: "bg-blue-400/10", border: "border-blue-400/20", sub: "+12% this month" },
    { label: "Today's Appts", value: stats.todayAppointments, icon: Calendar, color: "text-purple-400", bg: "bg-purple-400/10", border: "border-purple-400/20", sub: `${stats.upcomingAppointments} upcoming` },
    { label: "Est. Revenue", value: `$${(stats.totalLeads * 1800).toLocaleString()}`, icon: DollarSign, color: "text-amber-400", bg: "bg-amber-400/10", border: "border-amber-400/20", sub: "based on avg job" },
    { label: "Conversations", value: stats.recentConversations, icon: Bot, color: "text-green-400", bg: "bg-green-400/10", border: "border-green-400/20", sub: "AI chats this week" },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Good morning 👋</h1>
        <p className="text-sm text-white/30 mt-1">Here's what's happening with your business today.</p>
      </div>

      {/* Stats */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        {statCards.map((s) => (
          <div key={s.label} className="rounded-xl p-4 bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.04] transition-colors">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] text-white/30 font-medium uppercase tracking-wider">{s.label}</span>
              <div className={`h-8 w-8 rounded-lg ${s.bg} ${s.border} border flex items-center justify-center`}>
                <s.icon className={`h-3.5 w-3.5 ${s.color}`} />
              </div>
            </div>
            <div className="text-2xl font-bold text-white mb-0.5">{s.value}</div>
            <p className="text-[11px] text-white/20">{s.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Recent Leads */}
        <div className="rounded-xl p-5 bg-white/[0.02] border border-white/[0.05]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white/80">Recent Leads</h3>
            <Link href="/dashboard/leads"><Button variant="ghost" size="sm" className="text-xs text-white/40 hover:text-white gap-1">View all <ArrowRight className="h-3 w-3" /></Button></Link>
          </div>
          {stats.recentLeads.length === 0 ? (
            <div className="text-center py-10">
              <div className="h-12 w-12 rounded-2xl bg-white/[0.03] border border-white/[0.04] flex items-center justify-center mx-auto mb-3">
                <Users className="h-5 w-5 text-white/10" />
              </div>
              <p className="text-sm text-white/20 mb-1">No leads yet</p>
              <p className="text-xs text-white/10 mb-4">When your AI captures leads, they'll appear here.</p>
              <Link href="/dashboard/chatbot">
                <Button size="sm" className="text-xs h-8 rounded-full bg-white/[0.06] hover:bg-white/[0.1] text-white/60">
                  <MessageSquare className="h-3 w-3 mr-1.5" /> Set up chatbot
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-0.5">
              {stats.recentLeads.slice(0, 5).map((lead) => (
                <Link key={lead.id} href={`/dashboard/leads/${lead.id}`} className="flex items-center justify-between p-3 rounded-lg hover:bg-white/[0.04] transition-colors">
                  <div>
                    <p className="text-sm font-medium text-white/70">{lead.name}</p>
                    <p className="text-xs text-white/20">{lead.serviceRequest || "No description"}</p>
                  </div>
                  <Badge variant="outline" className={`${getStatusColor(lead.status)} text-white text-[10px] border-0`}>{getStatusLabel(lead.status)}</Badge>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Pipeline */}
        <div className="rounded-xl p-5 bg-white/[0.02] border border-white/[0.05]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white/80">Pipeline</h3>
            <Link href="/dashboard/leads"><Button variant="ghost" size="sm" className="text-xs text-white/40 hover:text-white gap-1">View all <ArrowRight className="h-3 w-3" /></Button></Link>
          </div>
          {stats.leadPipeline.length === 0 ? (
            <div className="text-center py-10">
              <div className="h-12 w-12 rounded-2xl bg-white/[0.03] border border-white/[0.04] flex items-center justify-center mx-auto mb-3">
                <BarChart3 className="h-5 w-5 text-white/10" />
              </div>
              <p className="text-sm text-white/20 mb-1">Pipeline empty</p>
              <p className="text-xs text-white/10">Leads will move through stages automatically.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {stats.leadPipeline.map((stage) => (
                <div key={stage.status} className="flex items-center gap-3">
                  <div className={`h-2 w-2 rounded-full ${getStatusColor(stage.status)}`} />
                  <span className="text-sm text-white/50 flex-1">{getStatusLabel(stage.status)}</span>
                  <span className="text-sm font-semibold text-white/70">{stage.count}</span>
                  <div className="flex-1 h-1 bg-white/[0.06] rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${getStatusColor(stage.status)}`} style={{ width: `${Math.min((stage.count / Math.max(stats.totalLeads, 1)) * 100, 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Upcoming */}
        <div className="rounded-xl p-5 bg-white/[0.02] border border-white/[0.05]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white/80">Upcoming Appointments</h3>
            <Link href="/dashboard/appointments"><Button variant="ghost" size="sm" className="text-xs text-white/40 hover:text-white gap-1">View all <ArrowRight className="h-3 w-3" /></Button></Link>
          </div>
          {stats.upcomingAppts.length === 0 ? (
            <div className="text-center py-10">
              <div className="h-12 w-12 rounded-2xl bg-white/[0.03] border border-white/[0.04] flex items-center justify-center mx-auto mb-3">
                <Calendar className="h-5 w-5 text-white/10" />
              </div>
              <p className="text-sm text-white/20 mb-1">No appointments</p>
              <p className="text-xs text-white/10">Customers can book through your AI chatbot.</p>
            </div>
          ) : (
            <div className="space-y-0.5">
              {stats.upcomingAppts.slice(0, 5).map((apt) => (
                <div key={apt.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-white/[0.04] transition-colors">
                  <div>
                    <p className="text-sm font-medium text-white/70">{apt.customerName}</p>
                    <p className="text-xs text-white/20">{apt.service} · {apt.date} at {apt.startTime}</p>
                  </div>
                  <Badge variant="outline" className="text-[10px] border-white/10 text-white/40">{getStatusLabel(apt.status)}</Badge>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="rounded-xl p-5 bg-white/[0.02] border border-white/[0.05]">
          <h3 className="text-sm font-semibold text-white/80 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "AI Command", href: "/dashboard/ai-command", icon: Sparkles, color: "text-purple-400" },
              { label: "Add Lead", href: "/dashboard/leads", icon: PlusCircle, color: "text-blue-400" },
              { label: "AI Brain", href: "/dashboard/ai-brain", icon: Bot, color: "text-green-400" },
              { label: "Chatbot", href: "/dashboard/chatbot", icon: MessageSquare, color: "text-amber-400" },
            ].map((a) => (
              <Link key={a.label} href={a.href} className="flex items-center gap-2.5 p-3 rounded-lg bg-white/[0.03] border border-white/[0.04] hover:bg-white/[0.06] transition-colors text-xs font-medium text-white/50 hover:text-white/80">
                <a.icon className={`h-3.5 w-3.5 ${a.color}`} /> {a.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
