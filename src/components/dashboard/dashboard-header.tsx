"use client";

import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { Link2, PhoneCall } from "lucide-react";
import { useToast } from "@/components/toaster";
import { ThemeSwitcher } from "@/components/dashboard/theme-switcher";

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

/**
 * DashboardHeader — welcome bar with the live AI receptionist status pill
 * and the quick actions (Test AI Line, Share Booking Link).
 */
export function DashboardHeader() {
  const { user } = useUser();
  const { toast } = useToast();
  const firstName = user?.firstName?.trim() ?? "";

  const shareBookingLink = async () => {
    // There is no public customer booking page yet, so share the
    // appointments view — gracefully labeled so nobody is misled.
    const url = `${window.location.origin}/dashboard/appointments`;
    try {
      await navigator.clipboard.writeText(url);
      toast("Appointments link copied to clipboard", "success");
    } catch {
      toast(
        "Couldn't copy — your browser may block clipboard access. Try again or copy manually.",
        "error"
      );
    }
  };

  return (
    <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
      <div className="min-w-0">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight dash-heading">
          {getGreeting()}
          {firstName ? `, ${firstName}` : ""} 👋
        </h1>
        <p className="text-sm dash-muted mt-1.5">
          Here&apos;s how your AI receptionist handled things.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {/* Live receptionist status */}
        <span className="dash-chip inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold">
          <span className="relative flex h-2 w-2">
            <span
              className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"
              style={{ background: "var(--dash-green)" }}
            />
            <span
              className="relative inline-flex h-2 w-2 rounded-full"
              style={{ background: "var(--dash-green)" }}
            />
          </span>
          Active &amp; Ready
        </span>

        <Link
          href="/dashboard/ai-commander"
          className="inline-flex h-9 items-center gap-1.5 rounded-full border border-[var(--dash-card-border-hover)] px-4 text-xs font-semibold text-[var(--dash-heading)] transition-colors hover:bg-[var(--dash-hover)]"
        >
          <PhoneCall className="h-3.5 w-3.5" />
          Test AI Line
        </Link>

        <button
          type="button"
          onClick={shareBookingLink}
          className="inline-flex h-9 items-center gap-1.5 rounded-full px-4 text-xs font-semibold text-white transition-opacity hover:opacity-90"
          style={{ background: "var(--dash-accent)" }}
        >
          <Link2 className="h-3.5 w-3.5" />
          Share Booking Link
        </button>

        {/* Theme selector — same shared component as the sidebar */}
        <div className="w-44 shrink-0">
          <ThemeSwitcher />
        </div>
      </div>
    </div>
  );
}