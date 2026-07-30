"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  Calendar,
  Bot,
  BookOpen,
  MessageSquare,
  Settings,
  Phone,
  PhoneMissed,
  Menu,
  X,
  LogOut,
  Mail,
  Send,
  Sparkles,
  Terminal,
  TrendingUp,
  Shield,
  ChevronDown,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useClerk, useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Overview", href: "/dashboard/overview", icon: TrendingUp },
  { name: "AI Commander", href: "/dashboard/ai-commander", icon: Terminal },
  { name: "Leads", href: "/dashboard/leads", icon: Users },
  { name: "Appointments", href: "/dashboard/appointments", icon: Calendar },
  { name: "AI Brain", href: "/dashboard/ai-brain", icon: Bot },
  { name: "Knowledge Base", href: "/dashboard/knowledge-base", icon: BookOpen },
  { name: "Chatbot", href: "/dashboard/chatbot", icon: MessageSquare },
  { name: "Messages", href: "/dashboard/messages", icon: Mail },
  { name: "Missed Calls", href: "/dashboard/missed-calls", icon: PhoneMissed },
  { name: "Contact Support", href: "https://wa.me/13057071059", icon: Phone, external: true },
  { name: "Settings", href: "/dashboard/settings", icon: Settings },
];

const adminNav = [
  { name: "Overview", href: "/admin/overview", icon: TrendingUp },
  { name: "Tenants", href: "/admin/tenants", icon: Users },
];

export function Sidebar() {
  const pathname = usePathname();
  const { signOut } = useClerk();
  const { user, isLoaded } = useUser();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);

  const isAdmin = isLoaded && (user?.publicMetadata as any)?.role === "admin";

  // Lock body scroll when mobile sidebar is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="fixed top-3 left-3 z-50 md:hidden h-10 w-10 rounded-xl bg-slate-900/80 backdrop-blur border border-white/10 flex items-center justify-center text-white hover:bg-slate-800 transition-colors"
        aria-label={mobileOpen ? "Close menu" : "Open menu"}
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
          "fixed top-0 left-0 z-40 h-full w-64 border-r border-slate-800 bg-slate-950/90 backdrop-blur-xl text-slate-300 transition-transform duration-200",
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-800">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-sm font-bold text-white shadow-lg shadow-purple-500/25">
              AI
            </div>
            <span className="font-semibold text-sm tracking-tight text-white">AI Business OS</span>
            {/* Mobile close button */}
            <button onClick={() => setMobileOpen(false)} className="ml-auto md:hidden h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-2.5 py-3 space-y-0.5 overflow-y-auto">
            {/* Admin section */}
            {isAdmin && (
              <div className="mb-2">
                <button onClick={() => setAdminOpen(!adminOpen)} className="flex items-center justify-between w-full px-3 py-2.5 rounded-lg text-sm font-medium text-amber-400 hover:bg-amber-500/10 transition-all duration-150">
                  <span className="flex items-center gap-3"><Shield className="h-4 w-4" />Admin</span>
                  <ChevronDown className={cn("h-3.5 w-3.5 transition-transform duration-200", adminOpen && "rotate-180")} />
                </button>
                {adminOpen && (
                  <div className="mt-0.5 ml-4 space-y-0.5 border-l border-slate-800 pl-3">
                    {adminNav.map((item) => {
                      const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                      return (
                        <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)} className={cn("flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150", isActive ? "bg-slate-800 text-white shadow-sm" : "text-slate-400 hover:text-white hover:bg-slate-800/50")}>
                          <item.icon className="h-4 w-4 flex-shrink-0" />{item.name}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
            {navigation.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
              const isExternal = (item as any).external;
              const linkClass = cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150",
                isActive
                  ? "bg-slate-800 text-white shadow-sm"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/50"
              );

              if (isExternal) {
                return (
                  <a
                    key={item.href}
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={linkClass}
                  >
                    <item.icon className="h-4 w-4 flex-shrink-0" />
                    {item.name}
                  </a>
                );
              }

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={linkClass}
                >
                  <item.icon className="h-4 w-4 flex-shrink-0" />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="p-3 border-t border-slate-800">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start text-slate-400 hover:text-white"
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