"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Mail, Send, BarChart3, Plus, Search, Filter,
  TrendingUp, TrendingDown, Clock, Eye, MousePointerClick,
  MessageSquare, Play, Pause, MoreHorizontal, Pencil,
  Copy, Trash2, Zap, Users, CalendarDays, FileText,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, AreaChart, Area,
} from "recharts";

// ── Types ──

type CampaignStatus = "draft" | "scheduled" | "running" | "completed" | "paused";

interface EmailCampaign {
  id: string;
  name: string;
  status: CampaignStatus;
  audience: string;
  sent: number;
  opened: number;
  clicked: number;
  bounced: number;
  scheduledDate?: string;
  createdAt: string;
  subject: string;
}

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  category: string;
  lastUsed: string;
  variables: string[];
}

// ── Mock Data ──

const weeklyPerformance = [
  { day: "Mon", sent: 320, opened: 180, clicked: 45 },
  { day: "Tue", sent: 450, opened: 260, clicked: 72 },
  { day: "Wed", sent: 380, opened: 210, clicked: 58 },
  { day: "Thu", sent: 520, opened: 310, clicked: 89 },
  { day: "Fri", sent: 410, opened: 240, clicked: 63 },
  { day: "Sat", sent: 180, opened: 110, clicked: 28 },
  { day: "Sun", sent: 120, opened: 78, clicked: 15 },
];

const campaigns: EmailCampaign[] = [
  { id: "1", name: "Summer Service Special", status: "running", audience: "All Customers", sent: 2480, opened: 1230, clicked: 340, bounced: 35, createdAt: "2024-06-15", subject: "☀️ Beat the Heat - Summer Specials Inside!" },
  { id: "2", name: "Monthly Newsletter", status: "completed", audience: "Subscribers", sent: 5600, opened: 2800, clicked: 890, bounced: 112, createdAt: "2024-06-01", subject: "Your June Home Maintenance Guide" },
  { id: "3", name: "Re-engagement Series", status: "running", audience: "Inactive 90d", sent: 890, opened: 320, clicked: 78, bounced: 15, createdAt: "2024-06-10", subject: "We miss you! Special offer inside" },
  { id: "4", name: "New Service Announcement", status: "scheduled", audience: "All Customers", sent: 0, opened: 0, clicked: 0, bounced: 0, scheduledDate: "2024-07-01", createdAt: "2024-06-20", subject: "Introducing 24/7 Emergency Service" },
  { id: "5", name: "Feedback Request", status: "draft", audience: "Recent Services", sent: 0, opened: 0, clicked: 0, bounced: 0, createdAt: "2024-06-22", subject: "How was your experience?" },
];

const templates: EmailTemplate[] = [
  { id: "1", name: "Welcome Email", subject: "Welcome to {{business_name}}!", category: "Onboarding", lastUsed: "2d ago", variables: ["customer_name", "business_name"] },
  { id: "2", name: "Appointment Confirmation", subject: "Your appointment is confirmed for {{date}}", category: "Appointments", lastUsed: "5h ago", variables: ["customer_name", "service", "date", "time"] },
  { id: "3", name: "Invoice / Receipt", subject: "Your receipt from {{business_name}}", category: "Billing", lastUsed: "1d ago", variables: ["customer_name", "amount", "business_name"] },
  { id: "4", name: "Monthly Newsletter", subject: "{{month}} Newsletter - {{business_name}}", category: "Newsletter", lastUsed: "1w ago", variables: ["month", "business_name"] },
  { id: "5", name: "Follow-Up", subject: "How did we do? Share your feedback", category: "Follow-ups", lastUsed: "3d ago", variables: ["customer_name", "service"] },
];

const automationRules = [
  { trigger: "New lead captured", action: "Send welcome email sequence", enabled: true },
  { trigger: "Appointment confirmed", action: "Send confirmation + prep email", enabled: true },
  { trigger: "24h after service", action: "Send feedback request", enabled: true },
  { trigger: "No activity for 90 days", action: "Send re-engagement series", enabled: false },
  { trigger: "Quote requested", action: "Send quote template with pricing", enabled: true },
];

// ── Components ──

