"use client";

/**
 * Root error boundary for the signed-in dashboard segment.
 *
 * Safety net under the (auth) layout's onboarding gate: any residual
 * server-render error in this segment shows a graceful, on-brand retry card
 * instead of the raw deployment digest page ("This page couldn't load — ERROR
 * <digest>") that customers saw during the 2026-10-27 fresh-tenant outage
 * (digest 783175523). The gate prevents that specific crash; this boundary
 * keeps ANY future render error inside a recoverable UI.
 *
 * NOTE: per Next.js semantics this does NOT catch errors thrown by this
 * segment's own layout (those need a parent boundary) — it catches errors in
 * every page under /dashboard/** , which is where render throws live.
 */
import { useEffect } from "react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[dashboard] render error", error);
  }, [error]);

  return (
    <div className="flex min-h-[50vh] items-center justify-center p-6">
      <div className="dash-card w-full max-w-md rounded-2xl p-8 text-center">
        <p className="text-sm font-semibold dash-heading">
          The dashboard hit a snag
        </p>
        <p className="mt-2 text-xs dash-muted">
          Something went wrong loading this page. Reload to try again — your
          data is safe.
        </p>
        <button
          type="button"
          onClick={() => reset()}
          className="mt-5 inline-flex h-9 items-center gap-1.5 rounded-full border border-[var(--dash-card-border-hover)] px-4 text-xs font-semibold text-[var(--dash-heading)] transition-colors hover:bg-[var(--dash-hover)]"
        >
          Try again
        </button>
      </div>
    </div>
  );
}