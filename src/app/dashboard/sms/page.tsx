"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Smartphone, MessageSquare, Send, BarChart3, Plus, Search,
  Filter, Clock, CheckCircle2, XCircle, Reply, TrendingUp,
  TrendingDown, Users, Calendar, ChevronDown, Play, Pause,
  Copy, Pencil, Trash2, MoreHorizontal, Zap,
} from "lucide-react";

// ── Types ──

interface SMSCampaign {
  id: string;
  name: string;
  status: "draft" | "scheduled" | "running" | "completed" | "paused";
  audience: string;
  sent: number;
  delivered: number;
  replied: number;
  scheduledDate?: string;
  createdAt: string;
}

interface SMSTemplate {
  id: string;
  name: string;
  content: string;
  variables: string[];
  lastUsed: string;
  category: string;
}

interface Conversation {
  id: string;
  name: string;
  lastMessage: string;
  time: string;
  unread: number;
  avatar: string;
  status: "active" | "resolved" | "pending";
}

// ── Mock Data ──

const campaigns: SMSCampaign[] = [
  { id: "1", name: "Summer Promo Blast", status: "running", audience: "All Customers", sent: 1248, delivered: 1198, replied: 89, createdAt: "2024-06-15" },
  { id: "2", name: "Appointment Reminder", status: "running", audience: "Upcoming Appts", sent: 342, delivered: 338, replied: 45, createdAt: "2024-06-10" },
  { id: "3", name: "Holiday Greetings", status: "scheduled", audience: "All Customers", sent: 0, delivered: 0, replied: 0, scheduledDate: "2024-07-04", createdAt: "2024-06-20" },
  { id: "4", name: "Feedback Request", status: "completed", audience: "Recent Services", sent: 567, delivered: 543, replied: 112, createdAt: "2024-05-28" },
  { id: "5", name: "Re-engagement", status: "draft", audience: "Inactive (90d)", sent: 0, delivered: 0, replied: 0, createdAt: "2024-06-22" },
];

const templates: SMSTemplate[] = [
  { id: "1", name: "Appointment Confirmation", content: "Hi {{customer_name}}, your {{service}} appointment is confirmed for {{date}} at {{time}}. Reply C to confirm.", variables: ["customer_name", "service", "date", "time"], lastUsed: "2h ago", category: "Appointments" },
  { id: "2", name: "Appointment Reminder", content: "Reminder: {{customer_name}}, you have a {{service}} appointment tomorrow at {{time}}. Reply R to reschedule.", variables: ["customer_name", "service", "time"], lastUsed: "1d ago", category: "Appointments" },
  { id: "3", name: "Follow-Up", content: "Hi {{customer_name}}, thanks for choosing us! How was your {{service}} experience? Reply with a rating 1-5.", variables: ["customer_name", "service"], lastUsed: "3d ago", category: "Follow-ups" },
  { id: "4", name: "Promotional", content: "Special offer! Get {{discount}}% off {{service}} this month. Call {{phone}} or reply to book!", variables: ["discount", "service", "phone"], lastUsed: "1w ago", category: "Marketing" },
  { id: "5", name: "Thank You", content: "Thank you {{customer_name}} for your business! We appreciate your trust in us.", variables: ["customer_name"], lastUsed: "2w ago", category: "Follow-ups" },
];

const conversations: Conversation[] = [
  { id: "1", name: "John Smith", lastMessage: "Can you reschedule my appointment to Thursday?", time: "2m", unread: 2, avatar: "JS", status: "active" },
  { id: "2", name: "Sarah Johnson", lastMessage: "Thanks for the quick service! ⭐⭐⭐⭐⭐", time: "15m", unread: 0, avatar: "SJ", status: "resolved" },
  { id: "3", name: "Mike Davis", lastMessage: "How much does AC repair cost?", time: "1h", unread: 1, avatar: "MD", status: "active" },
  { id: "4", name: "Lisa Brown", lastMessage: "I need help with my plumbing ASAP", time: "3h", unread: 0, avatar: "LB", status: "pending" },
  { id: "5", name: "Robert Taylor", lastMessage: "Yes, please send me the quote", time: "5h", unread: 0, avatar: "RT", status: "resolved" },
];

const automationRules = [
  { trigger: "Lead captured", action: "Send welcome SMS within 5 min", enabled: true },
  { trigger: "Appointment booked", action: "Send confirmation SMS immediately", enabled: true },
  { trigger: "24h before appointment", action: "Send reminder SMS", enabled: true },
  { trigger: "No-show detected", action: "Send reschedule SMS with link", enabled: true },
  { trigger: "Service completed", action: "Send feedback request after 2h", enabled: false },
];

// ── Components ──

