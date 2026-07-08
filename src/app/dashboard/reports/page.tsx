"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  BarChart3, Download, Calendar, TrendingUp, TrendingDown,
  Users, DollarSign, CalendarDays, Clock, Activity,
  PieChart, LineChart, Sparkles, FileText, Plus,
  ChevronDown, Filter, X, RefreshCw, Settings,
  Smartphone, Mail, Bot, Target, Award,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart as RePie, Pie, Cell, Legend, LineChart as ReLine, Line,
  AreaChart, Area,
} from "recharts";

// ── Types ──

type DateRange = "today" | "week" | "month" | "quarter" | "year" | "custom";

interface MetricCard {
  label: string;
  value: string;
  change: string;
  trend: "up" | "down";
  icon: React.ElementType;
  color: string;
}

interface ReportWidget {
  id: string;
  title: string;
  type: "metric" | "chart" | "list" | "insight";
  visible: boolean;
}

// ── Mock Data ──

const PIE_COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899"];

const leadGrowthData = [
  { month: "Jan", leads: 120, converted: 32 },
  { month: "Feb", leads: 145, converted: 38 },
  { month: "Mar", leads: 168, converted: 45 },
  { month: "Apr", leads: 195, converted: 52 },
  { month: "May", leads: 220, converted: 58 },
  { month: "Jun", leads: 245, converted: 65 },
];

const appointmentsData = [
  { month: "Jan", booked: 85, completed: 72 },
  { month: "Feb", booked: 92, completed: 78 },
  { month: "Mar", booked: 105, completed: 90 },
  { month: "Apr", booked: 118, completed: 102 },
  { month: "May", booked: 130, completed: 112 },
  { month: "Jun", booked: 142, completed: 125 },
];

const leadSources = [
  { name: "Website Chat", value: 35 },
  { name: "Google Ads", value: 25 },
  { name: "Referral", value: 20 },
  { name: "Facebook", value: 12 },
  { name: "Direct", value: 8 },
];

const conversionFunnel = [
  { stage: "Visitors", value: 2450 },
  { stage: "Leads", value: 580 },
  { stage: "Contacted", value: 420 },
  { stage: "Qualified", value: 280 },
  { stage: "Booked", value: 185 },
  { stage: "Closed", value: 130 },
];

const revenueData = [
  { month: "Jan", revenue: 28500, expenses: 18000 },
  { month: "Feb", revenue: 32000, expenses: 19500 },
  { month: "Mar", revenue: 35800, expenses: 21000 },
  { month: "Apr", revenue: 39200, expenses: 22500 },
  { month: "May", revenue: 42500, expenses: 24000 },
  { month: "Jun", revenue: 46800, expenses: 25800 },
];

const channelPerformance = [
  { channel: "SMS", sent: 12480, conversion: 8.2 },
  { channel: "Email", sent: 24800, conversion: 12.5 },
  { channel: "Chatbot", sent: 8900, conversion: 15.3 },
  { channel: "Phone", sent: 3200, conversion: 22.1 },
];

const scheduledReports = [
  { name: "Weekly Performance Summary", frequency: "Every Monday", recipients: "admin@business.com", format: "PDF", lastSent: "2 days ago" },
  { name: "Monthly Revenue Report", frequency: "1st of month", recipients: "admin@business.com, team@business.com", format: "PDF + CSV", lastSent: "8 days ago" },
  { name: "Daily Lead Summary", frequency: "Daily at 9 AM", recipients: "team@business.com", format: "Email", lastSent: "Today" },
];

const aiInsights = [
  { type: "positive", title: "Lead conversion up 18%", description: "AI-powered follow-ups are driving a significant increase in conversion rates. Consider expanding SMS automation hours." },
  { type: "warning", title: "Email open rate declining", description: "Open rates dropped 3% this week. Try A/B testing subject lines or adjusting send times for better engagement." },
  { type: "opportunity", title: "Peak booking time detected", description: "75% of appointments are booked between 10 AM - 2 PM. Consider adding more staff availability during this window." },
  { type: "positive", title: "Chatbot handling 85% of queries", description: "AI chatbot is auto-resolving most common questions, saving an estimated 40 hours of staff time per week." },
];

// ── Components ──

