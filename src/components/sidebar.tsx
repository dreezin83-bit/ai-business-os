"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  LayoutDashboard,
  Bot,
  MessageSquare,
  Users,
  Calendar,
  Smartphone,
  Mail,
  BookOpen,
  BarChart3,
  UserCircle,
  MessagesSquare,
  Puzzle,
  Bell,
  Settings,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useState } from "react";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "AI Brain", href: "/dashboard/ai-brain", icon: Bot },
  { name: "AI Chatbot", href: "/dashboard/chatbot", icon: MessageSquare },
  { name: "CRM", href: "/dashboard/crm", icon: Users },
  { name: "Appointment Booking", href: "/dashboard/appointments", icon: Calendar },
  { name: "SMS Automation", href: "/dashboard/sms", icon: Smartphone },
  { name: "Email Automation", href: "/dashboard/email", icon: Mail },
  { name: "Knowledge Base", href: "/dashboard/knowledge-base", icon: BookOpen },
  { name: "Reporting", href: "/dashboard/reports", icon: BarChart3 },
  { name: "Customers", href: "/dashboard/customers", icon: UserCircle },
  { name: "Conversations", href: "/dashboard/conversations", icon: MessagesSquare },
  { name: "Connectors", href: "/dashboard/connectors", icon: Puzzle },
  { name: "Notifications", href: "/dashboard/notifications", icon: Bell },
  { name: "Settings", href: "/dashboard/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-border bg-background transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      <div className="flex h-14 items-center border-b border-border px-4">
        <Link href="/dashboard" className="flex items-center gap-2">
          <Bot className="h-6 w-6 text-primary" />
          {!collapsed && (
            <span className="font-bold text-lg whitespace-nowrap">AI Business OS</span>
          )}
        </Link>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="ml-auto rounded-md p-1 hover:bg-muted"
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto p-2 space-y-1">
        {navigation.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                isActive
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
              title={collapsed ? item.name : undefined}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {!collapsed && <span>{item.name}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border p-3">
        <div className={cn("flex items-center", collapsed ? "justify-center" : "gap-2")}>
          <ThemeToggle />
          {!collapsed && (
            <span className="text-xs text-muted-foreground">Toggle theme</span>
          )}
        </div>
      </div>
    </aside>
  );
}