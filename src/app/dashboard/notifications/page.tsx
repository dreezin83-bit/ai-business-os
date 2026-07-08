"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Bell, Check, CheckCheck, Filter, Trash2, AlertCircle,
  Info, AlertTriangle, X, MoreHorizontal, Clock,
} from "lucide-react";

const notifications = [
  { id: 1, title: "New lead captured from website chat", message: "David Wilson is interested in HVAC services", type: "lead", priority: "high", time: "2 min ago", read: false },
  { id: 2, title: "Appointment confirmed", message: "John Smith confirmed AC repair for tomorrow at 9:00 AM", type: "appointment", priority: "medium", time: "15 min ago", read: false },
  { id: 3, title: "AI escalation required", message: "Customer asking for pricing - needs human review", type: "ai", priority: "critical", time: "1 hour ago", read: false },
  { id: 4, title: "SMS campaign delivered", message: "Summer Special campaign sent to 85 contacts", type: "campaign", priority: "low", time: "3 hours ago", read: true },
  { id: 5, title: "Payment received", message: "Invoice #1024 - $299.00 from Premier Plumbing", type: "payment", priority: "medium", time: "5 hours ago", read: true },
  { id: 6, title: "New review received", message: "5-star review from Sarah Johnson ⭐", type: "review", priority: "low", time: "1 day ago", read: true },
  { id: 7, title: "System update completed", message: "AI Brain model updated to v1.4", type: "system", priority: "low", time: "2 days ago", read: true },
];

const typeIcons: Record<string, React.ElementType> = {
  lead: AlertCircle,
  appointment: Bell,
  ai: AlertTriangle,
  campaign: Info,
  payment: Bell,
  review: Info,
  system: Info,
};

const priorityColors: Record<string, string> = {
  critical: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  high: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  medium: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  low: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
};

export default function NotificationsPage() {
  const [filter, setFilter] = useState("All");
  const [notifs, setNotifs] = useState(notifications);
  const unreadCount = notifs.filter(n => !n.read).length;

  const markAllRead = () => setNotifs(prev => prev.map(n => ({ ...n, read: true })));

  const filtered = notifs.filter(n => filter === "All" || n.type === filter);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Bell className="h-8 w-8 text-primary" />
            Notifications
            {unreadCount > 0 && (
              <span className="text-sm bg-primary text-primary-foreground px-2.5 py-0.5 rounded-full">{unreadCount} unread</span>
            )}
          </h1>
          <p className="text-muted-foreground">Stay updated on everything happening in your business</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={markAllRead}>
            <CheckCheck className="h-3.5 w-3.5 mr-1" /> Mark All Read
          </Button>
          <Button variant="outline" size="sm"><Trash2 className="h-3.5 w-3.5" /></Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2 flex-wrap">
            {["All", "lead", "appointment", "ai", "campaign", "payment", "review", "system"].map((t) => (
              <button key={t} onClick={() => setFilter(t)}
                className={`px-3 py-1.5 rounded-lg text-xs transition-colors ${
                  filter === t ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {filtered.map((notif) => {
              const Icon = typeIcons[notif.type] || Bell;
              return (
                <div key={notif.id} className={`flex items-start gap-4 p-4 hover:bg-muted/50 transition-colors ${!notif.read ? "bg-primary/5" : ""}`}>
                  <div className={`rounded-full p-2 ${!notif.read ? "bg-primary/10" : "bg-muted"}`}>
                    <Icon className={`h-4 w-4 ${!notif.read ? "text-primary" : "text-muted-foreground"}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className={`text-sm ${!notif.read ? "font-semibold" : ""}`}>{notif.title}</p>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${priorityColors[notif.priority]}`}>{notif.priority}</span>
                        {!notif.read && <span className="h-2 w-2 rounded-full bg-primary" />}
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{notif.message}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      <span className="text-[10px] text-muted-foreground">{notif.time}</span>
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100">
                    <Button variant="ghost" size="sm"><Check className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="sm"><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}