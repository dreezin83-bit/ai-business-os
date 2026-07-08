"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Settings, UserCircle, Shield, CreditCard, Key,
  Bell, Download, Trash2, Plus, Copy, Check,
  ChevronRight, Users, Globe, Palette, Image,
  Mail, Smartphone, MoreHorizontal, Ban, RefreshCw,
  ExternalLink, FileText, AlertTriangle,
} from "lucide-react";

// ── Types ──

type SettingsTab = "general" | "team" | "billing" | "api" | "data" | "notifications";

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  status: "active" | "invited" | "disabled";
  avatar: string;
  lastActive: string;
  permissions: string[];
}

interface ApiKey {
  id: string;
  name: string;
  key: string;
  created: string;
  lastUsed: string;
  status: "active" | "expired" | "revoked";
}

// ── Mock Data ──

const teamMembers: TeamMember[] = [
  { id: "1", name: "You (Admin)", email: "admin@mybusiness.com", role: "Admin", status: "active", avatar: "AD", lastActive: "Just now", permissions: ["All"] },
  { id: "2", name: "Sarah Johnson", email: "sarah@mybusiness.com", role: "Manager", status: "active", avatar: "SJ", lastActive: "2h ago", permissions: ["Leads", "Appointments", "Reports"] },
  { id: "3", name: "Mike Reynolds", email: "mike@mybusiness.com", role: "Staff", status: "active", avatar: "MR", lastActive: "1h ago", permissions: ["Appointments", "Chat"] },
  { id: "4", name: "Lisa Thompson", email: "lisa@mybusiness.com", role: "Staff", status: "active", avatar: "LT", lastActive: "3h ago", permissions: ["Appointments", "Customers"] },
  { id: "5", name: "Tom Kennedy", email: "tom@mybusiness.com", role: "Staff", status: "invited", avatar: "TK", lastActive: "Never", permissions: ["Appointments"] },
];

const apiKeys: ApiKey[] = [
  { id: "1", name: "Production API Key", key: "aib_sk_prod_••••••••••••••••", created: "2024-01-15", lastUsed: "2 min ago", status: "active" },
  { id: "2", name: "Development Key", key: "aib_sk_dev_••••••••••••••••••", created: "2024-03-20", lastUsed: "1h ago", status: "active" },
  { id: "3", name: "Webhook Integration", key: "aib_sk_wh_•••••••••••••••••", created: "2024-04-10", lastUsed: "3d ago", status: "active" },
  { id: "4", name: "Legacy Integration", key: "aib_sk_leg_•••••••••••••••", created: "2023-11-01", lastUsed: "3mo ago", status: "expired" },
];

const notificationPreferences = [
  { category: "New Lead", email: true, sms: true, push: true },
  { category: "Appointment Reminder", email: true, sms: true, push: false },
  { category: "Campaign Results", email: true, sms: false, push: false },
  { category: "Team Activity", email: true, sms: false, push: true },
  { category: "System Alerts", email: true, sms: true, push: true },
  { category: "Billing & Subscriptions", email: true, sms: false, push: false },
  { category: "Weekly Summary", email: true, sms: false, push: false },
];

// ── Components ──

