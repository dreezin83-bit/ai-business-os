"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * useDashboardStats — instant-load dashboard data.
 *
 * Fixes the old full-page "Loading your dashboard..." spinner:
 *  - The page shell always renders immediately. Only the data-dependent
 *    regions (metric values, feed rows) show skeletons, and only on a
 *    first visit with no cache.
 *  - Returning users get stale-while-revalidate: the last snapshot is
 *    served from localStorage instantly and refreshed in the background.
 *  - Stats refresh every 45s (light polling, no new backend) and on
 *    window focus when the cache is older than 10s.
 *  - Errors never hang the page: with cached data we keep it and keep
 *    polling; without any data we surface a compact retry card.
 */
export interface DashboardStats {
  totalLeads: number;
  todayAppointments: number;
  upcomingAppointments: number;
  recentConversations: number;
  missedCalls: number;
  pendingFollowUps: number;
  leadPipeline: { status: string; count: number }[];
  recentLeads: {
    id: string;
    name: string;
    serviceRequest: string;
    status: string;
    createdAt: string;
  }[];
  upcomingAppts: {
    id: string;
    customerName: string;
    service: string;
    date: string;
    startTime: string;
    status: string;
  }[];
  weeklyLeads: number[];
  weeklyChange: number;
  recentConversationsList: {
    id: string;
    customerName: string;
    source: string;
    createdAt: string;
  }[];
  recentCommunications: {
    id: string;
    type: string;
    toAddress: string;
    subject: string;
    status: string;
    sentAt: string;
  }[];
  aiCredits: {
    allocated: number;
    consumed: number;
    remaining: number;
    status: string;
    periodEnd: string;
  } | null;
  /** Chat vs voice credits consumed this billing period (null = ledger unavailable). */
  creditUsage: { chat: number; voice: number } | null;
}

const CACHE_KEY = "sagenify.dashboard.stats.v1";
const POLL_MS = 45_000;
const STALE_MS = 30_000;
const FOCUS_STALE_MS = 10_000;

interface CacheEntry {
  data: DashboardStats;
  fetchedAt: number;
}

function readCache(): CacheEntry | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheEntry;
    if (
      !parsed ||
      typeof parsed.fetchedAt !== "number" ||
      !parsed.data ||
      typeof parsed.data.totalLeads !== "number"
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function writeCache(entry: CacheEntry) {
  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(entry));
  } catch {
    // Storage full/blocked — the dashboard works without the cache.
  }
}

export type DashboardStatus = "loading" | "ready" | "error";

export function useDashboardStats() {
  const cachedRef = useRef<CacheEntry | null>(null);
  if (cachedRef.current === null) {
    cachedRef.current = readCache();
  }
  const [stats, setStats] = useState<DashboardStats | null>(
    () => cachedRef.current?.data ?? null
  );
  const [status, setStatus] = useState<DashboardStatus>(
    () => (cachedRef.current?.data ? "ready" : "loading")
  );
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<number | null>(
    () => cachedRef.current?.fetchedAt ?? null
  );
  const inflightRef = useRef(false);
  const statsRef = useRef<DashboardStats | null>(
    cachedRef.current?.data ?? null
  );

  const load = useCallback(async ({ silent = true }: { silent?: boolean } = {}) => {
    // Never double-fetch: the 45s poll and the focus handler can overlap.
    if (inflightRef.current) return;
    inflightRef.current = true;
    if (statsRef.current && !silent) {
      // explicit retry with data already on screen — keep it visible
    }
    if (statsRef.current) setRefreshing(true);
    try {
      const res = await fetch("/api/dashboard/stats", { cache: "no-store" });
      if (!res.ok) throw new Error(`Request failed with status ${res.status}`);
      const data = (await res.json()) as DashboardStats;
      if (!data || typeof data.totalLeads !== "number") {
        throw new Error("Malformed stats payload");
      }
      statsRef.current = data;
      setStats(data);
      setStatus("ready");
      const now = Date.now();
      setLastUpdated(now);
      writeCache({ data, fetchedAt: now });
    } catch {
      // Keep whatever we have on screen. Only surface the error card when
      // there is nothing at all to render.
      if (!statsRef.current) setStatus("error");
    } finally {
      inflightRef.current = false;
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    // Always refresh in the background on mount; the cached snapshot (if any)
    // is already on screen, so this never blocks first paint.
    void load({ silent: true });
    const id = window.setInterval(() => void load({ silent: true }), POLL_MS);
    const onFocus = () => {
      const cached = readCache();
      if (!cached || Date.now() - cached.fetchedAt > FOCUS_STALE_MS) {
        void load({ silent: true });
      }
    };
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("focus", onFocus);
    };
  }, [load]);

  return {
    stats,
    status,
    refreshing,
    lastUpdated,
    retry: () => void load({ silent: false }),
  };
}