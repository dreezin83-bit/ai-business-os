"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Users, Plus, Search, Filter, Loader2, Phone, Mail,
  Calendar, ArrowUpRight, MoreHorizontal, X,
} from "lucide-react";
import Link from "next/link";
import { useToast } from "@/components/toaster";
import { getStatusColor, getStatusLabel, formatDate, generateId } from "@/lib/utils";

interface Lead {
  id: string;
  name: string;
  phone: string;
  email: string;
  serviceRequest: string;
  source: string;
  status: string;
  notes: string;
  createdAt: string;
}

const STATUSES = ["new", "contacted", "appointment_booked", "quote_sent", "won", "lost"];

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const [form, setForm] = useState({ name: "", phone: "", email: "", serviceRequest: "" });

  useEffect(() => {
    fetch("/api/leads")
      .then((r) => r.ok ? r.json() : Promise.reject("Failed to load"))
      .then((data) => { setLeads(data); setLoading(false); })
      .catch(() => { setError("Failed to load leads"); setLoading(false); });
  }, []);

  const filteredLeads = leads.filter((l) => {
    if (statusFilter !== "all" && l.status !== statusFilter) return false;
    if (searchQuery && !l.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const handleAddLead = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: generateId(),
          ...form,
          status: "new",
          source: "manual",
        }),
      });
      if (!res.ok) throw new Error("Failed to create");
      const newLead = await res.json();
      setLeads((prev) => [newLead, ...prev]);
      setDialogOpen(false);
      setForm({ name: "", phone: "", email: "", serviceRequest: "" });
      toast("Lead created successfully", "success");
    } catch {
      toast("Failed to create lead", "error");
    } finally {
      setSaving(false);
    }
  };

  const statusCounts = STATUSES.reduce(
    (acc, s) => ({ ...acc, [s]: leads.filter((l) => l.status === s).length }),
    {} as Record<string, number>
  );

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Leads</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage and track your leads
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1.5" /> Add Lead
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New Lead</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <label className="text-sm font-medium mb-1 block">Name *</label>
                <Input
                  placeholder="Full name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Phone</label>
                <Input
                  placeholder="(555) 123-4567"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Email</label>
                <Input
                  placeholder="john@example.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Service Request</label>
                <Textarea
                  placeholder="What service are they interested in?"
                  value={form.serviceRequest}
                  onChange={(e) => setForm({ ...form, serviceRequest: e.target.value })}
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <DialogClose asChild>
                  <Button variant="outline" size="sm">Cancel</Button>
                </DialogClose>
                <Button size="sm" onClick={handleAddLead} disabled={saving || !form.name.trim()}>
                  {saving && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
                  Create Lead
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-1 bg-muted rounded-lg p-0.5 overflow-x-auto">
        <button
          onClick={() => setStatusFilter("all")}
          className={`px-3 py-1.5 rounded-md text-xs whitespace-nowrap transition-colors ${
            statusFilter === "all" ? "bg-background shadow-sm font-medium" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          All ({leads.length})
        </button>
        {STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-md text-xs whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              statusFilter === s ? "bg-background shadow-sm font-medium" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <div className={`h-1.5 w-1.5 rounded-full ${getStatusColor(s)}`} />
            {getStatusLabel(s)} ({statusCounts[s] || 0})
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search leads..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full h-9 rounded-md border border-input bg-background pl-9 pr-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </div>

      {/* Empty state */}
      {filteredLeads.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Users className="h-10 w-10 mb-3 opacity-40" />
            <p className="text-sm font-medium">No leads found</p>
            <p className="text-xs mt-1">
              {searchQuery || statusFilter !== "all"
                ? "Try adjusting your filters"
                : "Add your first lead to get started"}
            </p>
            {!searchQuery && statusFilter === "all" && (
              <Button variant="outline" size="sm" className="mt-4" onClick={() => setDialogOpen(true)}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Add Lead
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Lead table */}
      {filteredLeads.length > 0 && (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground text-xs">Name</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground text-xs hidden sm:table-cell">Contact</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground text-xs hidden md:table-cell">Service</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground text-xs hidden lg:table-cell">Source</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground text-xs">Status</th>
                    <th className="text-right py-3 px-4 font-medium text-muted-foreground text-xs">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLeads.map((lead) => (
                    <tr
                      key={lead.id}
                      className="border-b border-border hover:bg-accent/30 cursor-pointer transition-colors"
                      onClick={() => window.location.href = `/dashboard/leads/${lead.id}`}
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                            {lead.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-sm">{lead.name}</p>
                            <p className="text-xs text-muted-foreground sm:hidden">{lead.phone || lead.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 hidden sm:table-cell">
                        <div className="flex flex-col gap-0.5">
                          {lead.phone && <span className="text-xs flex items-center gap-1"><Phone className="h-3 w-3 text-muted-foreground" />{lead.phone}</span>}
                          {lead.email && <span className="text-xs flex items-center gap-1"><Mail className="h-3 w-3 text-muted-foreground" />{lead.email}</span>}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-xs text-muted-foreground hidden md:table-cell max-w-[160px] truncate">
                        {lead.serviceRequest || "—"}
                      </td>
                      <td className="py-3 px-4 text-xs text-muted-foreground hidden lg:table-cell capitalize">
                        {lead.source}
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant="outline" className={`${getStatusColor(lead.status)} text-white text-[10px] border-0`}>
                          {getStatusLabel(lead.status)}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right text-xs text-muted-foreground">
                        {formatDate(lead.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}