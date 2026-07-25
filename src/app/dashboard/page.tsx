"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, Calendar, Bot, ArrowRight, TrendingUp, Loader2, Zap, DollarSign, BarChart3, Phone } from "lucide-react";
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

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  if (!stats) return <div className="flex items-center justify-center min-h-[60vh]"><p className="text-muted-foreground">Failed to load</p></div>;

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Good morning 👋</h1>
        <p className="text-sm text-muted-foreground mt-1">Here's what's happening with your business today.</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4 stagger">
        {[
          { label: "Total Leads", value: stats.totalLeads, icon: Users, color: "text-blue-400", bg: "bg-blue-400/10", sub: "+12% this month" },
          { label: "Today's Appts", value: stats.todayAppointments, icon: Calendar, color: "text-purple-400", bg: "bg-purple-400/10", sub: `${stats.upcomingAppointments} upcoming` },
          { label: "Est. Revenue", value: `$${(stats.totalLeads * 1800).toLocaleString()}`, icon: DollarSign, color: "text-amber-400", bg: "bg-amber-400/10", sub: "based on avg job" },
          { label: "Conversations", value: stats.recentConversations, icon: Bot, color: "text-green-400", bg: "bg-green-400/10", sub: "AI chats this week" },
        ].map((s) => (
          <div key={s.label} className="glass rounded-xl p-5 card-hover">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-muted-foreground font-medium">{s.label}</span>
              <div className={`h-8 w-8 rounded-lg ${s.bg} flex items-center justify-center`}><s.icon className={`h-4 w-4 ${s.color}`} /></div>
            </div>
            <div className="text-2xl font-bold mb-1 animate-count">{s.value}</div>
            <p className="text-xs text-muted-foreground">{s.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Leads */}
        <div className="glass rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold">Recent Leads</h3>
            <Link href="/dashboard/leads"><Button variant="ghost" size="sm" className="text-xs gap-1">View all <ArrowRight className="h-3 w-3" /></Button></Link>
          </div>
          {stats.recentLeads.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground"><Users className="h-8 w-8 mx-auto mb-2 opacity-30" /><p className="text-xs">No leads yet</p></div>
          ) : (
            <div className="space-y-1">
              {stats.recentLeads.slice(0, 5).map((lead) => (
                <Link key={lead.id} href={`/dashboard/leads/${lead.id}`} className="flex items-center justify-between p-3 rounded-lg hover:bg-secondary transition-colors">
                  <div>
                    <p className="text-sm font-medium">{lead.name}</p>
                    <p className="text-xs text-muted-foreground">{lead.serviceRequest || "No description"}</p>
                  </div>
                  <Badge variant="outline" className={`${getStatusColor(lead.status)} text-white text-[10px] border-0`}>{getStatusLabel(lead.status)}</Badge>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Pipeline */}
        <div className="glass rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold">Pipeline</h3>
            <Link href="/dashboard/leads"><Button variant="ghost" size="sm" className="text-xs gap-1">View all <ArrowRight className="h-3 w-3" /></Button></Link>
          </div>
          {stats.leadPipeline.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground"><BarChart3 className="h-8 w-8 mx-auto mb-2 opacity-30" /><p className="text-xs">No leads yet</p></div>
          ) : (
            <div className="space-y-3">
              {stats.leadPipeline.map((stage) => (
                <div key={stage.status} className="flex items-center gap-3">
                  <div className={`h-2.5 w-2.5 rounded-full ${getStatusColor(stage.status)}`} />
                  <span className="text-sm flex-1">{getStatusLabel(stage.status)}</span>
                  <span className="text-sm font-semibold">{stage.count}</span>
                  <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${getStatusColor(stage.status)}`} style={{ width: `${Math.min((stage.count / Math.max(stats.totalLeads, 1)) * 100, 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Upcoming */}
        <div className="glass rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold">Upcoming Appointments</h3>
            <Link href="/dashboard/appointments"><Button variant="ghost" size="sm" className="text-xs gap-1">View all <ArrowRight className="h-3 w-3" /></Button></Link>
          </div>
          {stats.upcomingAppts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground"><Calendar className="h-8 w-8 mx-auto mb-2 opacity-30" /><p className="text-xs">No appointments</p></div>
          ) : (
            <div className="space-y-1">
              {stats.upcomingAppts.slice(0, 5).map((apt) => (
                <div key={apt.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-secondary transition-colors">
                  <div><p className="text-sm font-medium">{apt.customerName}</p><p className="text-xs text-muted-foreground">{apt.service} · {apt.date} at {apt.startTime}</p></div>
                  <Badge variant="outline" className="text-[10px]">{getStatusLabel(apt.status)}</Badge>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="glass rounded-xl p-5">
          <h3 className="text-sm font-semibold mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "AI Command", href: "/dashboard/ai-command", icon: Bot },
              { label: "Add Lead", href: "/dashboard/leads", icon: Users },
              { label: "AI Brain", href: "/dashboard/ai-brain", icon: Zap },
              { label: "Settings", href: "/dashboard/settings", icon: BarChart3 },
            ].map((a) => (
              <Link key={a.label} href={a.href} className="flex items-center gap-2 p-3 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors text-xs font-medium">
                <a.icon className="h-4 w-4" /> {a.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}