function CampaignCard({ campaign }: { campaign: SMSCampaign }) {
  const statusColors: Record<string, string> = {
    running: "bg-green-500",
    draft: "bg-muted",
    scheduled: "bg-blue-500",
    completed: "bg-primary/50",
    paused: "bg-amber-500",
  };

  return (
    <div className="bg-card rounded-lg border border-border p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2">
            <div className={`h-2 w-2 rounded-full ${statusColors[campaign.status]}`} />
            <h4 className="text-sm font-medium">{campaign.name}</h4>
          </div>
          <p className="text-xs text-muted-foreground mt-1">Target: {campaign.audience}</p>
        </div>
        <Badge variant={
          campaign.status === "running" ? "success" :
          campaign.status === "paused" ? "warning" :
          campaign.status === "scheduled" ? "default" :
          campaign.status === "completed" ? "secondary" : "outline"
        } className="text-[10px] capitalize">
          {campaign.status}
        </Badge>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="text-center p-2 rounded-lg bg-muted/50">
          <p className="text-lg font-bold">{campaign.sent}</p>
          <p className="text-[10px] text-muted-foreground">Sent</p>
        </div>
        <div className="text-center p-2 rounded-lg bg-muted/50">
          <p className="text-lg font-bold text-green-600">{campaign.delivered}</p>
          <p className="text-[10px] text-muted-foreground">Delivered</p>
        </div>
        <div className="text-center p-2 rounded-lg bg-muted/50">
          <p className="text-lg font-bold text-purple-600">{campaign.replied}</p>
          <p className="text-[10px] text-muted-foreground">Replies</p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-[10px] text-muted-foreground">
          Delivery rate: {campaign.sent > 0 ? ((campaign.delivered / campaign.sent) * 100).toFixed(1) : 0}%
        </span>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
            {campaign.status === "running" ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
          </Button>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
            <MoreHorizontal className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function TemplateCard({ template }: { template: SMSTemplate }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-card rounded-lg border border-border p-3 hover:shadow-sm transition-shadow cursor-pointer" onClick={() => setExpanded(!expanded)}>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{template.name}</span>
            <Badge variant="outline" className="text-[8px] px-1">{template.category}</Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{template.content}</p>
        </div>
        <div className="flex items-center gap-1 ml-2">
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
            <Copy className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
      {expanded && (
        <div className="mt-3 pt-3 border-t border-border space-y-2">
          <div className="bg-muted/50 rounded-lg p-3">
            <p className="text-sm font-mono text-muted-foreground">{template.content}</p>
          </div>
          {template.variables.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {template.variables.map((v) => (
                <span key={v} className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-mono">
                  {`{{${v}}}`}
                </span>
              ))}
            </div>
          )}
          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
            <span>Last used: {template.lastUsed}</span>
            <Button variant="outline" size="sm" className="h-7 text-xs">
              <Send className="h-3 w-3 mr-1" /> Use Template
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Page ──

export default function SMSAutomationPage() {
  const [activeTab, setActiveTab] = useState<"dashboard" | "campaigns" | "templates" | "conversations" | "automation">("dashboard");

  const tabs = [
    { key: "dashboard" as const, label: "Dashboard", icon: BarChart3 },
    { key: "campaigns" as const, label: "Campaigns", icon: Send },
    { key: "templates" as const, label: "Templates", icon: MessageSquare },
    { key: "conversations" as const, label: "Conversations", icon: Smartphone },
    { key: "automation" as const, label: "Auto Rules", icon: Zap },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Smartphone className="h-8 w-8 text-primary" />
            SMS Automation
          </h1>
          <p className="text-muted-foreground">Send, automate, and track SMS campaigns</p>
        </div>
        <Button size="sm">
          <Plus className="h-3.5 w-3.5 mr-1" /> New Campaign
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-muted rounded-lg p-0.5 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm whitespace-nowrap transition-colors ${
              activeTab === tab.key
                ? "bg-background shadow-sm font-medium"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Dashboard Tab */}
      {activeTab === "dashboard" && (
        <>
          {/* Stats */}
          <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
            {[
              { label: "Sent Today", value: "1,247", change: "+12.5%", icon: Send, trend: "up", color: "text-blue-600" },
              { label: "Delivered", value: "1,198", change: "96.1% rate", icon: CheckCircle2, trend: "up", color: "text-green-600" },
              { label: "Failed", value: "49", change: "3.9% rate", icon: XCircle, trend: "down", color: "text-red-600" },
              { label: "Reply Rate", value: "8.2%", change: "+1.3%", icon: Reply, trend: "up", color: "text-purple-600" },
            ].map((stat) => (
              <Card key={stat.label}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">{stat.label}</p>
                    <stat.icon className={`h-4 w-4 ${stat.color}`} />
                  </div>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <div className="flex items-center gap-1 mt-1">
                    {stat.trend === "up" ? (
                      <TrendingUp className="h-3 w-3 text-green-600" />
                    ) : (
                      <TrendingDown className="h-3 w-3 text-red-600" />
                    )}
                    <span className={`text-xs font-medium ${stat.trend === "up" ? "text-green-600" : "text-red-600"}`}>
                      {stat.change}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Recent Campaigns */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center justify-between">
                <span className="flex items-center gap-2"><Send className="h-4 w-4 text-primary" /> Recent Campaigns</span>
                <Button variant="ghost" size="sm" className="text-xs">View All</Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {campaigns.filter(c => c.status !== "draft").slice(0, 3).map((c) => (
                  <CampaignCard key={c.id} campaign={c} />
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Quick Templates */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center justify-between">
                <span className="flex items-center gap-2"><MessageSquare className="h-4 w-4 text-primary" /> Quick Templates</span>
                <Button variant="ghost" size="sm" className="text-xs">View All</Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {templates.slice(0, 3).map((t) => (
                  <TemplateCard key={t.id} template={t} />
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Campaigns Tab */}
      {activeTab === "campaigns" && (
        <>
          {/* Filters */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search campaigns..."
                className="w-full h-10 rounded-lg border border-input bg-background pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <Button variant="outline" size="sm"><Filter className="h-4 w-4 mr-1" /> Filter</Button>
            <Button variant="outline" size="sm"><Clock className="h-4 w-4 mr-1" /> Schedule</Button>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {campaigns.map((c) => (
              <CampaignCard key={c.id} campaign={c} />
            ))}
          </div>
        </>
      )}

      {/* Templates Tab */}
      {activeTab === "templates" && (
        <>
          <div className="flex items-center justify-between">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search templates..."
                className="w-full h-10 rounded-lg border border-input bg-background pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <Button size="sm"><Plus className="h-3.5 w-3.5 mr-1" /> New Template</Button>
          </div>

          {/* Categories */}
          <div className="flex gap-2 flex-wrap">
            {["All", "Appointments", "Follow-ups", "Marketing", "Reminders", "Thank You"].map((cat) => (
              <button key={cat} className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${
                cat === "All" ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted"
              }`}>
                {cat}
              </button>
            ))}
          </div>

          <div className="grid gap-2">
            {templates.map((t) => (
              <TemplateCard key={t.id} template={t} />
            ))}
          </div>
        </>
      )}

      {/* Conversations Tab */}
      {activeTab === "conversations" && (
        <div className="grid gap-4 lg:grid-cols-3">
          {/* Conversation List */}
          <Card className="lg:col-span-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center justify-between">
                <span className="flex items-center gap-2"><MessageSquare className="h-4 w-4 text-primary" /> Conversations</span>
                <Badge variant="secondary" className="text-[10px]">3 unread</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {conversations.map((conv) => (
                  <div key={conv.id} className="flex items-center gap-3 p-3 hover:bg-muted/50 cursor-pointer transition-colors">
                    <div className="relative">
                      <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">
                        {conv.avatar}
                      </div>
                      {conv.unread > 0 && (
                        <div className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-destructive flex items-center justify-center text-[8px] text-destructive-foreground font-bold">
                          {conv.unread}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">{conv.name}</p>
                        <span className="text-[10px] text-muted-foreground">{conv.time}</span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{conv.lastMessage}</p>
                    </div>
                    <div className={`h-2 w-2 rounded-full shrink-0 ${
                      conv.status === "active" ? "bg-green-500" :
                      conv.status === "pending" ? "bg-amber-500" : "bg-muted"
                    }`} />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Chat View */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">
                  JS
                </div>
                <div>
                  <CardTitle className="text-sm">John Smith</CardTitle>
                  <p className="text-[10px] text-muted-foreground">Active now</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 h-[400px] overflow-y-auto mb-3">
                {[
                  { role: "assistant", content: "Hi John! Your appointment is confirmed for tomorrow at 10:30 AM. Reply C to confirm.", time: "10:30 AM" },
                  { role: "user", content: "Can you reschedule my appointment to Thursday?", time: "10:32 AM" },
                  { role: "assistant", content: "Sure! Let me check availability. We have Thursday at 2:00 PM or 4:00 PM. Which works for you?", time: "10:32 AM" },
                ].map((msg, i) => (
                  <div key={i} className={`flex gap-2 ${msg.role === "user" ? "justify-end" : ""}`}>
                    {msg.role === "assistant" && (
                      <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-medium text-primary shrink-0">
                        AI
                      </div>
                    )}
                    <div className={`max-w-[75%] rounded-xl p-3 ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    }`}>
                      <p className="text-sm">{msg.content}</p>
                      <p className={`text-[10px] mt-1 ${msg.role === "user" ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                        {msg.time}
                      </p>
                    </div>
                    {msg.role === "user" && (
                      <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-[10px] font-medium shrink-0">
                        JS
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Type a message..."
                  className="flex-1 h-10 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <Button size="sm">
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Automation Rules Tab */}
      {activeTab === "automation" && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Zap className="h-4 w-4 text-primary" /> Automation Rules
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {automationRules.map((rule, i) => (
                <div key={i} className="flex items-center justify-between p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-11 h-6 rounded-full ${rule.enabled ? "bg-primary" : "bg-muted"} relative cursor-pointer transition-colors`}
                    >
                      <div className={`w-5 h-5 rounded-full bg-white absolute top-0.5 shadow transition-all ${
                        rule.enabled ? "left-5" : "left-0.5"
                      }`} />
                    </div>
                    <div>
                      <p className="text-sm font-medium">When {rule.trigger}</p>
                      <p className="text-xs text-muted-foreground">{rule.action}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
          <Button variant="outline" className="w-full">
            <Plus className="h-3.5 w-3.5 mr-1" /> Add Automation Rule
          </Button>
        </div>
      )}
    </div>
  );
}
