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
  Calendar, Plus, Loader2, Clock, ChevronLeft, ChevronRight,
} from "lucide-react";
import { useToast } from "@/components/toaster";
import { getStatusColor, getStatusLabel, formatDate, generateId } from "@/lib/utils";

interface Appointment {
  id: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  service: string;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  notes: string;
  createdAt: string;
}

const STATUS_TABS = ["all", "scheduled", "confirmed", "completed", "cancelled"];

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusTab, setStatusTab] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const { toast } = useToast();

  const [form, setForm] = useState({
    customerName: "", customerPhone: "", customerEmail: "",
    service: "", date: "", startTime: "", endTime: "", notes: "",
  });

  useEffect(() => {
    fetch("/api/appointments")
      .then((r) => r.ok ? r.json() : Promise.reject("Failed to load"))
      .then((data) => { setAppointments(data); setLoading(false); })
      .catch(() => { setError("Failed to load appointments"); setLoading(false); });
  }, []);

  const filtered = statusTab === "all"
    ? appointments
    : appointments.filter((a) => a.status === statusTab);

  const handleCreate = async () => {
    if (!form.customerName.trim() || !form.service.trim() || !form.date || !form.startTime) return;
    setSaving(true);
    setBookingError(null);
    try {
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: generateId(),
          ...form,
          status: "scheduled",
        }),
      });
      if (res.status === 409) {
        setBookingError("This time slot is already booked. Please choose another time.");
        return;
      }
      if (!res.ok) throw new Error("Failed to create");
      const newAppt = await res.json();
      setAppointments((prev) => [...prev, newAppt]);
      setDialogOpen(false);
      setForm({ customerName: "", customerPhone: "", customerEmail: "", service: "", date: "", startTime: "", endTime: "", notes: "" });
      toast("Appointment created", "success");
    } catch {
      toast("Failed to create appointment", "error");
    } finally {
      setSaving(false);
    }
  };

  const statusCounts = STATUS_TABS.reduce(
    (acc, s) => ({ ...acc, [s]: s === "all" ? appointments.length : appointments.filter((a) => a.status === s).length }),
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Appointments</h1>
          <p className="text-sm text-muted-foreground mt-1">Schedule and manage appointments</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1.5" /> New Appointment
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New Appointment</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <label className="text-sm font-medium mb-1 block">Customer Name *</label>
                <Input
                  placeholder="Full name"
                  value={form.customerName}
                  onChange={(e) => setForm({ ...form, customerName: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium mb-1 block">Phone</label>
                  <Input
                    placeholder="(555) 123-4567"
                    value={form.customerPhone}
                    onChange={(e) => setForm({ ...form, customerPhone: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Email</label>
                  <Input
                    placeholder="john@example.com"
                    value={form.customerEmail}
                    onChange={(e) => setForm({ ...form, customerEmail: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Service *</label>
                <Input
                  placeholder="e.g. HVAC Maintenance"
                  value={form.service}
                  onChange={(e) => setForm({ ...form, service: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium mb-1 block">Date *</label>
                  <Input
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Start Time *</label>
                  <Input
                    type="time"
                    value={form.startTime}
                    onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">End Time</label>
                <Input
                  type="time"
                  value={form.endTime}
                  onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Notes</label>
                <Textarea
                  placeholder="Optional notes..."
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows={2}
                />
              </div>

              {bookingError && (
                <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20 text-sm text-destructive">
                  {bookingError}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <DialogClose asChild>
                  <Button variant="outline" size="sm">Cancel</Button>
                </DialogClose>
                <Button
                  size="sm"
                  onClick={handleCreate}
                  disabled={saving || !form.customerName.trim() || !form.service.trim() || !form.date || !form.startTime}
                >
                  {saving && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
                  Create Appointment
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Status tabs */}
      <div className="flex gap-1 bg-muted rounded-lg p-0.5 overflow-x-auto">
        {STATUS_TABS.map((s) => (
          <button
            key={s}
            onClick={() => setStatusTab(s)}
            className={`px-3 py-1.5 rounded-md text-xs whitespace-nowrap transition-colors ${
              statusTab === s ? "bg-background shadow-sm font-medium" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {getStatusLabel(s)} ({statusCounts[s] || 0})
          </button>
        ))}
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Calendar className="h-10 w-10 mb-3 opacity-40" />
            <p className="text-sm font-medium">No appointments found</p>
            <p className="text-xs mt-1">
              {statusTab !== "all"
                ? `No appointments with status "${getStatusLabel(statusTab)}"`
                : "Schedule your first appointment"}
            </p>
            {statusTab === "all" && (
              <Button variant="outline" size="sm" className="mt-4" onClick={() => setDialogOpen(true)}>
                <Plus className="h-3.5 w-3.5 mr-1" /> New Appointment
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Appointment list */}
      {filtered.length > 0 && (
        <div className="space-y-3">
          {filtered.map((apt) => (
            <Card key={apt.id} className="hover:bg-accent/30 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center text-xs font-medium shrink-0">
                      {apt.customerName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{apt.customerName}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{apt.service}</p>
                      <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" /> {apt.date}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" /> {apt.startTime}{apt.endTime ? ` - ${apt.endTime}` : ""}
                        </span>
                      </div>
                      {apt.notes && (
                        <p className="text-xs text-muted-foreground mt-1 italic">{apt.notes}</p>
                      )}
                    </div>
                  </div>
                  <Badge variant="outline" className={`${getStatusColor(apt.status)} text-white text-[10px] border-0`}>
                    {getStatusLabel(apt.status)}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}