"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Users, Calendar, MessageSquare, Bot, Clock, Phone, Mail,
  Plus, TrendingUp, TrendingDown, GripVertical, X, Settings,
  BarChart3, PieChart, Activity, ArrowRight, Sparkles,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart as RePie, Pie, Cell, Legend, LineChart, Line, AreaChart, Area,
} from "recharts";

const PIE_COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6"];

// Widget definitions for customization
type WidgetKey = "todayLeads" | "appointmentsToday" | "pendingFollowups" | "unreadChats" | "aiConversations" | "leadSourcesChart" | "weeklyLeadsChart" | "monthlyAppointmentsChart" | "conversionFunnelChart";

interface Widget {
  key: WidgetKey;
  label: string;
  defaultVisible: boolean;
}

const allWidgets: Widget[] = [
  { key: "todayLeads", label: "Today's Leads", defaultVisible: true },
  { key: "appointmentsToday", label: "Appointments Today", defaultVisible: true },
  { key: "pendingFollowups", label: "Pending Follow-ups", defaultVisible: true },
  { key: "unreadChats", label: "Unread Chats", defaultVisible: true },
  { key: "aiConversations", label: "AI Conversations", defaultVisible: true },
  { key: "leadSourcesChart", label: "Lead Sources", defaultVisible: true },
  { key: "weeklyLeadsChart", label: "Weekly Leads", defaultVisible: true },
  { key: "monthlyAppointmentsChart", label: "Monthly Appointments", defaultVisible: true },
  { key: "conversionFunnelChart", label: "Conversion Funnel", defaultVisible: true },
];

// ── Mock Data ──
const todayLeads = [
  { name: "David Wilson", source: "Website Chat", status: "new", time: "5 min ago", avatar: "DW" },
  { name: "Emily Clark", source: "Google Ads", status: "contacted", time: "1 hour ago", avatar: "EC" },
  { name: "Robert Taylor", source: "Referral", status: "qualified", time: "3 hours ago", avatar: "RT" },
];

const appointments = [
  { time: "9:00 AM", client: "John Smith", service: "HVAC Maintenance", status: "confirmed" },
  { time: "10:30 AM", client: "Sarah Johnson", service: "Plumbing Repair", status: "confirmed" },
  { time: "1:00 PM", client: "Mike Davis", service: "Roof Inspection", status: "pending" },
  { time: "3:30 PM", client: "Lisa Brown", service: "Electrical Wiring", status: "confirmed" },
];

const leadSources = [
  { name: "Website Chat", value: 35 },
  { name: "Google Ads", value: 25 },
  { name: "Referral", value: 20 },
  { name: "Facebook", value: 12 },
  { name: "Direct", value: 8 },
];

const weeklyLeadsData = [
  { day: "Mon", leads: 12, converted: 3 },
  { day: "Tue", leads: 18, converted: 5 },
  { day: "Wed", leads: 15, converted: 4 },
  { day: "Thu", leads: 22, converted: 7 },
  { day: "Fri", leads: 20, converted: 6 },
  { day: "Sat", leads: 8, converted: 2 },
  { day: "Sun", leads: 5, converted: 1 },
];

const monthlyAppointmentsData = [
  { month: "Jan", booked: 28, completed: 22 },
  { month: "Feb", booked: 32, completed: 27 },
  { month: "Mar", booked: 35, completed: 30 },
  { month: "Apr", booked: 40, completed: 34 },
  { month: "May", booked: 38, completed: 32 },
  { month: "Jun", booked: 45, completed: 38 },
];

const conversionFunnel = [
  { stage: "Visitors", value: 1000 },
  { stage: "Leads", value: 245 },
  { stage: "Contacted", value: 180 },
  { stage: "Qualified", value: 95 },
  { stage: "Booked", value: 62 },
  { stage: "Closed", value: 45 },
];

const activityFeed = [
  { action: "New lead captured from website chat", time: "2 min ago", icon: MessageSquare, color: "text-purple-600" },
  { action: "Appointment confirmed with John Smith", time: "15 min ago", icon: Calendar, color: "text-green-600" },
  { action: "AI resolved support ticket #1024", time: "1 hour ago", icon: Bot, color: "text-blue-600" },
  { action: "Email campaign 'Summer Special' sent to 85 contacts", time: "3 hours ago", icon: Mail, color: "text-orange-600" },
  { action: "SMS reminder sent for tomorrow's appointment", time: "5 hours ago", icon: Phone, color: "text-cyan-600" },
  { action: "New review received - 5 stars ⭐", time: "6 hours ago", icon: Activity, color: "text-yellow-600" },
  { action: "Pending follow-up with Robert Taylor", time: "8 hours ago", icon: Clock, color: "text-red-600" },
];

