"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Users,
  Calendar,
  MessageSquare,
  Phone,
  Bot,
  ArrowUpRight,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { getStatusColor, getStatusLabel } from "@/lib/utils";

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

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard/stats")
      .then((res) => res.json())
      .then((data) => {
        setStats(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-muted-foreground">Failed to load dashboard data</p>
      </div>
    );
  }

  const widgets = [
    {
      title: "Total Leads",
      value: stats.totalLeads,
      icon: Users,
      change: stats.weeklyChange,
      href: "/dashboard/leads",
    },
    {
      title: "Today's Appointments",
      value: stats.todayAppointments,
      icon: Calendar,
      change: null,
      href: "/dashboard/appointments",
    },
    {
      title: "Upcoming",
      value: stats.upcomingAppointments,
      icon: Calendar,
      change: null,
      href: "/dashboard/appointments",
    },
    {
      title: "Missed Calls",
      value: stats.missedCalls,
      icon: Phone,
      change: null,
      href: "/dashboard/automation",
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Overview of your business
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {widgets.map((w) => (
          <Link key={w.title} href={w.href}>
            <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {w.title}
                </CardTitle>
                <w.icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{w.value}</div>
                {w.change !== null && (
                  <p className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                    {w.change >= 0 ? (
                      <TrendingUp className="h-3 w-3 text-green-500" />
                    ) : (
                      <TrendingDown className="h-3 w-3 text-red-500" />
                    )}
                    {w.change >= 0 ? "+" : ""}
                    {w.change}% this week
                  </p>
                )}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Leads */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Leads</CardTitle>
            <Link href="/dashboard/leads">
              <Button variant="ghost" size="sm" className="gap-1">
                View all <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {stats.recentLeads.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No leads yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {stats.recentLeads.slice(0, 5).map((lead) => (
                  <Link
                    key={lead.id}
                    href={`/dashboard/leads/${lead.id}`}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-accent transition-colors"
                  >
                    <div>
                      <p className="text-sm font-medium">{lead.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {lead.serviceRequest || "No service specified"}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className={`${getStatusColor(lead.status)} text-white text-[10px]`}
                    >
                      {getStatusLabel(lead.status)}
                    </Badge>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Appointments */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Upcoming Appointments</CardTitle>
            <Link href="/dashboard/appointments">
              <Button variant="ghost" size="sm" className="gap-1">
                View all <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {stats.upcomingAppts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No upcoming appointments</p>
              </div>
            ) : (
              <div className="space-y-3">
                {stats.upcomingAppts.slice(0, 5).map((apt) => (
                  <div
                    key={apt.id}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-accent transition-colors"
                  >
                    <div>
                      <p className="text-sm font-medium">{apt.customerName}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {apt.service} &middot; {apt.date} at {apt.startTime}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className="text-[10px]"
                    >
                      {getStatusLabel(apt.status)}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* AI Chat Sessions */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Conversations</CardTitle>
            <Link href="/dashboard/leads">
              <Button variant="ghost" size="sm" className="gap-1">
                View all <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              <Bot className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">{stats.recentConversations} conversations this week</p>
            </div>
          </CardContent>
        </Card>

        {/* Lead Pipeline */}
        <Card>
          <CardHeader>
            <CardTitle>Pipeline</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.leadPipeline.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No leads in pipeline</p>
              </div>
            ) : (
              <div className="space-y-3">
                {stats.leadPipeline.map((stage) => (
                  <div key={stage.status} className="flex items-center gap-3">
                    <div className={`h-2 w-2 rounded-full ${getStatusColor(stage.status)}`} />
                    <span className="text-sm flex-1">{getStatusLabel(stage.status)}</span>
                    <span className="text-sm font-medium">{stage.count}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}