function ToggleSwitch({ enabled }: { enabled: boolean }) {
  return (
    <div className={`w-10 h-5 rounded-full ${enabled ? "bg-primary" : "bg-muted"} relative transition-colors cursor-pointer`}>
      <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 shadow transition-all ${enabled ? "left-5" : "left-0.5"}`} />
    </div>
  );
}

// ── Main Page ──

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>("general");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const tabs: { key: SettingsTab; label: string; icon: React.ElementType }[] = [
    { key: "general", label: "General", icon: Settings },
    { key: "team", label: "Team", icon: Users },
    { key: "billing", label: "Billing", icon: CreditCard },
    { key: "api", label: "API Keys", icon: Key },
    { key: "data", label: "Data", icon: FileText },
    { key: "notifications", label: "Notifications", icon: Bell },
  ];

  const copyToClipboard = (key: string, id: string) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <Settings className="h-8 w-8 text-primary" />
          Settings
        </h1>
        <p className="text-muted-foreground">Manage your business settings, team, and preferences</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        {/* Sidebar Tabs */}
        <div className="lg:col-span-1">
          <Card>
            <CardContent className="p-2 space-y-1">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                    activeTab === tab.key
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <tab.icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                </button>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Content Area */}
        <div className="lg:col-span-3 space-y-6">
          {/* ── General ── */}
          {activeTab === "general" && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Globe className="h-4 w-4 text-primary" /> Business Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Business Name</label>
                      <input type="text" defaultValue="Smith's HVAC Services" className="w-full mt-1 h-10 rounded-lg border border-input bg-background px-3 text-sm" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Business Type</label>
                      <select className="w-full mt-1 h-10 rounded-lg border border-input bg-background px-3 text-sm">
                        <option>HVAC</option>
                        <option>Plumbing</option>
                        <option>Roofing</option>
                        <option>Electrical</option>
                        <option>Cleaning</option>
                        <option>Other</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Email Address</label>
                    <input type="email" defaultValue="contact@smithshvac.com" className="w-full mt-1 h-10 rounded-lg border border-input bg-background px-3 text-sm" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Phone Number</label>
                    <input type="tel" defaultValue="(555) 123-4567" className="w-full mt-1 h-10 rounded-lg border border-input bg-background px-3 text-sm" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Address</label>
                    <input type="text" defaultValue="123 Main Street, Suite 100" className="w-full mt-1 h-10 rounded-lg border border-input bg-background px-3 text-sm" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">City</label>
                      <input type="text" defaultValue="Phoenix" className="w-full mt-1 h-10 rounded-lg border border-input bg-background px-3 text-sm" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Timezone</label>
                      <select className="w-full mt-1 h-10 rounded-lg border border-input bg-background px-3 text-sm">
                        <option>America/Phoenix (MST, UTC-7)</option>
                        <option>America/New_York (EST, UTC-5)</option>
                        <option>America/Chicago (CST, UTC-6)</option>
                        <option>America/Los_Angeles (PST, UTC-8)</option>
                      </select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Palette className="h-4 w-4 text-primary" /> Branding
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-6">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Business Logo</label>
                      <div className="mt-1 h-20 w-20 rounded-xl border-2 border-dashed border-border bg-muted flex items-center justify-center cursor-pointer hover:border-primary transition-colors">
                        <Image className="h-6 w-6 text-muted-foreground" />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Brand Color</label>
                      <div className="flex items-center gap-2 mt-1">
                        <input type="color" defaultValue="#3B82F6" className="h-9 w-9 rounded-lg border border-input cursor-pointer" />
                        <input type="text" defaultValue="#3B82F6" className="h-9 w-28 rounded-lg border border-input bg-background px-3 text-sm font-mono" />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Accent Color</label>
                      <div className="flex items-center gap-2 mt-1">
                        <input type="color" defaultValue="#10B981" className="h-9 w-9 rounded-lg border border-input cursor-pointer" />
                        <input type="text" defaultValue="#10B981" className="h-9 w-28 rounded-lg border border-input bg-background px-3 text-sm font-mono" />
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Business Hours</label>
                    <div className="grid grid-cols-2 gap-2 mt-1">
                      {["Mon - Fri", "Saturday", "Sunday"].map((day) => (
                        <div key={day} className="flex items-center gap-2 p-2 rounded-lg bg-muted/30">
                          <span className="text-xs w-20">{day}</span>
                          <select className="h-8 rounded-md border border-input bg-background px-2 text-xs flex-1">
                            <option>9:00 AM</option>
                            <option>8:00 AM</option>
                            <option>7:00 AM</option>
                            <option>Closed</option>
                          </select>
                          <span className="text-xs text-muted-foreground">to</span>
                          <select className="h-8 rounded-md border border-input bg-background px-2 text-xs flex-1">
                            <option>5:00 PM</option>
                            <option>6:00 PM</option>
                            <option>7:00 PM</option>
                            <option>Closed</option>
                          </select>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-end">
                <Button size="sm">Save Changes</Button>
              </div>
            </>
          )}

          {/* ── Team ── */}
          {activeTab === "team" && (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{teamMembers.length} team members</p>
                </div>
                <Button size="sm">
                  <Plus className="h-3.5 w-3.5 mr-1" /> Invite Member
                </Button>
              </div>

              <Card>
                <CardContent className="p-0">
                  <div className="divide-y divide-border">
                    {teamMembers.map((member) => (
                      <div key={member.id} className="flex items-center gap-4 p-4 hover:bg-muted/30 transition-colors">
                        <div className={`h-10 w-10 rounded-full ${
                          member.role === "Admin" ? "bg-primary/10 text-primary" :
                          member.role === "Manager" ? "bg-purple-100 dark:bg-purple-900/30 text-purple-600" :
                          "bg-muted text-foreground"
                        } flex items-center justify-center text-sm font-semibold`}>
                          {member.avatar}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium">{member.name}</p>
                            <Badge variant={
                              member.status === "active" ? "success" :
                              member.status === "invited" ? "warning" : "secondary"
                            } className="text-[8px] px-1.5">
                              {member.status}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">{member.email}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-[9px]">{member.role}</Badge>
                            <span className="text-[10px] text-muted-foreground">
                              {member.lastActive !== "Never" ? `Active ${member.lastActive}` : "Not yet active"}
                            </span>
                          </div>
                        </div>
                        <div className="hidden sm:flex flex-wrap gap-1 max-w-[200px]">
                          {member.permissions.map((perm) => (
                            <span key={perm} className="text-[9px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                              {perm}
                            </span>
                          ))}
                        </div>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Shield className="h-4 w-4 text-primary" /> Roles & Permissions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {[
                      { role: "Admin", description: "Full access to all features and settings", count: 1 },
                      { role: "Manager", description: "Access to leads, appointments, reports, team management", count: 1 },
                      { role: "Staff", description: "Access to appointments, customer chat, and assigned tasks", count: 3 },
                      { role: "Viewer", description: "Read-only access to reports and dashboard", count: 0 },
                    ].map((r) => (
                      <div key={r.role} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                        <div>
                          <p className="text-sm font-medium">{r.role}</p>
                          <p className="text-xs text-muted-foreground">{r.description}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">{r.count} member{r.count !== 1 ? "s" : ""}</span>
                          <Button variant="ghost" size="sm">
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {/* ── Billing ── */}
          {activeTab === "billing" && (
            <>
              {/* Current Plan */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-primary" /> Subscription Plan
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-primary/5 rounded-xl p-6">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-xl font-bold">Professional Plan</h3>
                          <Badge className="text-[10px]">Active</Badge>
                        </div>
                        <p className="text-3xl font-bold mt-2">$79<span className="text-sm font-normal text-muted-foreground">/month</span></p>
                        <p className="text-sm text-muted-foreground mt-1">Billed monthly • Next payment: July 15, 2024</p>
                      </div>
                      <Button variant="outline" size="sm">Change Plan</Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                    {[
                      { label: "Team Members", value: "5 / 10 used" },
                      { label: "SMS Credits", value: "2,450 / 5,000" },
                      { label: "Email Credits", value: "12,800 / 25,000" },
                      { label: "AI Calls", value: "8,200 / 15,000" },
                    ].map((item) => (
                      <div key={item.label} className="p-3 rounded-lg bg-muted/30">
                        <p className="text-xs text-muted-foreground">{item.label}</p>
                        <p className="text-sm font-medium mt-1">{item.value}</p>
                        <div className="w-full bg-muted rounded-full h-1.5 mt-2">
                          <div className="bg-primary h-1.5 rounded-full" style={{ width: "50%" }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Payment Method */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Payment Method</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between p-4 rounded-lg border border-border">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-14 rounded-lg bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center">
                        <span className="text-white text-xs font-bold">VISA</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Visa ending in 4242</p>
                        <p className="text-xs text-muted-foreground">Expires 12/2026</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="success" className="text-[9px]">Default</Badge>
                      <Button variant="ghost" size="sm">Edit</Button>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="mt-3">
                    <Plus className="h-3.5 w-3.5 mr-1" /> Add Payment Method
                  </Button>
                </CardContent>
              </Card>

              {/* Billing History */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center justify-between">
                    <span>Billing History</span>
                    <Button variant="ghost" size="sm">
                      <Download className="h-3.5 w-3.5 mr-1" /> Download All
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {[
                      { date: "Jun 15, 2024", amount: "$79.00", status: "paid", invoice: "INV-2024-0615" },
                      { date: "May 15, 2024", amount: "$79.00", status: "paid", invoice: "INV-2024-0515" },
                      { date: "Apr 15, 2024", amount: "$79.00", status: "paid", invoice: "INV-2024-0415" },
                      { date: "Mar 15, 2024", amount: "$49.00", status: "paid", invoice: "INV-2024-0315" },
                    ].map((inv) => (
                      <div key={inv.invoice} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                        <div className="flex items-center gap-3">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium">{inv.date}</p>
                            <p className="text-xs text-muted-foreground">{inv.invoice}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-medium">{inv.amount}</span>
                          <Badge variant="success" className="text-[9px] capitalize">{inv.status}</Badge>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                            <Download className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {/* ── API Keys ── */}
          {activeTab === "api" && (
            <>
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Manage your API keys for integrations</p>
                <Button size="sm">
                  <Plus className="h-3.5 w-3.5 mr-1" /> Create API Key
                </Button>
              </div>

              <Card>
                <CardContent className="space-y-3 p-4">
                  {apiKeys.map((apiKey) => (
                    <div key={apiKey.id} className="flex items-center justify-between p-4 rounded-lg border border-border hover:shadow-sm transition-shadow">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium">{apiKey.name}</p>
                          <Badge variant={
                            apiKey.status === "active" ? "success" :
                            apiKey.status === "expired" ? "warning" : "destructive"
                          } className="text-[8px] capitalize">{apiKey.status}</Badge>
                        </div>
                        <p className="text-xs font-mono text-muted-foreground mt-1">{apiKey.key}</p>
                        <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
                          <span>Created: {apiKey.created}</span>
                          <span>Last used: {apiKey.lastUsed}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 ml-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => copyToClipboard(apiKey.key, apiKey.id)}
                        >
                          {copiedKey === apiKey.id ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                          <RefreshCw className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive">
                          <Ban className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <ExternalLink className="h-4 w-4 text-primary" /> API Documentation
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">Access our comprehensive API documentation to integrate AI Business OS with your existing tools.</p>
                  <Button variant="outline" size="sm" className="mt-3">
                    <ExternalLink className="h-3.5 w-3.5 mr-1" /> View API Docs
                  </Button>
                </CardContent>
              </Card>
            </>
          )}

          {/* ── Data ── */}
          {activeTab === "data" && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Download className="h-4 w-4 text-primary" /> Export Data
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">Export your business data for backup or migration.</p>
                  <div className="space-y-2">
                    {[
                      { label: "All Data (Full Export)", desc: "Complete export of all your business data", format: "ZIP (JSON + CSV)" },
                      { label: "Leads & Customers", desc: "Customer profiles, lead sources, and history", format: "CSV" },
                      { label: "Appointments", desc: "All appointment records and history", format: "CSV" },
                      { label: "Campaigns & Communications", desc: "SMS and email campaign data", format: "CSV" },
                    ].map((item) => (
                      <div key={item.label} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                        <div>
                          <p className="text-sm font-medium">{item.label}</p>
                          <p className="text-xs text-muted-foreground">{item.desc}</p>
                          <span className="text-[10px] text-muted-foreground">{item.format}</span>
                        </div>
                        <Button variant="outline" size="sm">
                          <Download className="h-3.5 w-3.5 mr-1" /> Export
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-destructive/20">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2 text-destructive">
                    <AlertTriangle className="h-4 w-4" /> Delete Data
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Permanently delete all your business data and cancel your subscription. This action cannot be undone.
                  </p>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-destructive/5 border border-destructive/10">
                    <input type="checkbox" className="accent-destructive" />
                    <span className="text-sm">I understand this action is irreversible and all data will be permanently deleted.</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Type 'DELETE' to confirm"
                      className="h-10 w-48 rounded-lg border border-input bg-background px-3 text-sm"
                    />
                    <Button variant="destructive" size="sm" disabled>
                      <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete My Business
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {/* ── Notifications ── */}
          {activeTab === "notifications" && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Bell className="h-4 w-4 text-primary" /> Notification Preferences
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-3 font-medium text-muted-foreground">Category</th>
                        <th className="text-center py-3 font-medium text-muted-foreground">
                          <Mail className="h-4 w-4 inline mr-1" />Email
                        </th>
                        <th className="text-center py-3 font-medium text-muted-foreground">
                          <Smartphone className="h-4 w-4 inline mr-1" />SMS
                        </th>
                        <th className="text-center py-3 font-medium text-muted-foreground">
                          <Bell className="h-4 w-4 inline mr-1" />Push
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {notificationPreferences.map((pref) => (
                        <tr key={pref.category} className="border-b border-border hover:bg-muted/30">
                          <td className="py-3 font-medium">{pref.category}</td>
                          <td className="py-3 text-center">
                            <div className="flex justify-center cursor-pointer">
                              <ToggleSwitch enabled={pref.email} />
                            </div>
                          </td>
                          <td className="py-3 text-center">
                            <div className="flex justify-center cursor-pointer">
                              <ToggleSwitch enabled={pref.sms} />
                            </div>
                          </td>
                          <td className="py-3 text-center">
                            <div className="flex justify-center cursor-pointer">
                              <ToggleSwitch enabled={pref.push} />
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Quiet Hours */}
                <div className="mt-6 pt-6 border-t border-border">
                  <h4 className="text-sm font-medium mb-3">Quiet Hours</h4>
                  <div className="grid grid-cols-2 gap-4 max-w-md">
                    <div>
                      <label className="text-xs text-muted-foreground">Start Time</label>
                      <select className="w-full mt-1 h-10 rounded-lg border border-input bg-background px-3 text-sm">
                        <option>9:00 PM</option>
                        <option>10:00 PM</option>
                        <option>11:00 PM</option>
                        <option>12:00 AM</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">End Time</label>
                      <select className="w-full mt-1 h-10 rounded-lg border border-input bg-background px-3 text-sm">
                        <option>6:00 AM</option>
                        <option>7:00 AM</option>
                        <option>8:00 AM</option>
                        <option>9:00 AM</option>
                      </select>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">No SMS notifications will be sent during quiet hours.</p>
                </div>

                <div className="mt-6 flex justify-end">
                  <Button size="sm">Save Preferences</Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
