"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft, Phone, Mail, MapPin, Calendar, MessageSquare,
  Bot, Clock, Star, FileText, Edit3, Activity, Check,
} from "lucide-react";
import Link from "next/link";

const customer = {
  name: "John Smith",
  email: "john.smith@email.com",
  phone: "(555) 123-4567",
  address: "123 Main St, Anytown, USA",
  avatar: "JS",
  status: "active",
  source: "Website Chat",
  totalSpent: "$4,600",
  since: "Jan 2026",
  aiSummary: "John is a repeat customer who values quick service and clear communication. He typically schedules appointments via the website chatbot. Prefers SMS reminders. Has referred 2 other customers.",
};

const conversations = [
  { date: "2026-07-08", channel: "Web Chat", summary: "Asked about AC repair pricing", agent: "AI" },
  { date: "2026-07-05", channel: "SMS", summary: "Confirmed appointment for HVAC maintenance", agent: "AI" },
  { date: "2026-06-28", channel: "Phone", summary: "Called about emergency plumbing issue", agent: "Staff (Mike)" },
  { date: "2026-06-20", channel: "Web Chat", summary: "Requested quote for roof inspection", agent: "AI" },
];

const appointments = [
  { date: "2026-07-10", service: "AC Repair", status: "confirmed" },
  { date: "2026-07-05", service: "HVAC Maintenance", status: "completed" },
  { date: "2026-06-28", service: "Emergency Plumbing", status: "completed" },
  { date: "2026-06-15", service: "Roof Inspection", status: "completed" },
];

const activityTimeline = [
  { action: "Visited website - Services page", time: "2 hours ago", type: "web" },
  { action: "AI chatbot conversation started", time: "2 hours ago", type: "ai" },
  { action: "Appointment confirmed - AC Repair", time: "1 day ago", type: "appointment" },
  { action: "SMS reminder sent for appointment", time: "2 days ago", type: "sms" },
  { action: "Left 5-star review ⭐", time: "1 week ago", type: "review" },
  { action: "Referred a friend (Sarah Johnson)", time: "2 weeks ago", type: "referral" },
  { action: "HVAC maintenance completed", time: "3 days ago", type: "service" },
];

export default function CustomerProfilePage() {
  const [activeTab, setActiveTab] = useState<"overview" | "activity">("overview");

  return (
    <div className="space-y-6">
      {/* Back button */}
      <Link href="/dashboard/crm" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to CRM
      </Link>

      {/* Customer Header */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-2xl font-bold text-primary">
                {customer.avatar}
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-bold">{customer.name}</h1>
                  <Badge variant="success" className="text-xs">Active</Badge>
                  <Badge variant="secondary" className="text-xs">⭐ {customer.totalSpent} lifetime</Badge>
                </div>
                <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1"><Mail className="h-3.5 w-3.5" /> {customer.email}</span>
                  <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" /> {customer.phone}</span>
                  <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {customer.address}</span>
                </div>
                <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                  <span>Source: {customer.source}</span>
                  <span>Customer since: {customer.since}</span>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm"><Phone className="h-3.5 w-3.5 mr-1" /> Call</Button>
              <Button size="sm"><MessageSquare className="h-3.5 w-3.5 mr-1" /> Message</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AI Summary */}
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="rounded-full p-2 bg-primary/10">
              <Bot className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium mb-1">AI Customer Summary</p>
              <p className="text-sm text-muted-foreground leading-relaxed">{customer.aiSummary}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {[
          { key: "overview", label: "Overview" },
          { key: "activity", label: "Activity Timeline" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as typeof activeTab)}
            className={`px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors ${
              activeTab === tab.key
                ? "text-primary border-b-2 border-primary bg-primary/5"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "overview" && (
        <div className="grid gap-6 md:grid-cols-2">
          {/* Conversations */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-primary" /> Conversation History
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {conversations.map((conv, i) => (
                <div key={i} className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50">
                  <div className={`rounded-full p-1.5 ${conv.agent === "AI" ? "bg-primary/10" : "bg-muted"}`}>
                    {conv.agent === "AI" ? <Bot className="h-3.5 w-3.5 text-primary" /> : <MessageSquare className="h-3.5 w-3.5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs">{conv.summary}</p>
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-1">
                      <span>{conv.date}</span>
                      <span>{conv.channel}</span>
                      <Badge variant="secondary" className="text-[8px] px-1">{conv.agent}</Badge>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Appointments */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" /> Appointment History
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {appointments.map((apt, i) => (
                <div key={i} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50">
                  <div className="flex items-center gap-3">
                    <div className={`rounded-full p-1.5 ${apt.status === "completed" ? "bg-green-100 dark:bg-green-900/30" : "bg-blue-100 dark:bg-blue-900/30"}`}>
                      {apt.status === "completed" ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Calendar className="h-3.5 w-3.5 text-blue-600" />}
                    </div>
                    <div>
                      <p className="text-xs font-medium">{apt.service}</p>
                      <p className="text-[10px] text-muted-foreground">{apt.date}</p>
                    </div>
                  </div>
                  <Badge variant={apt.status === "confirmed" ? "warning" : "success"} className="text-[8px]">{apt.status}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === "activity" && (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {activityTimeline.map((item, i) => (
                <div key={i} className="flex items-start gap-4 p-4 hover:bg-muted/50">
                  <div className="relative flex flex-col items-center">
                    <div className={`rounded-full p-1.5 ${
                      item.type === "ai" ? "bg-primary/10" :
                      item.type === "appointment" ? "bg-blue-100 dark:bg-blue-900/30" :
                      item.type === "sms" ? "bg-green-100 dark:bg-green-900/30" :
                      item.type === "review" ? "bg-yellow-100 dark:bg-yellow-900/30" :
                      "bg-muted"
                    }`}>
                      {item.type === "ai" ? <Bot className="h-3.5 w-3.5 text-primary" /> :
                       item.type === "appointment" ? <Calendar className="h-3.5 w-3.5 text-blue-600" /> :
                       item.type === "sms" ? <MessageSquare className="h-3.5 w-3.5 text-green-600" /> :
                       item.type === "review" ? <Star className="h-3.5 w-3.5 text-yellow-600" /> :
                       <Activity className="h-3.5 w-3.5" />}
                    </div>
                    {i < activityTimeline.length - 1 && (
                      <div className="w-px h-full bg-border mt-1" />
                    )}
                  </div>
                  <div className="flex-1 pb-4">
                    <p className="text-sm">{item.action}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{item.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}