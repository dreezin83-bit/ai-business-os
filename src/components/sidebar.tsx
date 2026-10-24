"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  Bot,
  Inbox,
  Zap,
  Settings,
  Menu,
  X,
  LogOut,
  Sparkles,
  MessageSquare,
  PhoneCall,
  BookOpen,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useState } from "react";
import { useClerk } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { ThemeSwitcher } from "@/components/dashboard/theme-switcher";

type NavItem = {
  name: string;
  href: string;
  icon: LucideIcon;
  /** Extra paths that should light this item up (tab routes absorb their old pages). */
  match?: string[];
};

type NavSection = {
  label: string;
  items: NavItem[];
};

/**
 * Grouped sidebar navigation — 4 owner-specified sections. Old routes are
 * never deleted; tab routes (/dashboard/communications, /dashboard/ai-brain)
 * simply absorb the former flat items via shared tab views.
 */
const navSections: NavSection[] = [
  {
    label: "Main Workspace",
    items: [
      { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      {
        name: "Business Co-Pilot",
        href: "/dashboard/copilot",
        icon: Sparkles,
        match: ["/dashboard/copilot", "/dashboard/ai-commander"],
      },
      {
        name: "Leads & Appointments",
        href: "/dashboard/leads",
        icon: Users,
        match: ["/dashboard/leads", "/dashboard/appointments"],
      },
    ],
  },
  {
    label: "Communications",
    items: [
      {
        name: "Inbox & Calls",
        href: "/dashboard/communications",
        icon: Inbox,
        match: [
          "/dashboard/communications",
          "/dashboard/messages",
          "/dashboard/missed-calls",
          "/dashboard/settings/communication",
        ],
      },
      {
        name: "Chatbot",
        href: "/dashboard/chatbot",
        icon: MessageSquare,
        match: ["/dashboard/chatbot"],
      },
      {
        name: "AI Voice Call",
        href: "/dashboard/voice",
        icon: PhoneCall,
        match: ["/dashboard/voice"],
      },
    ],
  },
  {
    label: "AI Settings & Knowledge",
    items: [
      {
        name: "AI Brain",
        href: "/dashboard/ai-brain",
        icon: Bot,
        match: ["/dashboard/ai-brain"],
      },
      {
        name: "Knowledge Base",
        href: "/dashboard/knowledge-base",
        icon: BookOpen,
        match: ["/dashboard/knowledge-base"],
      },
      {
        name: "Automations",
        href: "/dashboard/automations",
        icon: Zap,
        match: ["/dashboard/automations", "/dashboard/automation"],
      },
    ],
  },
];

function isActive(item: NavItem, pathname: string) {
  const paths = item.match ?? [item.href];
  return paths.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const { signOut } = useClerk();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        aria-label={mobileOpen ? "Close menu" : "Open menu"}
        className="fixed top-4 left-4 z-50 md:hidden h-10 w-10 flex items-center justify-center rounded-lg bg-slate-900/80 border border-slate-800 text-white/80 hover:text-white active:scale-95 transition-all"
      >
        {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 z-40 h-full w-64 border-r border-[var(--dash-divider)] bg-[var(--dash-sidebar)] backdrop-blur-xl text-[var(--dash-text)] transition-transform duration-200",
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center gap-3 px-5 py-4 border-b border-[var(--dash-divider)]">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-sm font-bold text-white shadow-lg shadow-purple-500/25">
              S
            </div>
            <span className="font-semibold text-sm tracking-tight text-[var(--dash-heading)]">Sagenify AI</span>
          </div>

          {/* Grouped navigation */}
          <nav className="flex-1 px-2.5 py-3 overflow-y-auto">
            {navSections.map((section) => (
              <div key={section.label} className="mb-4 last:mb-0">
                <p className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--dash-muted)]">
                  {section.label}
                </p>
                <div className="space-y-0.5">
                  {section.items.map((item) => {
                    const active = isActive(item, pathname);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        prefetch
                        onClick={() => setMobileOpen(false)}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150",
                          active
                            ? "bg-[var(--dash-card-hover)] text-[var(--dash-heading)] shadow-sm"
                            : "text-[var(--dash-muted)] hover:text-[var(--dash-heading)] hover:bg-[var(--dash-hover)]"
                        )}
                        aria-current={active ? "page" : undefined}
                      >
                        <item.icon className="h-4 w-4 flex-shrink-0" />
                        {item.name}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          {/* Account & Preferences */}
          <div className="p-3 border-t border-[var(--dash-divider)]">
            <p className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--dash-muted)]">
              Account &amp; Preferences
            </p>
            <div className="space-y-0.5">
              <Link
                href="/dashboard/settings"
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150",
                  isActive({ name: "Settings", href: "/dashboard/settings", icon: Settings }, pathname)
                    ? "bg-[var(--dash-card-hover)] text-[var(--dash-heading)] shadow-sm"
                    : "text-[var(--dash-muted)] hover:text-[var(--dash-heading)] hover:bg-[var(--dash-hover)]"
                )}
              >
                <Settings className="h-4 w-4 flex-shrink-0" />
                Settings
              </Link>
            </div>
            <ThemeSwitcher />
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start text-[var(--dash-muted)] hover:text-[var(--dash-heading)]"
              onClick={() => signOut({ redirectUrl: "/" })}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </aside>
    </>
  );
}