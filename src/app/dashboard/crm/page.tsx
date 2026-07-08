"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Users, Search, Filter, Plus, ChevronDown, ChevronUp,
  GripVertical, Phone, Mail, Calendar, MessageSquare,
  Star, MoreHorizontal, UserPlus, List, Columns,
} from "lucide-react";

type PipelineStage = "new" | "qualified" | "appointment" | "quote" | "negotiation" | "won" | "lost";

interface Lead {
  id: string;
  name: string;
  company: string;
  stage: PipelineStage;
  value: string;
  source: string;
  time: string;
  priority: "high" | "medium" | "low";
  avatar: string;
}

const stages: { key: PipelineStage; label: string; color: string }[] = [
  { key: "new", label: "New Lead", color: "bg-blue-500" },
  { key: "qualified", label: "Qualified", color: "bg-cyan-500" },
  { key: "appointment", label: "Appt. Booked", color: "bg-purple-500" },
  { key: "quote", label: "Quote Sent", color: "bg-orange-500" },
  { key: "negotiation", label: "Negotiation", color: "bg-amber-500" },
  { key: "won", label: "Won", color: "bg-green-500" },
  { key: "lost", label: "Lost", color: "bg-red-500" },
];

const leadsData: Lead[] = [
  { id: "1", name: "John Smith", company: "Smith Residence", stage: "new", value: "$2,400", source: "Website", time: "2h ago", priority: "high", avatar: "JS" },
  { id: "2", name: "Sarah Johnson", company: "Johnson Properties", stage: "new", value: "$5,800", source: "Google", time: "4h ago", priority: "medium", avatar: "SJ" },
  { id: "3", name: "Mike Davis", company: "Davis Roofing", stage: "qualified", value: "$3,200", source: "Referral", time: "1d ago", priority: "high", avatar: "MD" },
  { id: "4", name: "Lisa Brown", company: "Brown Family Home", stage: "appointment", value: "$1,800", source: "Facebook", time: "2d ago", priority: "medium", avatar: "LB" },
  { id: "5", name: "Robert Taylor", company: "Taylor & Co", stage: "quote", value: "$12,500", source: "Website", time: "3d ago", priority: "high", avatar: "RT" },
  { id: "6", name: "Amanda White", company: "White Residence", stage: "negotiation", value: "$8,200", source: "Referral", time: "5d ago", priority: "high", avatar: "AW" },
  { id: "7", name: "David Wilson", company: "Wilson LLC", stage: "won", value: "$4,600", source: "Google", time: "1w ago", priority: "medium", avatar: "DW" },
  { id: "8", name: "Emily Clark", company: "Clark Building", stage: "lost", value: "$3,000", source: "Website", time: "2w ago", priority: "low", avatar: "EC" },
];

const automationRules = [
  { trigger: "Moved to Qualified", action: "Send follow-up email", enabled: true },
  { trigger: "Appointment Booked", action: "Send SMS reminder 24h before", enabled: true },
  { trigger: "Won", action: "Send thank-you email & review request", enabled: true },
  { trigger: "Lost", action: "Send re-engagement email in 30 days", enabled: true },
];

