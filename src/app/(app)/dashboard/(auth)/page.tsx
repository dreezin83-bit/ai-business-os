"use client";

import { BarChart3 } from "lucide-react";
import { useDashboardStats } from "@/hooks/use-dashboard-stats";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { MetricTiles } from "@/components/dashboard/metric-tiles";
import { ActivityFeed } from "@/components/dashboard/activity-feed";

/**
 * Dashboard home — rebuilt for instant load.
 *
 * The shell (welcome header, "Active & Ready" pill, metric tile chrome and
 * the activity feed container) renders immediately. Data is served by
 * useDashboardStats: a localStorage snapshot appears instantly for returning
 * users (stale-while-revalidate), and stats refresh in the background every
 * 45s and on window focus. Only the data-dependent regions (tile values,
 * feed rows) ever show skeletons, and only on a first visit with no cache.
 * No full-page spinner, no infinite skeletons.
 */
export default function DashboardPage() {
  const { stats, status, refreshing, lastUpdated, retry } =
    useDashboardStats();

  // Never block the page: if there is no data at all (no cache and the
  // first fetch failed), render a compact retry card in place of the feed.
  const failed = status === "error" && stats === null;

  return (
    <div className="space-y-6">
      <DashboardHeader />

      <MetricTiles stats={stats} />

      {failed ? (
        <section className="dash-card flex flex-col items-center gap-4 rounded-2xl px-6 py-12 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[var(--dash-card-border)] bg-[var(--dash-card)]">
            <BarChart3 className="h-6 w-6 text-[var(--dash-muted)]" />
          </div>
          <div>
            <p className="text-sm font-medium dash-heading">
              Couldn&apos;t load your dashboard
            </p>
            <p className="mt-1 text-xs dash-muted">
              We couldn&apos;t reach your stats. Your connection looks fine —
              try again.
            </p>
          </div>
          <button
            type="button"
            onClick={retry}
            className="inline-flex h-9 items-center gap-1.5 rounded-full border border-[var(--dash-card-border-hover)] px-4 text-xs font-semibold text-[var(--dash-heading)] transition-colors hover:bg-[var(--dash-hover)]"
          >
            Retry
          </button>
        </section>
      ) : (
        <ActivityFeed
          stats={stats}
          refreshing={refreshing}
          lastUpdated={lastUpdated}
        />
      )}
    </div>
  );
}