function MetricCard({ metric }: { metric: MetricCard }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">{metric.label}</p>
          <div className={`rounded-full p-1.5 bg-muted ${metric.color}`}>
            <metric.icon className="h-3.5 w-3.5" />
          </div>
        </div>
        <p className="text-2xl font-bold">{metric.value}</p>
        <div className="flex items-center gap-1 mt-1">
          {metric.trend === "up" ? (
            <TrendingUp className="h-3 w-3 text-green-600" />
          ) : (
            <TrendingDown className="h-3 w-3 text-red-600" />
          )}
          <span className={`text-xs font-medium ${metric.trend === "up" ? "text-green-600" : "text-red-600"}`}>
            {metric.change}
          </span>
          <span className="text-xs text-muted-foreground ml-1">vs last period</span>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Main Page ──

export default function ReportsPage() {
  const [dateRange, setDateRange] = useState<DateRange>("month");
  const [showExport, setShowExport] = useState(false);
  const [showScheduler, setShowScheduler] = useState(false);

  const dateRanges: { key: DateRange; label: string }[] = [
    { key: "today", label: "Today" },
    { key: "week", label: "This Week" },
    { key: "month", label: "This Month" },
    { key: "quarter", label: "This Quarter" },
    { key: "year", label: "This Year" },
    { key: "custom", label: "Custom" },
  ];

  const metrics: MetricCard[] = [
    { label: "Total Leads", value: "1,093", change: "+18.2%", trend: "up", icon: Users, color: "text-blue-600" },
    { label: "Appointments", value: "672", change: "+12.4%", trend: "up", icon: CalendarDays, color: "text-green-600" },
    { label: "Conversion Rate", value: "22.4%", change: "+3.1%", trend: "up", icon: Target, color: "text-purple-600" },
    { label: "Revenue", value: "$46,800", change: "+15.7%", trend: "up", icon: DollarSign, color: "text-emerald-600" },
    { label: "Avg Response Time", value: "4.2m", change: "-32%", trend: "up", icon: Clock, color: "text-amber-600" },
    { label: "Customer Satisfaction", value: "94.5%", change: "+1.2%", trend: "up", icon: Award, color: "text-cyan-600" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <BarChart3 className="h-8 w-8 text-primary" />
            Reports & Analytics
          </h1>
          <p className="text-muted-foreground">Track performance, analyze trends, and export data</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Button variant="outline" size="sm" onClick={() => setShowExport(!showExport)}>
              <Download className="h-3.5 w-3.5 mr-1" /> Export
            </Button>
            {showExport && (
              <div className="absolute right-0 top-10 z-20 w-48 bg-card border border-border rounded-xl shadow-lg p-1">
                {["Export as CSV", "Export as PDF", "Export as Excel"].map((opt) => (
                  <button key={opt} className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-muted transition-colors">
                    {opt}
                  </button>
                ))}
              </div>
            )}
          </div>
          <Button variant="outline" size="sm" onClick={() => setShowScheduler(!showScheduler)}>
            <Calendar className="h-3.5 w-3.5 mr-1" /> Schedule
          </Button>
          <Button size="sm">
            <RefreshCw className="h-3.5 w-3.5 mr-1" /> Refresh
          </Button>
        </div>
      </div>

      {/* Date Range Picker */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex gap-1 bg-muted rounded-lg p-0.5">
          {dateRanges.map((range) => (
            <button
              key={range.key}
              onClick={() => setDateRange(range.key)}
              className={`px-3 py-1.5 rounded-md text-xs transition-colors ${
                dateRange === range.key
                  ? "bg-background shadow-sm font-medium"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {range.label}
            </button>
          ))}
        </div>
        {dateRange === "custom" && (
          <div className="flex items-center gap-2">
            <input type="date" className="h-8 rounded-lg border border-input bg-background px-2 text-xs" />
            <span className="text-xs text-muted-foreground">to</span>
            <input type="date" className="h-8 rounded-lg border border-input bg-background px-2 text-xs" />
          </div>
        )}
        <Button variant="ghost" size="sm">
          <Filter className="h-3.5 w-3.5 mr-1" /> More Filters
        </Button>
      </div>

      {/* Metrics Grid */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
        {metrics.map((metric) => (
          <MetricCard key={metric.label} metric={metric} />
        ))}
      </div>

      {/* Charts Row 1 */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" /> Lead Growth
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={leadGrowthData} barSize={24}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
                <Bar dataKey="leads" name="Leads" fill="hsl(var(--primary))" radius={[4,4,0,0]} />
                <Bar dataKey="converted" name="Converted" fill="#10B981" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-primary" /> Appointments Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={appointmentsData}>
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
      </div>

      {/* Charts Row 2 */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <PieChart className="h-4 w-4 text-primary" /> Lead Sources
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
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

        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" /> Conversion Funnel
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {conversionFunnel.map((stage) => {
                const width = (stage.value / conversionFunnel[0].value) * 100;
                return (
                  <div key={stage.stage}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-medium">{stage.stage}</span>
                      <span className="text-muted-foreground">{stage.value}</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-3">
                      <div className="bg-primary h-3 rounded-full transition-all" style={{ width: `${width}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-primary" /> Revenue vs Expenses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <ReLine data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
                <Line type="monotone" dataKey="revenue" name="Revenue" stroke="#10B981" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="expenses" name="Expenses" stroke="#EF4444" strokeWidth={2} dot={{ r: 3 }} />
              </ReLine>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Channel Performance & AI Insights */}
      <div className="grid gap-4 md:grid-cols-5">
        {/* Channel Performance */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" /> Channel Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {channelPerformance.map((channel) => (
                <div key={channel.channel} className="flex items-center gap-3">
                  <div className={`rounded-full p-2 bg-muted ${
                    channel.channel === "SMS" ? "text-green-600" :
                    channel.channel === "Email" ? "text-blue-600" :
                    channel.channel === "Chatbot" ? "text-purple-600" : "text-amber-600"
                  }`}>
                    {channel.channel === "SMS" ? <Smartphone className="h-4 w-4" /> :
                     channel.channel === "Email" ? <Mail className="h-4 w-4" /> :
                     channel.channel === "Chatbot" ? <Bot className="h-4 w-4" /> :
                     <Phone className="h-4 w-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center">
                      <p className="text-sm font-medium">{channel.channel}</p>
                      <span className="text-xs font-medium text-green-600">{channel.conversion}% conv.</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-1.5 mt-1">
                      <div className="bg-primary h-1.5 rounded-full" style={{ width: `${(channel.conversion / 25) * 100}%` }} />
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{channel.sent.toLocaleString()} messages sent</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* AI Insights */}
        <Card className="md:col-span-3">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" /> AI Insights
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {aiInsights.map((insight, i) => (
              <div key={i} className={`p-3 rounded-lg border ${
                insight.type === "positive" ? "bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-900/30" :
                insight.type === "warning" ? "bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-900/30" :
                "bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-900/30"
              }`}>
                <div className="flex items-start gap-2">
                  <div className={`rounded-full p-1 mt-0.5 ${
                    insight.type === "positive" ? "bg-green-100 dark:bg-green-900/30" :
                    insight.type === "warning" ? "bg-amber-100 dark:bg-amber-900/30" :
                    "bg-blue-100 dark:bg-blue-900/30"
                  }`}>
                    <Sparkles className={`h-3 w-3 ${
                      insight.type === "positive" ? "text-green-600" :
                      insight.type === "warning" ? "text-amber-600" : "text-blue-600"
                    }`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">{insight.title}</p>
                      <Badge variant="outline" className={`text-[8px] ${
                        insight.type === "positive" ? "text-green-600 border-green-200" :
                        insight.type === "warning" ? "text-amber-600 border-amber-200" : "text-blue-600 border-blue-200"
                      }`}>
                        {insight.type}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{insight.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Scheduled Reports */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center justify-between">
            <span className="flex items-center gap-2"><Calendar className="h-4 w-4 text-primary" /> Scheduled Reports</span>
            <Button variant="outline" size="sm">
              <Plus className="h-3.5 w-3.5 mr-1" /> New Schedule
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {scheduledReports.map((report, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                <div className="flex items-start gap-3">
                  <div className="rounded-full p-2 bg-primary/5">
                    <FileText className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{report.name}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {report.frequency}</span>
                      <span>{report.format}</span>
                      <span>To: {report.recipients}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground">Last: {report.lastSent}</span>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                    <Settings className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Export Modal */}
      {showScheduler && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center" onClick={() => setShowScheduler(false)}>
          <div className="bg-background rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Schedule Report</h3>
              <button onClick={() => setShowScheduler(false)} className="rounded-md p-1 hover:bg-muted">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Report Name</label>
                <input type="text" className="w-full mt-1 h-10 rounded-lg border border-input bg-background px-3 text-sm" placeholder="e.g., Weekly Summary" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Frequency</label>
                  <select className="w-full mt-1 h-10 rounded-lg border border-input bg-background px-3 text-sm">
                    <option>Daily</option>
                    <option>Weekly</option>
                    <option>Monthly</option>
                    <option>Quarterly</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium">Format</label>
                  <select className="w-full mt-1 h-10 rounded-lg border border-input bg-background px-3 text-sm">
                    <option>PDF</option>
                    <option>CSV</option>
                    <option>PDF + CSV</option>
                    <option>Email Only</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Recipients</label>
                <input type="text" className="w-full mt-1 h-10 rounded-lg border border-input bg-background px-3 text-sm" placeholder="email1@example.com, email2@..." />
              </div>
              <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                <input type="checkbox" className="accent-primary" defaultChecked />
                <span className="text-sm">Include charts and visualizations</span>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={() => setShowScheduler(false)}>Cancel</Button>
                <Button size="sm">Create Schedule</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Missing import for Phone icon
import { Phone } from "lucide-react";