export default function CrmPage() {
  const [viewMode, setViewMode] = useState<"kanban" | "table">("kanban");
  const [searchQuery, setSearchQuery] = useState("");
  const [openAccordion, setOpenAccordion] = useState<string | null>(null);

  const filteredLeads = leadsData.filter(l =>
    l.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Users className="h-8 w-8 text-primary" />
            CRM & Lead Pipeline
          </h1>
          <p className="text-muted-foreground">Manage leads, track pipeline, and close deals</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="bg-muted rounded-lg p-0.5 flex">
            <button onClick={() => setViewMode("kanban")}
              className={`px-3 py-1.5 rounded-md text-xs transition-colors ${viewMode === "kanban" ? "bg-background shadow-sm" : "text-muted-foreground"}`}>
              <Columns className="h-3.5 w-3.5 inline mr-1" />Kanban
            </button>
            <button onClick={() => setViewMode("table")}
              className={`px-3 py-1.5 rounded-md text-xs transition-colors ${viewMode === "table" ? "bg-background shadow-sm" : "text-muted-foreground"}`}>
              <List className="h-3.5 w-3.5 inline mr-1" />Table
            </button>
          </div>
          <Button size="sm"><Plus className="h-3.5 w-3.5 mr-1" /> Add Lead</Button>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search leads..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 rounded-lg border border-input bg-background pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <Button variant="outline" size="sm"><Filter className="h-4 w-4 mr-1" /> Filter</Button>
        <Button variant="outline" size="sm"><UserPlus className="h-4 w-4 mr-1" /> Bulk</Button>
      </div>

      {/* Pipeline Stats */}
      <div className="grid grid-cols-7 gap-2">
        {stages.map((stage) => {
          const count = filteredLeads.filter(l => l.stage === stage.key).length;
          return (
            <Card key={stage.key} className="text-center">
              <CardContent className="p-2">
                <div className={`w-2 h-2 rounded-full mx-auto mb-1 ${stage.color}`} />
                <p className="text-xs text-muted-foreground truncate">{stage.label}</p>
                <p className="text-lg font-bold">{count}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Kanban Board */}
      {viewMode === "kanban" && (
        <div className="grid grid-cols-7 gap-3 overflow-x-auto pb-4">
          {stages.map((stage) => {
            const stageLeads = filteredLeads.filter(l => l.stage === stage.key);
            return (
              <div key={stage.key} className="min-w-[180px]">
                <div className={`rounded-t-lg p-2 ${stage.color} bg-opacity-20`}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium">{stage.label}</span>
                    <Badge variant="secondary" className="text-[10px]">{stageLeads.length}</Badge>
                  </div>
                </div>
                <div className="bg-muted/30 rounded-b-lg p-2 space-y-2 min-h-[200px]">
                  {stageLeads.map((lead) => (
                    <div key={lead.id} className="bg-card rounded-lg p-3 border border-border shadow-sm cursor-pointer hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
                            {lead.avatar}
                          </div>
                          <div>
                            <p className="text-xs font-medium">{lead.name}</p>
                            <p className="text-[10px] text-muted-foreground">{lead.company}</p>
                          </div>
                        </div>
                        <Badge variant={lead.priority === "high" ? "destructive" : lead.priority === "medium" ? "warning" : "secondary"} className="text-[8px] px-1">
                          {lead.priority}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                        <span>{lead.source}</span>
                        <span className="font-mono font-medium text-foreground">{lead.value}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-2 text-[10px] text-muted-foreground">
                        <Phone className="h-2.5 w-2.5" />
                        <Mail className="h-2.5 w-2.5" />
                        <MessageSquare className="h-2.5 w-2.5" />
                        <span className="ml-auto">{lead.time}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Table View */}
      {viewMode === "table" && (
        <Card>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Lead</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Stage</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Value</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Source</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Priority</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Time</th>
                  <th className="text-right py-3 px-4 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredLeads.map((lead) => (
                  <tr key={lead.id} className="border-b border-border hover:bg-muted/50">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">{lead.avatar}</div>
                        <div>
                          <p className="font-medium text-sm">{lead.name}</p>
                          <p className="text-xs text-muted-foreground">{lead.company}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {stages.filter(s => s.key === lead.stage).map(s => (
                        <div key={s.key} className="flex items-center gap-1.5">
                          <div className={`w-2 h-2 rounded-full ${s.color}`} />
                          <span className="text-xs">{s.label}</span>
                        </div>
                      ))}
                    </td>
                    <td className="py-3 px-4 font-mono text-sm">{lead.value}</td>
                    <td className="py-3 px-4 text-muted-foreground">{lead.source}</td>
                    <td className="py-3 px-4">
                      <Badge variant={lead.priority === "high" ? "destructive" : lead.priority === "medium" ? "warning" : "secondary"} className="text-[10px]">
                        {lead.priority}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-muted-foreground text-xs">{lead.time}</td>
                    <td className="py-3 px-4 text-right">
                      <Button variant="ghost" size="sm"><MoreHorizontal className="h-4 w-4" /></Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Automation Rules */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <BotIcon className="h-4 w-4 text-primary" /> Automation Rules
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            {automationRules.map((rule, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-5 rounded-full ${rule.enabled ? "bg-primary" : "bg-muted"} relative cursor-pointer`}>
                    <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 shadow transition-all ${rule.enabled ? "left-5" : "left-0.5"}`} />
                  </div>
                  <div>
                    <p className="text-sm font-medium">When {rule.trigger}</p>
                    <p className="text-xs text-muted-foreground">{rule.action}</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm"><PencilIcon className="h-3.5 w-3.5" /></Button>
              </div>
            ))}
          </div>
          <Button variant="outline" size="sm" className="w-full"><Plus className="h-3.5 w-3.5 mr-1" /> Add Rule</Button>
        </CardContent>
      </Card>
    </div>
  );
}

import { Bot as BotIcon, Pencil as PencilIcon } from "lucide-react";