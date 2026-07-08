"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Building2, Users, Calendar, MessageSquare, DollarSign, Activity,
  TrendingUp, TrendingDown, Plus, MoreHorizontal, Search, Filter,
  ArrowUpDown, Download, Eye, Pencil, Trash2, ToggleLeft,
  BarChart3 as BarChartIcon, PieChart as PieChartIcon,
} from "lucide-react";
import { useState, useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Area, AreaChart, PieChart, Pie, Cell, Legend,
} from "recharts";

// ── Mock Data ──
const statCards = [
  { label: "Total Businesses", value: "128", change: "+12", trend: "up", icon: Building2 },
  { label: "Active", value: "96", change: "+8", trend: "up", icon: Activity },
  { label: "Inactive", value: "32", change: "-2", trend: "down", icon: Building2 },
  { label: "New This Month", value: "14", change: "+40%", trend: "up", icon: TrendingUp },
  { label: "Total Customers", value: "8,432", change: "+18%", trend: "up", icon: Users },
  { label: "Leads", value: "1,247", change: "+22%", trend: "up", icon: Users },
  { label: "Appointments", value: "583", change: "+15%", trend: "up", icon: Calendar },
  { label: "AI Conversations", value: "12,847", change: "+34%", trend: "up", icon: MessageSquare },
  { label: "MRR", value: "$48,240", change: "+$4,320", trend: "up", icon: DollarSign },
  { label: "Total Revenue", value: "$284,560", change: "+$32K", trend: "up", icon: DollarSign },
];

const growthData = [
  { month: "Jan", businesses: 72, customers: 4200 },
  { month: "Feb", businesses: 78, customers: 5100 },
  { month: "Mar", businesses: 85, customers: 5900 },
  { month: "Apr", businesses: 94, customers: 6700 },
  { month: "May", businesses: 108, customers: 7600 },
  { month: "Jun", businesses: 128, customers: 8432 },
];

const revenueData = [
  { month: "Jan", revenue: 32000, mrr: 28000 },
  { month: "Feb", revenue: 35000, mrr: 31000 },
  { month: "Mar", revenue: 38000, mrr: 34000 },
  { month: "Apr", revenue: 42000, mrr: 38000 },
  { month: "May", revenue: 45000, mrr: 42000 },
  { month: "Jun", revenue: 48240, mrr: 48240 },
];

const leadVolumeData = [
  { week: "W1", leads: 180, converted: 45 },
  { week: "W2", leads: 210, converted: 52 },
  { week: "W3", leads: 195, converted: 48 },
  { week: "W4", leads: 245, converted: 61 },
  { week: "W5", leads: 220, converted: 55 },
];

const usageData = [
  { name: "AI Calls", value: 12847 },
  { name: "SMS Sent", value: 3420 },
  { name: "Emails", value: 5680 },
  { name: "Storage GB", value: 248 },
];

const PIE_COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444"];

const businesses = [
  { name: "Premier Plumbing Co.", slug: "premier-plumbing", tier: "Professional", status: "active", users: 5, revenue: "$299/mo" },
  { name: "Elite Roofing Solutions", slug: "elite-roofing", tier: "Enterprise", status: "active", users: 12, revenue: "$999/mo" },
  { name: "Bright Smile Dental", slug: "bright-smile", tier: "Starter", status: "active", users: 3, revenue: "$99/mo" },
  { name: "GreenLeaf Landscaping", slug: "greenleaf", tier: "Professional", status: "suspended", users: 2, revenue: "$299/mo" },
  { name: "QuickFix HVAC", slug: "quickfix-hvac", tier: "Professional", status: "active", users: 4, revenue: "$299/mo" },
  { name: "Total Care Dental", slug: "total-care-dental", tier: "Enterprise", status: "active", users: 8, revenue: "$999/mo" },
  { name: "Summit Roofing", slug: "summit-roofing", tier: "Starter", status: "active", users: 2, revenue: "$99/mo" },
  { name: "ClearView Windows", slug: "clearview-windows", tier: "Professional", status: "inactive", users: 1, revenue: "$299/mo" },
];

const subscriptions = [
  { business: "Premier Plumbing Co.", tier: "Professional", status: "active", amount: 299, nextBilling: "2026-08-08" },
  { business: "Elite Roofing Solutions", tier: "Enterprise", status: "active", amount: 999, nextBilling: "2026-08-07" },
  { business: "Bright Smile Dental", tier: "Starter", status: "active", amount: 99, nextBilling: "2026-08-06" },
  { business: "GreenLeaf Landscaping", tier: "Professional", status: "past_due", amount: 299, nextBilling: "2026-08-05" },
  { business: "QuickFix HVAC", tier: "Professional", status: "active", amount: 299, nextBilling: "2026-08-04" },
];

const auditLogs = [
  { action: "Business Created", entity: "premier-plumbing", user: "super-admin@aibos.com", timestamp: "2026-07-08 14:30", type: "create" },
  { action: "Subscription Upgraded", entity: "elite-roofing", user: "super-admin@aibos.com", timestamp: "2026-07-08 12:15", type: "update" },
  { action: "Business Suspended", entity: "greenleaf", user: "super-admin@aibos.com", timestamp: "2026-07-07 09:45", type: "delete" },
  { action: "Payment Failed", entity: "clearview-windows", user: "system", timestamp: "2026-07-05 10:00", type: "error" },
];

