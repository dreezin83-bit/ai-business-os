"use client";

import { useEffect, useState } from "react";
import {
  Terminal, Building2, Users, CalendarCheck, PhoneMissed, MessagesSquare,
} from "lucide-react";
import { AiCommanderView } from "@/components/dashboard/views/ai-commander-view";

interface WorkspaceContext {
  businessName?: string;
  leads: number;
  appts: number;
  missed: number;
  convos: number;
}

/**
 * CopilotPage — the Sagenify Business Co-Pilot workspace
 * (/dashboard/copilot). Formerly "AI Commander": a ChatGPT-like workspace
 * that answers with the business's own context (leads, appointments, AI
 * Brain knowledge).
 *
 * Workspace context chips are surfaced above the chat: business name,
 * leads, upcoming appointments, missed calls and conversations — pulled from
 * the live dashboard stats + settings endpoints. If either fetch fails the
 * chips row simply hides (graceful fallback; the chat still works).
 * System-context wiring into the AI route itself is the architect's
 * contract; the chips give the user the same visibility client-side.
 */
export default function CopilotPage() {
  const [ctx, setCtx] = useState<WorkspaceContext | null>(null);

  useEffect(() => {
    let mounted = true;
    Promise.all([
      fetch("/api/dashboard/stats").then((r) => (r.ok ? r.json() : null)),
      fetch("/api/settings").then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([stats, settings]) => {
        if (!mounted || !stats) return;
        setCtx({
          businessName:
            typeof settings?.name === "string" && settings.name
              ? settings.name
              : settings?.businessName || undefined,
          leads: Number(stats.totalLeads ?? 0),
          appts: Number(stats.upcomingAppointments ?? 0),
          missed: Number(stats.missedCalls ?? 0),
          convos: Number(stats.recentConversations ?? 0),
        });
      })
      .catch(() => setCtx(null));
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight dash-heading">
          <Terminal className="h-6 w-6" /> Sagenify Business Co-Pilot
        </h1>
        <p className="mt-1 text-sm dash-muted">
          Ask your business anything — your Co-Pilot answers from your leads,
          appointments, and knowledge base.
        </p>
      </div>

      {/* Workspace context chips (hidden gracefully when stats are unavailable) */}
      {ctx && (
        <div className="flex flex-wrap items-center gap-2" aria-label="Workspace context">
          {ctx.businessName && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--dash-card-border-hover)] bg-[var(--dash-card)] px-3 py-1.5 text-[11px] font-semibold text-[var(--dash-heading)]">
              <Building2 className="h-3 w-3 text-[var(--dash-accent)]" />
              {ctx.businessName}
            </span>
          )}
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--dash-card-border-hover)] bg-[var(--dash-card)] px-3 py-1.5 text-[11px] font-medium text-[var(--dash-muted)]">
            <Users className="h-3 w-3" /> {ctx.leads} leads
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--dash-card-border-hover)] bg-[var(--dash-card)] px-3 py-1.5 text-[11px] font-medium text-[var(--dash-muted)]">
            <CalendarCheck className="h-3 w-3" /> {ctx.appts} upcoming appointments
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--dash-card-border-hover)] bg-[var(--dash-card)] px-3 py-1.5 text-[11px] font-medium text-[var(--dash-muted)]">
            <PhoneMissed className="h-3 w-3" /> {ctx.missed} missed calls
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--dash-card-border-hover)] bg-[var(--dash-card)] px-3 py-1.5 text-[11px] font-medium text-[var(--dash-muted)]">
            <MessagesSquare className="h-3 w-3" /> {ctx.convos} conversations
          </span>
        </div>
      )}

      <AiCommanderView />
    </div>
  );
}