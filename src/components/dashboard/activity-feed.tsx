"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import {
  UserPlus,
  MessageSquare,
  Mail,
  AlertTriangle,
  RefreshCw,
  Activity,
} from "lucide-react";
import type { DashboardStats } from "@/hooks/use-dashboard-stats";

type FeedItem = {
  key: string;
  ts: number;
  kind: "lead" | "conversation" | "communication";
  title: ReactNode;
  description: ReactNode;
  href?: string;
  failed?: boolean;
};

const ICONS = {
  lead: { icon: UserPlus, chip: "bg-blue-500/10 border-blue-500/20 text-blue-400" },
  conversation: { icon: MessageSquare, chip: "bg-purple-500/10 border-purple-500/20 text-purple-400" },
  communication: { icon: Mail, chip: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" },
} as const;

const COMM_STATUS: Record<string, string> = {
  sent: "sent",
  delivered: "delivered",
  failed: "delivery failed",
  bounced: "bounced",
};

function timeAgo(iso: string): string {
  const ts = new Date(iso).getTime();
  if (!Number.isFinite(ts)) return "";
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(ts).toLocaleDateString();
}

function buildFeed(stats: DashboardStats): FeedItem[] {
  const items: FeedItem[] = [];

  for (const lead of stats.recentLeads) {
    items.push({
      key: `lead-${lead.id}`,
      ts: new Date(lead.createdAt).getTime(),
      kind: "lead",
      title: (
        <>
          New lead — <span className="font-semibold">{lead.name}</span>
        </>
      ),
      description: lead.serviceRequest || "No service request",
      href: `/dashboard/leads/${lead.id}`,
    });
  }

  for (const c of stats.recentConversationsList) {
    items.push({
      key: `convo-${c.id}`,
      ts: new Date(c.createdAt).getTime(),
      kind: "conversation",
      title: (
        <>
          AI conversation{c.customerName ? ` — ${c.customerName}` : ""}
        </>
      ),
      description:
        c.source === "voice"
          ? "Handled by the AI phone line"
          : `via ${c.source === "chatbot" ? "website chatbot" : c.source}`,
    });
  }

  for (const m of stats.recentCommunications) {
    const failed = m.status === "failed" || m.status === "bounced";
    items.push({
      key: `comm-${m.id}`,
      ts: new Date(m.sentAt).getTime(),
      kind: "communication",
      failed,
      title: (
        <>
          {failed ? "Delivery issue" : `Follow-up ${m.type}`}
          {m.subject ? ` — ${m.subject}` : ""}
        </>
      ),
      description: `to ${m.toAddress} (${failed ? "not delivered" : COMM_STATUS[m.status] ?? m.status})`,
    });
  }

  return items
    .filter((i) => Number.isFinite(i.ts))
    .sort((a, b) => b.ts - a.ts)
    .slice(0, 8);
}

function FeedRow({ item }: { item: FeedItem }) {
  const { icon: Icon, chip } = ICONS[item.kind];
  const inner = (
    <>
      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${chip}`}
      >
        {item.failed ? (
          <AlertTriangle className="h-4 w-4 text-red-400" />
        ) : (
          <Icon className="h-4 w-4" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-3">
          <p className="truncate text-sm dash-text">{item.title}</p>
          <span className="shrink-0 text-[11px] tabular-nums dash-muted">
            {timeAgo(new Date(item.ts).toISOString())}
          </span>
        </div>
        <p className="mt-0.5 truncate text-xs dash-muted">{item.description}</p>
      </div>
    </>
  );
  return item.href ? (
    <Link
      href={item.href}
      className="flex items-start gap-3 p-3 transition-colors hover:bg-[var(--dash-hover)]"
    >
      {inner}
    </Link>
  ) : (
    <div className="flex items-start gap-3 p-3">{inner}</div>
  );
}

/**
 * ActivityFeed — recent lead alerts, AI conversations and call/follow-up
 * notes from the existing stats endpoint, refreshed by the dashboard's
 * light polling (45s). Skeletons render only while there is no data at all.
 */
export function ActivityFeed({
  stats,
  refreshing,
  lastUpdated,
}: {
  stats: DashboardStats | null;
  refreshing: boolean;
  lastUpdated: number | null;
}) {
  const loading = stats === null;
  const feed = stats ? buildFeed(stats) : [];

  return (
    <section className="dash-card rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-[var(--dash-divider)] px-5 py-4">
        <h2 className="flex items-center gap-2 text-sm font-semibold dash-heading">
          <Activity className="h-4 w-4 text-[var(--dash-accent-text)]" />
          Recent Activity
        </h2>
        <div className="flex items-center gap-2 text-[11px] dash-muted">
          <RefreshCw
            className={`h-3 w-3 ${refreshing ? "animate-spin" : ""}`}
            aria-hidden
          />
          {lastUpdated
            ? `Updated ${new Date(lastUpdated).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}`
            : "Live"}
        </div>
      </div>

      <div className="divide-y divide-[var(--dash-divider)]">
        {loading ? (
          <>
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="flex items-start gap-3 p-3">
                <div className="h-9 w-9 shrink-0 dash-skeleton rounded-xl" />
                <div className="flex-1 space-y-2 py-1">
                  <div className="h-3.5 w-2/5 dash-skeleton rounded" />
                  <div className="h-3 w-3/5 dash-skeleton rounded" />
                </div>
              </div>
            ))}
          </>
        ) : feed.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <p className="text-sm dash-text mb-1">No activity yet</p>
            <p className="text-xs dash-muted">
              When your AI catches calls, chats and leads, they&apos;ll show up
              here.
            </p>
          </div>
        ) : (
          feed.map((item) => <FeedRow key={item.key} item={item} />)
        )}
      </div>
    </section>
  );
}