function CampaignCard({ campaign }: { campaign: EmailCampaign }) {
  const openRate = campaign.sent > 0 ? ((campaign.opened / campaign.sent) * 100).toFixed(1) : 0;
  const clickRate = campaign.opened > 0 ? ((campaign.clicked / campaign.opened) * 100).toFixed(1) : 0;

  return (
    <div className="bg-card rounded-lg border border-border p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Badge variant={
              campaign.status === "running" ? "success" :
              campaign.status === "paused" ? "warning" :
              campaign.status === "scheduled" ? "default" :
              campaign.status === "completed" ? "secondary" : "outline"
            } className="text-[10px] capitalize">{campaign.status}</Badge>
            <h4 className="text-sm font-medium truncate">{campaign.name}</h4>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 truncate">{campaign.subject}</p>
          <p className="text-[10px] text-muted-foreground">Target: {campaign.audience}</p>
        </div>
        <div className="flex items-center gap-1 ml-2">
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
            {campaign.status === "running" ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
          </Button>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
            <MoreHorizontal className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2 mt-3">
        <div className="text-center p-1.5 rounded-lg bg-muted/50">
          <p className="text-sm font-bold">{campaign.sent.toLocaleString()}</p>
          <p className="text-[9px] text-muted-foreground">Sent</p>
        </div>
        <div className="text-center p-1.5 rounded-lg bg-muted/50">
          <p className="text-sm font-bold text-blue-600">{openRate}%</p>
          <p className="text-[9px] text-muted-foreground">Opened</p>
        </div>
        <div className="text-center p-1.5 rounded-lg bg-muted/50">
          <p className="text-sm font-bold text-green-600">{clickRate}%</p>
          <p className="text-[9px] text-muted-foreground">CTR</p>
        </div>
        <div className="text-center p-1.5 rounded-lg bg-muted/50">
          <p className="text-sm font-bold text-red-600">{campaign.bounced}</p>
          <p className="text-[9px] text-muted-foreground">Bounced</p>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ──

export default function EmailAutomationPage() {
  const [activeTab, setActiveTab] = useState<"dashboard" | "campaigns" | "templates" | "automation">("dashboard");

  const tabs = [
    { key: "dashboard" as const, label: "Dashboard", icon: BarChart3 },
    { key: "campaigns" as const, label: "Campaigns", icon: Send },
    { key: "templates" as const, label: "Templates", icon: FileText },
    { key: "automation" as const, label: "Auto Rules", icon: Zap },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Mail className="h-8 w-8 text-primary" />
            Email Automation
          </h1>
          <p className="text-muted-foreground">Create, send, and track email campaigns</p>
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
              { label: "Sent This Week", value: "2,380", change: "+8.3%", icon: Send, trend: "up", color: "text-blue-600" },
              { label: "Open Rate", value: "56.2%", change: "+3.1%", icon: Eye, trend: "up", color: "text-green-600" },
              { label: "Click Rate", value: "18.7%", change: "+1.2%", icon: MousePointerClick, trend: "up", color: "text-purple-600" },
              { label: "Bounce Rate", value: "2.1%", change: "-0.4%", icon: TrendingDown, trend: "down", color: "text-amber-600" },
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
                      <TrendingDown className="h-3 w-3 text-green-600" />
                    )}
                    <span className={`text-xs font-medium ${stat.trend === "up" ? "text-green-600" : "text-green-600"}`}>
                      {stat.change}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Charts */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-primary" /> Weekly Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={weeklyPerformance} barSize={16}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                    <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
                    <Bar dataKey="sent" name="Sent" fill="hsl(var(--primary))" radius={[4,4,0,0]} />
                    <Bar dataKey="opened" name="Opened" fill="#3B82F6" radius={[4,4,0,0]} />
                    <Bar dataKey="clicked" name="Clicked" fill="#10B981" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Eye className="h-4 w-4 text-primary" /> Engagement Trends
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={weeklyPerformance}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                    <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
                    <Area type="monotone" dataKey="opened" name="Opened" stroke="#3B82F6" fill="rgba(59,130,246,0.1)" strokeWidth={2} />
                    <Area type="monotone" dataKey="clicked" name="Clicked" stroke="#10B981" fill="rgba(16,185,129,0.1)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
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
        </>
      )}

      {/* Campaigns Tab */}
      {activeTab === "campaigns" && (
        <>
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

          {/* Status Filters */}
          <div className="flex gap-2 flex-wrap">
            {["All", "Running", "Scheduled", "Completed", "Draft", "Paused"].map((s) => (
              <button key={s} className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${
                s === "All" ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted"
              }`}>
                {s}
              </button>
            ))}
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

          <div className="flex gap-2 flex-wrap">
            {["All", "Onboarding", "Appointments", "Billing", "Newsletter", "Follow-ups"].map((cat) => (
              <button key={cat} className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${
                cat === "All" ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted"
              }`}>
                {cat}
              </button>
            ))}
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {templates.map((t) => (
              <div key={t.id} className="bg-card rounded-lg border border-border p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h4 className="text-sm font-medium">{t.name}</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">{t.subject}</p>
                  </div>
                  <Badge variant="outline" className="text-[10px]">{t.category}</Badge>
                </div>
                {t.variables.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {t.variables.map((v) => (
                      <span key={v} className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/5 text-primary font-mono">
                        {`{{${v}}}`}
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                  <span>Last used: {t.lastUsed}</span>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="sm" className="h-7 text-xs">
                      <Send className="h-3 w-3 mr-1" /> Use
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Automation Tab */}
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
                    <div className={`w-11 h-6 rounded-full ${rule.enabled ? "bg-primary" : "bg-muted"} relative cursor-pointer transition-colors`}>
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