// ── Widget Components ──

function TodayLeadsWidget({ onRemove }: { onRemove?: () => void }) {
  return (
    <Card className="relative group">
      {onRemove && (
        <button onClick={onRemove} className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground">
          <X className="h-3.5 w-3.5" />
        </button>
      )}
      <CardHeader>
        <CardTitle className="text-sm flex items-center justify-between">
          <span className="flex items-center gap-2"><Users className="h-4 w-4 text-primary" /> Today's Leads</span>
          <Badge variant="secondary" className="text-xs">3 new</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {todayLeads.map((lead, i) => (
          <div key={i} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">
              {lead.avatar}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{lead.name}</p>
              <p className="text-xs text-muted-foreground">{lead.source} • {lead.time}</p>
            </div>
            <Badge variant={lead.status === "new" ? "default" : lead.status === "contacted" ? "warning" : "success"} className="text-[10px] px-1.5 py-0">
              {lead.status}
            </Badge>
          </div>
        ))}
        <button className="w-full text-xs text-primary hover:underline text-center mt-1">View all leads →</button>
      </CardContent>
    </Card>
  );
}

function AppointmentsWidget({ onRemove }: { onRemove?: () => void }) {
  return (
    <Card className="relative group">
      {onRemove && <button onClick={onRemove} className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"><X className="h-3.5 w-3.5" /></button>}
      <CardHeader>
        <CardTitle className="text-sm flex items-center justify-between">
          <span className="flex items-center gap-2"><Calendar className="h-4 w-4 text-primary" /> Appointments Today</span>
          <Badge variant="secondary" className="text-xs">{appointments.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {appointments.map((apt, i) => (
          <div key={i} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
            <div className="text-xs font-mono text-muted-foreground w-14 shrink-0">{apt.time}</div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{apt.client}</p>
              <p className="text-xs text-muted-foreground truncate">{apt.service}</p>
            </div>
            <Badge variant={apt.status === "confirmed" ? "success" : "warning"} className="text-[10px] px-1.5 py-0">{apt.status}</Badge>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function PendingFollowupsWidget({ onRemove }: { onRemove?: () => void }) {
  return (
    <Card className="relative group">
      {onRemove && <button onClick={onRemove} className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"><X className="h-3.5 w-3.5" /></button>}
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2"><Clock className="h-4 w-4 text-amber-500" /> Pending Follow-ups</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center py-4">
          <p className="text-3xl font-bold text-amber-500">8</p>
          <p className="text-xs text-muted-foreground mt-1">Requires attention today</p>
        </div>
        <div className="space-y-2 mt-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Overdue</span>
            <span className="font-medium text-red-500">3</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Due today</span>
            <span className="font-medium">5</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function UnreadChatsWidget({ onRemove }: { onRemove?: () => void }) {
  return (
    <Card className="relative group">
      {onRemove && <button onClick={onRemove} className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"><X className="h-3.5 w-3.5" /></button>}
      <CardHeader>
        <CardTitle className="text-sm flex items-center justify-between">
          <span className="flex items-center gap-2"><MessageSquare className="h-4 w-4 text-purple-500" /> Unread Chats</span>
          <Badge variant="destructive" className="text-xs">12</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {[
            { name: "Alice Cooper", msg: "I need help with my AC...", time: "2m" },
            { name: "Bob Martinez", msg: "Can you reschedule my...", time: "15m" },
            { name: "Carol White", msg: "Thanks for the quick...", time: "1h" },
          ].map((chat, i) => (
            <div key={i} className="flex items-start gap-2 p-2 rounded-lg hover:bg-muted/50">
              <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-xs font-medium shrink-0">
                {chat.name.split(" ").map(n => n[0]).join("")}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium">{chat.name}</p>
                  <span className="text-[10px] text-muted-foreground">{chat.time}</span>
                </div>
                <p className="text-xs text-muted-foreground truncate">{chat.msg}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function AiConversationsWidget({ onRemove }: { onRemove?: () => void }) {
  return (
    <Card className="relative group">
      {onRemove && <button onClick={onRemove} className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"><X className="h-3.5 w-3.5" /></button>}
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2"><Bot className="h-4 w-4 text-primary" /> AI Conversations</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-muted-foreground">Today</span>
              <span className="font-medium">18 convos</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div className="bg-primary h-2 rounded-full" style={{ width: "75%" }} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 text-center">
            <div className="bg-muted/50 rounded-lg p-2">
              <p className="text-lg font-bold text-green-600">12</p>
              <p className="text-[10px] text-muted-foreground">Auto-resolved</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-2">
              <p className="text-lg font-bold text-amber-500">6</p>
              <p className="text-[10px] text-muted-foreground">Escalated</p>
            </div>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Customer Satisfaction</span>
            <span className="font-medium text-green-600">94%</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function LeadSourcesChart({ onRemove }: { onRemove?: () => void }) {
  return (
    <Card className="relative group">
      {onRemove && <button onClick={onRemove} className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"><X className="h-3.5 w-3.5" /></button>}
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2"><PieChart className="h-4 w-4 text-primary" /> Lead Sources</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={200}>
          <RePie>
            <Pie data={leadSources} cx="50%" cy="50%" innerRadius={45} outerRadius={80} paddingAngle={3} dataKey="value">
              {leadSources.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
            </Pie>
            <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
            <Legend wrapperStyle={{ fontSize: "10px" }} />
          </RePie>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

function WeeklyLeadsChart({ onRemove }: { onRemove?: () => void }) {
  return (
    <Card className="relative group">
      {onRemove && <button onClick={onRemove} className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"><X className="h-3.5 w-3.5" /></button>}
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2"><BarChart3 className="h-4 w-4 text-primary" /> Weekly Leads</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={weeklyLeadsData} barSize={20}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
            <XAxis dataKey="day" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
            <Bar dataKey="leads" name="Leads" fill="hsl(var(--primary))" radius={[4,4,0,0]} />
            <Bar dataKey="converted" name="Converted" fill="#10B981" radius={[4,4,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

function MonthlyAppointmentsChart({ onRemove }: { onRemove?: () => void }) {
  return (
    <Card className="relative group">
      {onRemove && <button onClick={onRemove} className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"><X className="h-3.5 w-3.5" /></button>}
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2"><BarChart3 className="h-4 w-4 text-primary" /> Monthly Appointments</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={monthlyAppointmentsData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
            <Area type="monotone" dataKey="booked" name="Booked" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.15)" strokeWidth={2} />
            <Area type="monotone" dataKey="completed" name="Completed" stroke="#10B981" fill="rgba(16,185,129,0.1)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

function ConversionFunnelChart({ onRemove }: { onRemove?: () => void }) {
  const maxVal = Math.max(...conversionFunnel.map(f => f.value));
  return (
    <Card className="relative group">
      {onRemove && <button onClick={onRemove} className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"><X className="h-3.5 w-3.5" /></button>}
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2"><Activity className="h-4 w-4 text-primary" /> Conversion Funnel</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {conversionFunnel.map((stage) => {
            const width = (stage.value / maxVal) * 100;
            const convRate = stage.value / conversionFunnel[0].value * 100;
            return (
              <div key={stage.stage}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-medium">{stage.stage}</span>
                  <span className="text-muted-foreground">{stage.value} ({convRate.toFixed(0)}%)</span>
                </div>
                <div className="w-full bg-muted rounded-full h-3">
                  <div
                    className="bg-primary h-3 rounded-full transition-all"
                    style={{ width: `${width}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Main Dashboard Page ──

export default function DashboardPage() {
  const [visibleWidgets, setVisibleWidgets] = useState<WidgetKey[]>(
    allWidgets.filter(w => w.defaultVisible).map(w => w.key)
  );
  const [showCustomize, setShowCustomize] = useState(false);

  const toggleWidget = (key: WidgetKey) => {
    setVisibleWidgets(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const widgetComponents: Record<WidgetKey, (props: { onRemove?: () => void }) => React.JSX.Element> = {
    todayLeads: TodayLeadsWidget,
    appointmentsToday: AppointmentsWidget,
    pendingFollowups: PendingFollowupsWidget,
    unreadChats: UnreadChatsWidget,
    aiConversations: AiConversationsWidget,
    leadSourcesChart: LeadSourcesChart,
    weeklyLeadsChart: WeeklyLeadsChart,
    monthlyAppointmentsChart: MonthlyAppointmentsChart,
    conversionFunnelChart: ConversionFunnelChart,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex -space-x-2">
            {["JD", "SK", "MR"].map((initials, i) => (
              <div key={i} className="h-8 w-8 rounded-full bg-muted border-2 border-background flex items-center justify-center text-xs font-medium">
                {initials}
              </div>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={() => setShowCustomize(!showCustomize)}>
            <Settings className="h-4 w-4 mr-2" />
            Customize
          </Button>
        </div>
      </div>

      {/* Customization Panel */}
      {showCustomize && (
        <Card className="bg-muted/30">
          <CardContent className="p-4">
            <p className="text-sm font-medium mb-3">Toggle widgets on/off</p>
            <div className="flex flex-wrap gap-2">
              {allWidgets.map((w) => (
                <button
                  key={w.key}
                  onClick={() => toggleWidget(w.key)}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                    visibleWidgets.includes(w.key)
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background text-muted-foreground border-border hover:border-primary"
                  }`}
                >
                  {w.label}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Row */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
        {[
          { label: "Total Leads", value: "128", change: "+12%", icon: Users, trend: "up" },
          { label: "Appointments", value: "24", change: "+8%", icon: Calendar, trend: "up" },
          { label: "Active Chats", value: "18", change: "+23%", icon: MessageSquare, trend: "up" },
          { label: "Conversion", value: "32%", change: "+5%", icon: TrendingUp, trend: "up" },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">{stat.label}</p>
                <stat.icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="text-2xl font-bold">{stat.value}</p>
              <div className="flex items-center gap-1 mt-1">
                {stat.trend === "up" ? (
                  <TrendingUp className="h-3 w-3 text-green-600" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-red-600" />
                )}
                <span className="text-xs font-medium text-green-600">{stat.change}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="flex gap-2 flex-wrap">
        {[
          { label: "New Lead", icon: Plus, color: "bg-primary/10 text-primary" },
          { label: "Add Appointment", icon: Calendar, color: "bg-green-100 dark:bg-green-900/30 text-green-600" },
          { label: "Send Campaign", icon: Mail, color: "bg-purple-100 dark:bg-purple-900/30 text-purple-600" },
          { label: "View Reports", icon: BarChart3, color: "bg-orange-100 dark:bg-orange-900/30 text-orange-600" },
          { label: "Train AI", icon: Sparkles, color: "bg-blue-100 dark:bg-blue-900/30 text-blue-600" },
        ].map((action) => (
          <button
            key={action.label}
            className="flex items-center gap-2 rounded-lg border bg-card px-4 py-2.5 text-sm font-medium hover:bg-muted transition-colors"
          >
            <div className={`rounded-full p-1.5 ${action.color}`}>
              <action.icon className="h-3.5 w-3.5" />
            </div>
            {action.label}
          </button>
        ))}
      </div>

      {/* Widgets Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {visibleWidgets.includes("todayLeads") && (
          <TodayLeadsWidget onRemove={() => toggleWidget("todayLeads")} />
        )}
        {visibleWidgets.includes("appointmentsToday") && (
          <AppointmentsWidget onRemove={() => toggleWidget("appointmentsToday")} />
        )}
        {visibleWidgets.includes("pendingFollowups") && (
          <PendingFollowupsWidget onRemove={() => toggleWidget("pendingFollowups")} />
        )}
        {visibleWidgets.includes("unreadChats") && (
          <UnreadChatsWidget onRemove={() => toggleWidget("unreadChats")} />
        )}
        {visibleWidgets.includes("aiConversations") && (
          <AiConversationsWidget onRemove={() => toggleWidget("aiConversations")} />
        )}
        {visibleWidgets.includes("leadSourcesChart") && (
          <LeadSourcesChart onRemove={() => toggleWidget("leadSourcesChart")} />
        )}
        {visibleWidgets.includes("weeklyLeadsChart") && (
          <WeeklyLeadsChart onRemove={() => toggleWidget("weeklyLeadsChart")} />
        )}
        {visibleWidgets.includes("monthlyAppointmentsChart") && (
          <MonthlyAppointmentsChart onRemove={() => toggleWidget("monthlyAppointmentsChart")} />
        )}
        {visibleWidgets.includes("conversionFunnelChart") && (
          <ConversionFunnelChart onRemove={() => toggleWidget("conversionFunnelChart")} />
        )}
      </div>

      {/* Activity Feed */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            Activity Feed
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            {activityFeed.map((item, i) => (
              <div key={i} className="flex items-start gap-3 py-2.5 border-b border-border last:border-0">
                <div className={`rounded-full p-1.5 bg-muted ${item.color} mt-0.5`}>
                  <item.icon className="h-3.5 w-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm">{item.action}</p>
                  <p className="text-xs text-muted-foreground">{item.time}</p>
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}