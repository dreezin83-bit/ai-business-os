"use client";

import { Users, Calendar, PhoneIncoming, Bot, ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";
import type { DashboardStats } from "@/hooks/use-dashboard-stats";

/**
 * MetricTiles — the 4 high-contrast KPI tiles. Values map truthfully to the
 * stats API: Total Leads (+ week-over-week growth), Booked Appointments
 * (today's, with upcoming in the sub-line), Calls Saved (missed/bounced
 * communication events the AI caught, with follow-ups queued) and AI
 * Conversations (last 7 days). While stats are still loading on a first
 * visit, only the number region shows a skeleton — the tile chrome renders
 * instantly.
 */
export function MetricTiles({ stats }: { stats: DashboardStats | null }) {
  const loading = stats === null;

  const growth = stats?.weeklyChange ?? 0;
  const GrowthBadge =
    growth > 0
      ? ArrowUpRight
      : growth < 0
        ? ArrowDownRight
        : Minus;
  const growthColor =
    growth > 0 ? "text-[var(--dash-green)]" : growth < 0 ? "text-red-400" : "text-[var(--dash-muted)]";
  const growthSub =
    growth > 0
      ? `+${growth}% vs last week`
      : growth < 0
        ? `${growth}% vs last week`
        : "No change vs last week";

  const tiles = [
    {
      label: "Total Leads",
      value: stats?.totalLeads,
      sub: stats ? growthSub : undefined,
      icon: Users,
      chipClass: "bg-blue-500/10 border-blue-500/20 text-blue-400",
      growth: <GrowthBadge className={`h-3.5 w-3.5 ${growthColor}`} />,
    },
    {
      label: "Booked Appointments",
      value: stats?.todayAppointments,
      sub: stats ? `${stats.upcomingAppointments} upcoming` : undefined,
      icon: Calendar,
      chipClass: "bg-purple-500/10 border-purple-500/20 text-purple-400",
    },
    {
      label: "Calls Saved",
      value: stats?.missedCalls,
      sub: stats ? `${stats.pendingFollowUps} follow-ups queued` : undefined,
      icon: PhoneIncoming,
      chipClass: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400",
    },
    {
      label: "AI Conversations",
      value: stats?.recentConversations,
      sub: stats ? "active in the last 7 days" : undefined,
      icon: Bot,
      chipClass: "bg-amber-500/10 border-amber-500/20 text-amber-400",
    },
  ] as const;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {tiles.map((tile) => (
        <div
          key={tile.label}
          className="dash-card dash-card-hover relative overflow-hidden rounded-2xl p-5"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium uppercase tracking-wide dash-muted">
              {tile.label}
            </span>
            <div
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${tile.chipClass}`}
            >
              <tile.icon className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4 flex items-end justify-between gap-2">
            {loading ? (
              <div className="h-9 w-16 dash-skeleton rounded-lg" />
            ) : (
              <p className="text-3xl font-bold tracking-tight dash-heading tabular-nums">
                {tile.value}
              </p>
            )}
            {"growth" in tile && tile.growth && !loading && (
              <span className="pb-1">{tile.growth}</span>
            )}
          </div>
          {loading ? (
            <div className="mt-2 h-3.5 w-28 dash-skeleton rounded" />
          ) : (
            tile.sub && <p className="mt-1.5 text-xs dash-muted">{tile.sub}</p>
          )}
        </div>
      ))}
    </div>
  );
}