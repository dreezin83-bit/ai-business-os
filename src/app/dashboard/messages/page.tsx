"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Mail, MessageSquare, Smartphone, Loader2, Search,
  Send, ArrowUpRight, Clock, Filter,
} from "lucide-react";
import Link from "next/link";
import { formatDateTime } from "@/lib/utils";

type Channel = "all" | "email" | "sms" | "whatsapp";
type MessageStatus = "sent" | "delivered" | "failed" | "bounced";

interface MessageItem {
  id: string;
  type: "email" | "sms" | "whatsapp";
  to: string;
  subject?: string;
  body: string;
  status: MessageStatus;
  leadId?: string;
  leadName?: string;
  createdAt: string;
}

const CHANNELS: { key: Channel; label: string; icon: React.ElementType }[] = [
  { key: "all", label: "All", icon: Send },
  { key: "email", label: "Email", icon: Mail },
  { key: "sms", label: "SMS", icon: Smartphone },
  { key: "whatsapp", label: "WhatsApp", icon: MessageSquare },
];

const statusConfig: Record<MessageStatus, { label: string; className: string }> = {
  sent: { label: "Sent", className: "bg-blue-500/10 text-blue-500 border-blue-500/20" },
  delivered: { label: "Delivered", className: "bg-green-500/10 text-green-500 border-green-500/20" },
  failed: { label: "Failed", className: "bg-red-500/10 text-red-500 border-red-500/20" },
  bounced: { label: "Bounced", className: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20" },
};

const channelIcon: Record<string, React.ElementType> = {
  email: Mail,
  sms: Smartphone,
  whatsapp: MessageSquare,
};

export default function MessagesPage() {
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [channelFilter, setChannelFilter] = useState<Channel>("all");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetch("/api/communications/history")
      .then((r) => r.ok ? r.json() : Promise.reject("Failed to load"))
      .then((data) => {
        setMessages(data);
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load messages");
        setLoading(false);
      });
  }, []);

  const channelCounts = CHANNELS.reduce(
    (acc, ch) => ({
      ...acc,
      [ch.key]: ch.key === "all" ? messages.length : messages.filter((m) => m.type === ch.key).length,
    }),
    {} as Record<string, number>
  );

  const filtered = messages.filter((m) => {
    if (channelFilter !== "all" && m.type !== channelFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        m.to.toLowerCase().includes(q) ||
        (m.subject && m.subject.toLowerCase().includes(q)) ||
        m.body.toLowerCase().includes(q) ||
        (m.leadName && m.leadName.toLowerCase().includes(q))
      );
    }
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-muted-foreground">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Mail className="h-6 w-6" /> Messages
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            View sent messages and communication history
          </p>
        </div>
        <Link href="/dashboard/messages/compose">
          <Button size="sm">
            <Send className="h-4 w-4 mr-1.5" /> Compose
          </Button>
        </Link>
      </div>

      {/* Channel filter tabs */}
      <div className="flex gap-1 bg-muted rounded-lg p-0.5 overflow-x-auto">
        {CHANNELS.map((ch) => (
          <button
            key={ch.key}
            onClick={() => setChannelFilter(ch.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs whitespace-nowrap transition-colors ${
              channelFilter === ch.key
                ? "bg-background shadow-sm font-medium"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <ch.icon className="h-3.5 w-3.5" />
            {ch.label} ({channelCounts[ch.key]})
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search by recipient, subject, or content..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full h-9 rounded-md border border-input bg-background pl-9 pr-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Send className="h-10 w-10 mb-3 opacity-40" />
            <p className="text-sm font-medium">No messages found</p>
            <p className="text-xs mt-1">
              {searchQuery || channelFilter !== "all"
                ? "Try adjusting your filters"
                : "Send your first message to get started"}
            </p>
            {!searchQuery && channelFilter === "all" && (
              <Link href="/dashboard/messages/compose">
                <Button variant="outline" size="sm" className="mt-4">
                  <Send className="h-3.5 w-3.5 mr-1" /> Compose Message
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      )}

      {/* Message list */}
      {filtered.length > 0 && (
        <div className="space-y-2">
          {filtered.map((msg) => {
            const Icon = channelIcon[msg.type] || Mail;
            const status = statusConfig[msg.status];

            return (
              <Card key={msg.id} className="hover:bg-accent/30 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${
                      msg.type === "email" ? "bg-blue-500/10 text-blue-500" :
                      msg.type === "sms" ? "bg-green-500/10 text-green-500" :
                      "bg-purple-500/10 text-purple-500"
                    }`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-[10px] uppercase tracking-wider">
                              {msg.type}
                            </Badge>
                            {msg.leadName && (
                              <Link
                                href={`/dashboard/leads/${msg.leadId}`}
                                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                              >
                                {msg.leadName} <ArrowUpRight className="h-3 w-3" />
                              </Link>
                            )}
                          </div>
                          <p className="text-sm font-medium mt-0.5 truncate">
                            To: {msg.to}
                          </p>
                          {msg.subject && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              Subject: {msg.subject}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge variant="outline" className={`text-[10px] ${status.className}`}>
                            {status.label}
                          </Badge>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                        {msg.body}
                      </p>
                      <div className="flex items-center gap-1 mt-2 text-[10px] text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {formatDateTime(msg.createdAt)}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}