export default function AdminDashboardPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const filteredBiz = businesses.filter(b => b.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Admin Overview</h1>
          <p className="text-muted-foreground">Platform-wide analytics and management</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Business
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
        {statCards.map((stat) => (
          <Card key={stat.label} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{stat.label}</p>
                <stat.icon className="h-4 w-4 text-muted-foreground" />
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

      {/* Charts Row 1 */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BarChartIcon className="h-4 w-4 text-primary" />
              Business & Customer Growth
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={growthData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} className="text-muted-foreground" />
                <YAxis tick={{ fontSize: 12 }} className="text-muted-foreground" />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }}
                />
                <Bar dataKey="businesses" name="Businesses" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="customers" name="Customers" fill="hsl(var(--primary) / 0.3)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BarChartIcon className="h-4 w-4 text-primary" />
              Revenue & MRR Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
                <Area type="monotone" dataKey="revenue" name="Revenue" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.15)" strokeWidth={2} />
                <Area type="monotone" dataKey="mrr" name="MRR" stroke="#10B981" fill="rgba(16,185,129,0.1)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BarChartIcon className="h-4 w-4 text-primary" />
              Weekly Lead Volume
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={leadVolumeData} barSize={24}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                <XAxis dataKey="week" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
                <Bar dataKey="leads" name="Leads" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="converted" name="Converted" fill="#10B981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <PieChartIcon className="h-4 w-4 text-primary" />
              Platform Usage Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={usageData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2} dataKey="value">
                  {usageData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
                <Legend wrapperStyle={{ fontSize: "11px" }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Quick Metrics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Platform Uptime</span>
                <span className="font-medium text-green-600">99.97%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div className="bg-green-500 h-2 rounded-full" style={{ width: "99.97%" }} />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">API Usage</span>
                <span className="font-medium">68%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div className="bg-primary h-2 rounded-full" style={{ width: "68%" }} />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Storage Used</span>
                <span className="font-medium">248 GB / 500 GB</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div className="bg-yellow-500 h-2 rounded-full" style={{ width: "49.6%" }} />
              </div>
            </div>
            <div className="pt-3 space-y-2 border-t">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Avg Response Time</span>
                <span className="font-medium">234ms</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Active API Keys</span>
                <span className="font-medium">86</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Support Tickets</span>
                <span className="font-medium">12 open</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Business Management */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Business Management</CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-9 w-56 rounded-md border border-input bg-background pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <Button variant="outline" size="sm"><Filter className="h-4 w-4" /></Button>
              <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Create</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-3 font-medium text-muted-foreground">Business</th>
                  <th className="text-left py-3 px-3 font-medium text-muted-foreground">Tier</th>
                  <th className="text-left py-3 px-3 font-medium text-muted-foreground">Status</th>
                  <th className="text-left py-3 px-3 font-medium text-muted-foreground">Users</th>
                  <th className="text-left py-3 px-3 font-medium text-muted-foreground">Revenue</th>
                  <th className="text-right py-3 px-3 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredBiz.map((biz) => (
                  <tr key={biz.slug} className="border-b border-border hover:bg-muted/50 transition-colors group">
                    <td className="py-3 px-3">
                      <p className="font-medium">{biz.name}</p>
                      <p className="text-xs text-muted-foreground">{biz.slug}</p>
                    </td>
                    <td className="py-3 px-3">
                      <Badge variant={biz.tier === "Enterprise" ? "default" : biz.tier === "Professional" ? "secondary" : "outline"}>
                        {biz.tier}
                      </Badge>
                    </td>
                    <td className="py-3 px-3">
                      <Badge variant={biz.status === "active" ? "success" : biz.status === "suspended" ? "destructive" : "warning"}>
                        {biz.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-3">{biz.users}</td>
                    <td className="py-3 px-3 font-mono text-sm">{biz.revenue}</td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="sm"><Eye className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="sm"><Pencil className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="sm" className="text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Subscriptions + Audit Logs */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Active Subscriptions</CardTitle>
          </CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-2 font-medium text-muted-foreground">Business</th>
                  <th className="text-left py-2 px-2 font-medium text-muted-foreground">Tier</th>
                  <th className="text-left py-2 px-2 font-medium text-muted-foreground">Status</th>
                  <th className="text-right py-2 px-2 font-medium text-muted-foreground">Amount</th>
                </tr>
              </thead>
              <tbody>
                {subscriptions.map((sub) => (
                  <tr key={sub.business} className="border-b border-border hover:bg-muted/50">
                    <td className="py-2 px-2 font-medium">{sub.business}</td>
                    <td className="py-2 px-2"><Badge variant={sub.tier === "Enterprise" ? "default" : sub.tier === "Professional" ? "secondary" : "outline"}>{sub.tier}</Badge></td>
                    <td className="py-2 px-2"><Badge variant={sub.status === "active" ? "success" : "warning"}>{sub.status}</Badge></td>
                    <td className="py-2 px-2 text-right font-mono">${sub.amount}/mo</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Recent Audit Logs</CardTitle>
              <Button variant="ghost" size="sm" className="text-xs">View All</Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {auditLogs.map((log, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div>
                    <p className="text-sm font-medium">{log.action}</p>
                    <p className="text-xs text-muted-foreground">{log.entity} • {log.user}</p>
                  </div>
                  <div className="text-right">
                    <Badge variant={log.type === "create" ? "success" : log.type === "update" ? "warning" : log.type === "error" ? "destructive" : "secondary"}>
                      {log.type}
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-1">{log.timestamp}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}