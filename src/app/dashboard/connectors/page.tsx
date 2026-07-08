"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Puzzle, Calendar, Globe, Smartphone, Mail, CreditCard,
  Zap, Webhook, Key, RefreshCw, Check, X, ChevronRight,
  ExternalLink,
} from "lucide-react";

const connectors = [
  { id: "google-calendar", name: "Google Calendar", desc: "Sync appointments and availability", icon: Calendar, category: "Productivity", connected: true, lastSync: "2 min ago", color: "text-blue-500" },
  { id: "google-auth", name: "Google Auth", desc: "Sign-in with Google for staff", icon: Globe, category: "Auth", connected: true, lastSync: "1 hour ago", color: "text-blue-500" },
  { id: "microsoft-auth", name: "Microsoft Auth", desc: "Sign-in with Microsoft", icon: Globe, category: "Auth", connected: false, lastSync: null, color: "text-blue-600" },
  { id: "twilio", name: "Twilio SMS", desc: "Send and receive SMS messages", icon: Smartphone, category: "Communications", connected: true, lastSync: "5 min ago", color: "text-red-500" },
  { id: "smtp", name: "SMTP / Email", desc: "Custom email sending provider", icon: Mail, category: "Communications", connected: false, lastSync: null, color: "text-amber-500" },
  { id: "stripe", name: "Stripe", desc: "Payment processing and subscriptions", icon: CreditCard, category: "Payments", connected: true, lastSync: "1 min ago", color: "text-purple-500" },
  { id: "zapier", name: "Zapier", desc: "Connect to 5,000+ apps", icon: Zap, category: "Automation", connected: false, lastSync: null, color: "text-orange-500" },
  { id: "make", name: "Make (Integromat)", desc: "Advanced automation scenarios", icon: Zap, category: "Automation", connected: false, lastSync: null, color: "text-green-500" },
  { id: "webhooks", name: "Webhooks", desc: "Custom webhook endpoints", icon: Webhook, category: "Developer", connected: false, lastSync: null, color: "text-cyan-500" },
];

const categories = ["All", "Productivity", "Auth", "Communications", "Payments", "Automation", "Developer"];

export default function ConnectorsPage() {
  const [category, setCategory] = useState("All");
  const filtered = connectors.filter(c => category === "All" || c.category === category);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Puzzle className="h-8 w-8 text-primary" />
            Connectors
          </h1>
          <p className="text-muted-foreground">Connect your business tools and services</p>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {categories.map(cat => (
          <button key={cat} onClick={() => setCategory(cat)}
            className={`px-3 py-1.5 rounded-lg text-xs transition-colors ${category === cat ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>
            {cat}
          </button>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map((conn) => {
          const Icon = conn.icon;
          return (
            <Card key={conn.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className={`rounded-xl p-3 bg-muted ${conn.color}`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <Badge variant={conn.connected ? "success" : "secondary"} className="text-[10px]">
                    {conn.connected ? "Connected" : "Disconnected"}
                  </Badge>
                </div>
                <h3 className="font-semibold mb-1">{conn.name}</h3>
                <p className="text-xs text-muted-foreground mb-3">{conn.desc}</p>
                <div className="flex items-center justify-between">
                  {conn.connected ? (
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <RefreshCw className="h-3 w-3" /> Synced {conn.lastSync}
                    </span>
                  ) : (
                    <span />
                  )}
                  <Button size="sm" variant={conn.connected ? "outline" : "primary"}>
                    {conn.connected ? "Configure" : "Connect"}
                    <ChevronRight className="h-3.5 w-3.5 ml-1" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* API Keys */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Key className="h-4 w-4 text-primary" /> API Keys
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
            <div>
              <p className="text-sm font-medium">Production API Key</p>
              <p className="text-xs font-mono text-muted-foreground">sk_prod_••••••••••••••••</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">Copy</Button>
              <Button variant="outline" size="sm">Regenerate</Button>
            </div>
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
            <div>
              <p className="text-sm font-medium">Test API Key</p>
              <p className="text-xs font-mono text-muted-foreground">sk_test_••••••••••••••••</p>
            </div>
            <Button variant="outline" size="sm">Copy</Button>
          </div>
          <Button variant="outline" size="sm"><Plus className="h-3.5 w-3.5 mr-1" /> Generate New Key</Button>
        </CardContent>
      </Card>
    </div>
  );
}

import { Plus } from "lucide-react";