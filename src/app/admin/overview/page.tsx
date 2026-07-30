"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Building2, Users, DollarSign, Phone, MessageSquare, Mail,
  TrendingUp, BarChart3, ArrowRight, Target, MessageCircle,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

interface AdminStats {
  businesses: { total: number; active: number; suspended: number };
  subscriptions: { active: number; mrrDollars: string };
  activity: { aiCallsToday: number; aiCallsThisWeek: number; smsSentToday: number; emailsSentToday: number };
  signups: { thisWeek: number; thisMonth: number };
}

interface AnalyticsData {
  revenue: { mrrDollars: string; activeSubscriptions: number; planBreakdown: { plan: string; total: number }[] };
  businesses: { total: number; active: number; suspended: number; onboarded: number; onboardingRate: string; categories: { category: string; total: number }[] };
  usage: { dailyAiCalls: { date: string; total: number }[]; aiCallsLast30Days: number; smsLast30Days: number; emailsLast30Days: number; topTenants: { id: string; name: string; calls: number }[] };
  conversion: { totalLeads: number; leadConversionRate: string; totalAppointments: number; totalConversations: number; conversationResolutionRate: string };
}

/** Format "YYYY-MM-DD" to "Mon 12" style */
function formatChartDate(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-US", { weekday: "short", day: "numeric" });
}

export default function AdminOverviewPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [tenants, setTenants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [statsRes, tenantsRes, analyticsRes] = await Promise.all([
          fetch("/api/admin/stats"),
          fetch("/api/admin/tenants"),
          fetch("/api/admin/analytics"),
        ]);
        if (statsRes.ok) setStats(await statsRes.json());
        else if (statsRes.status === 403) { setError(true); setLoading(false); return; }
        if (tenantsRes.ok) {
          const t = await tenantsRes.json();
          setTenants(Array.isArray(t) ? t.slice(0, 5) : []);
        }
        if (analyticsRes.ok) setAnalytics(await analyticsRes.json());
      } catch {}
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-48 bg-white/[0.06] rounded" />
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-3">
          {[1,2,3,4,5,6].map((i) => (
            <div key={i} className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
              <div className="h-3 w-20 bg-white/[0.06] rounded mb-4" />
              <div className="h-7 w-16 bg-white/[0.06] rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-5">
        <BarChart3 className="h-8 w-8 text-white/15" />
        <p className="text-sm text-white/40">Failed to load admin data</p>
        <Button variant="outline" size="sm" onClick={() => window.location.reload()}>Retry</Button>
      </div>
    );
  }

  const mrr = Number(stats.subscriptions.mrrDollars || 0);
  const statCards = [
    { label: "Total Businesses", value: stats.businesses.total, icon: Building2, color: "blue" },
    { label: "Active Businesses", value: stats.businesses.active, icon: Users, color: "emerald" },
    { label: "MRR", value: `$${mrr.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, icon: DollarSign, color: "amber" },
    { label: "AI Calls (Today)", value: stats.activity.aiCallsToday, icon: Phone, color: "purple" },
    { label: "SMS Sent (Today)", value: stats.activity.smsSentToday, icon: MessageSquare, color: "cyan" },
    { label: "Emails Sent (Today)", value: stats.activity.emailsSentToday, icon: Mail, color: "rose" },
  ];

  // Real chart data from analytics, fall back to empty array
  const chartData = (analytics?.usage?.dailyAiCalls || []).map((d) => ({
    date: formatChartDate(d.date),
    calls: d.total,
    rawDate: d.date,
  }));

  // Extra stat cards from analytics (shown below main cards)
  const conversionStats = analytics ? [
    { label: "Onboarding Rate", value: `${analytics.businesses.onboardingRate}%`, color: "text-sky-400" },
    { label: "Lead Conv. Rate", value: `${analytics.conversion.leadConversionRate}%`, color: "text-emerald-400" },
    { label: "Total Conversations", value: analytics.conversion.totalConversations, color: "text-violet-400" },
    { label: "Resolution Rate", value: `${analytics.conversion.conversationResolutionRate}%`, color: "text-amber-400" },
  ] : [];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Building2 className="h-6 w-6" /> Super Admin
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Platform-wide overview across all tenants.</p>
      </div>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-3">
        {statCards.map((s) => (
          <div key={s.label} className="stat-card">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] text-white/40 font-semibold uppercase tracking-widest">{s.label}</span>
              <div className={`h-9 w-9 rounded-xl bg-${s.color}-500/10 border border-${s.color}-500/20 flex items-center justify-center`}>
                <s.icon className={`h-4 w-4 text-${s.color}-400`} />
              </div>
            </div>
            <div className="text-2xl font-bold text-white">{s.value}</div>
            <p className="text-[11px] text-white/25 mt-1">
              {s.label.includes("Today") ? "Last 24 hours" : s.label === "MRR" ? `${stats.subscriptions.active} active subs` : `${stats.signups.thisMonth} new this month`}
            </p>
          </div>
        ))}
      </div>

      {/* Conversion / quality stats from analytics */}
      {conversionStats.length > 0 && (
        <div className="grid gap-4 grid-cols-2 sm:grid-cols-4">
          {conversionStats.map((s) => (
            <div key={s.label} className="stat-card text-center">
              <p className="text-[10px] text-white/30 uppercase tracking-widest mb-1">{s.label}</p>
              <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-blue-400" /> AI Usage (Last 30 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-52">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 100% / 0.04)" vertical={false} />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: "hsl(0 0% 100% / 0.25)", fontSize: 11 }} interval="preserveStartEnd" />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: "hsl(0 0% 100% / 0.2)", fontSize: 10 }} />
                    <Tooltip contentStyle={{ backgroundColor: "hsl(0 0% 3%)", border: "1px solid hsl(0 0% 100% / 0.08)", borderRadius: 12, fontSize: 12, color: "hsl(0 0% 93%)" }} />
                    <Area type="monotone" dataKey="calls" stroke="hsl(217 91% 60%)" fill="hsl(217 91% 60% / 0.12)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-sm text-white/20">No usage data yet</div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">Recent Tenants</CardTitle>
              <Link href="/admin/tenants">
                <Button variant="ghost" size="sm" className="text-xs text-white/40 hover:text-white gap-1 h-7">
                  View all <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-1">
            {tenants.length === 0 ? (
              <div className="text-center py-6 text-sm text-white/30">No tenants yet</div>
            ) : (
              tenants.map((t: any) => (
                <Link key={t.id} href={`/admin/tenant/${t.id}`} className="flex items-center justify-between p-2.5 rounded-xl hover:bg-white/[0.03] transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-8 w-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-[10px] font-semibold text-blue-400 shrink-0">
                      {(t.name || "?").slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white/80 truncate">{t.name}</p>
                      <p className="text-[11px] text-white/30 truncate">{t.plan || "No plan"} &middot; {t.category || ""}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className={`text-[10px] border-0 shrink-0 ml-2 ${t.status === "active" ? "bg-emerald-500/20 text-emerald-300" : "bg-amber-500/20 text-amber-300"}`}>
                    {t.status}
                  </Badge>
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Suspended", value: stats.businesses.suspended, color: "text-red-400" },
          { label: "New This Week", value: stats.signups.thisWeek, color: "text-emerald-400" },
          { label: "New This Month", value: stats.signups.thisMonth, color: "text-blue-400" },
          { label: "AI Calls (Week)", value: stats.activity.aiCallsThisWeek, color: "text-purple-400" },
        ].map((s) => (
          <div key={s.label} className="stat-card text-center">
            <p className="text-[10px] text-white/30 uppercase tracking-widest mb-1">{s.label}</p>
            <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
