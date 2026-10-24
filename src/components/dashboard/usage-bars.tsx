"use client";

import Link from "next/link";
import { Coins, Lock, PhoneCall, MessageSquare } from "lucide-react";
import type { DashboardStats } from "@/hooks/use-dashboard-stats";

/**
 * UsageBars — two color-coded monthly usage bars on the dashboard:
 *   AI Chat Usage       (non-voice credits consumed this period)
 *   AI Voice Calling    (voice.call.minutes credits consumed this period)
 *
 * Color bands per business-plan spec: 0–70% green, 71–89% yellow, 90–100%
 * red + lock icon + top-up redirect (→ /dashboard/settings where credits &
 * billing live). Falls back defensively when the credit ledger isn't
 * available yet: chat bar shows total consumption, voice bar shows 0 with an
 * explanatory caption — never a fabricated number.
 */
type Band = "ok" | "warn" | "danger";

function bandFor(pct: number): Band {
  if (pct >= 90) return "danger";
  if (pct >= 71) return "warn";
  return "ok";
}

const BAND_STYLES: Record<Band, { bar: string; text: string; chip: string }> = {
  ok: { bar: "var(--dash-green)", text: "var(--dash-green)", chip: "#10b981" },
  warn: { bar: "#f59e0b", text: "#f59e0b", chip: "#f59e0b" },
  danger: { bar: "#f43f5e", text: "#f43f5e", chip: "#f43f5e" },
};

function clampPct(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(100, Math.max(0, n));
}

export function UsageBars({ stats }: { stats: DashboardStats | null }) {
  const ai = stats?.aiCredits;
  if (!ai || ai.allocated <= 0) return null; // credits not provisioned — hide entirely

  const ledgerAvailable = stats?.creditUsage != null;
  const chatUsed = ledgerAvailable ? stats.creditUsage!.chat : ai.consumed;
  const voiceUsed = ledgerAvailable ? stats.creditUsage!.voice : 0;
  const chatPct = clampPct((chatUsed / ai.allocated) * 100);
  const voicePct = clampPct((voiceUsed / ai.allocated) * 100);

  const bar = (label: string, Icon: typeof MessageSquare, used: number, pct: number) => {
    const band = bandFor(pct);
    const style = BAND_STYLES[band];
    return (
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4 text-[var(--dash-muted)]" />
            <span className="text-sm font-semibold text-[var(--dash-heading)]">{label}</span>
            {band === "danger" && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#f43f5e]/10 border border-[#f43f5e]/30 px-2 py-0.5 text-[10px] font-bold text-[#f43f5e]">
                <Lock className="h-3 w-3" /> Exhausted
              </span>
            )}
          </div>
          <span className="ml-auto text-xs font-semibold tabular-nums" style={{ color: style.text }}>
            {Math.round(pct)}% used
          </span>
        </div>
        <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-[var(--dash-card-border)]">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${Math.max(pct, pct > 0 ? 3 : 0)}%`, background: style.bar }}
          />
        </div>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="text-[11px] text-[var(--dash-muted)]">
            {used.toLocaleString()} of {ai.allocated.toLocaleString()} credits used
          </span>
          {band === "danger" && (
            <Link
              href="/dashboard/settings"
              className="inline-flex h-5 items-center gap-1 rounded-full bg-[#f43f5e]/10 border border-[#f43f5e]/30 px-2 text-[10px] font-bold text-[#f43f5e] transition-colors hover:bg-[#f43f5e]/20"
            >
              Top up <span aria-hidden>→</span>
            </Link>
          )}
        </div>
      </div>
    );
  };

  return (
    <section className="dash-card rounded-2xl p-5">
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <Coins className="h-4 w-4 text-[var(--dash-accent)]" />
        <h2 className="text-sm font-bold text-[var(--dash-heading)]">
          This month&apos;s AI usage
        </h2>
        <span className="ml-auto text-[11px] text-[var(--dash-muted)]">
          {ai.allocated.toLocaleString()} AI credits included · resets at period end
        </span>
      </div>

      <div className="space-y-5">
        {bar("AI Chat Usage", MessageSquare, chatUsed, chatPct)}
        {bar("AI Voice Calling", PhoneCall, voiceUsed, voicePct)}
      </div>

      {!ledgerAvailable && (
        <p className="mt-3 text-[11px] text-[var(--dash-muted)] italic">
          AI Voice Calling usage will appear here once calls are metered.
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-[var(--dash-card-border)] pt-3">
        <span className="text-[10px] uppercase tracking-wider text-[var(--dash-muted)]">Band</span>
        <span className="inline-flex items-center gap-1.5 text-[10px] text-[var(--dash-muted)]">
          <span className="h-2 w-2 rounded-full" style={{ background: "#10b981" }} /> 0–70% ok
        </span>
        <span className="inline-flex items-center gap-1.5 text-[10px] text-[var(--dash-muted)]">
          <span className="h-2 w-2 rounded-full" style={{ background: "#f59e0b" }} /> 71–89% low
        </span>
        <span className="inline-flex items-center gap-1.5 text-[10px] text-[var(--dash-muted)]">
          <span className="h-2 w-2 rounded-full" style={{ background: "#f43f5e" }} /> 90–100% exhausted
        </span>
      </div>
    </section>
  );
}