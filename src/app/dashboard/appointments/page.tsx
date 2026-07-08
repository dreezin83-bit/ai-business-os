"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Calendar, Clock, Plus, ChevronLeft, ChevronRight,
  Users, Phone, Mail, Check, X, AlertCircle,
  Bell, Repeat, Filter, Search, MoreHorizontal,
  UserPlus, Settings2, CalendarDays, List,
} from "lucide-react";

// ── Types ──

type AppointmentStatus = "confirmed" | "pending" | "completed" | "cancelled";
type ViewMode = "day" | "week" | "month";

interface Appointment {
  id: string;
  time: string;
  client: string;
  service: string;
  staff: string;
  status: AppointmentStatus;
  duration: string;
  avatar: string;
  phone: string;
  email: string;
}

interface StaffMember {
  id: string;
  name: string;
  role: string;
  avatar: string;
  color: string;
  active: boolean;
  appointmentsToday: number;
}

// ── Mock Data ──

const todayAppointments: Appointment[] = [
  { id: "1", time: "9:00 AM", client: "John Smith", service: "HVAC Maintenance", staff: "Mike R.", status: "confirmed", duration: "1h", avatar: "JS", phone: "(555) 123-4567", email: "john@smith.com" },
  { id: "2", time: "10:30 AM", client: "Sarah Johnson", service: "Plumbing Repair", staff: "Lisa T.", status: "confirmed", duration: "1.5h", avatar: "SJ", phone: "(555) 234-5678", email: "sarah@johnson.com" },
  { id: "3", time: "1:00 PM", client: "Mike Davis", service: "Roof Inspection", staff: "Mike R.", status: "pending", duration: "2h", avatar: "MD", phone: "(555) 345-6789", email: "mike@davis.com" },
  { id: "4", time: "3:30 PM", client: "Lisa Brown", service: "Electrical Wiring", staff: "Tom K.", status: "confirmed", duration: "1h", avatar: "LB", phone: "(555) 456-7890", email: "lisa@brown.com" },
  { id: "5", time: "5:00 PM", client: "Robert Taylor", service: "AC Installation", staff: "Lisa T.", status: "completed", duration: "3h", avatar: "RT", phone: "(555) 567-8901", email: "robert@taylor.com" },
];

const upcomingAppointments: Appointment[] = [
  { id: "6", time: "8:30 AM", client: "Amanda White", service: "Drain Cleaning", staff: "Tom K.", status: "confirmed", duration: "1h", avatar: "AW", phone: "(555) 678-9012", email: "amanda@white.com" },
  { id: "7", time: "11:00 AM", client: "David Wilson", service: "Furnace Repair", staff: "Mike R.", status: "confirmed", duration: "2h", avatar: "DW", phone: "(555) 789-0123", email: "david@wilson.com" },
  { id: "8", time: "2:00 PM", client: "Emily Clark", service: "Septic Inspection", staff: "Lisa T.", status: "pending", duration: "1.5h", avatar: "EC", phone: "(555) 890-1234", email: "emily@clark.com" },
];

const staffMembers: StaffMember[] = [
  { id: "1", name: "Mike Reynolds", role: "Senior Technician", avatar: "MR", color: "bg-blue-500", active: true, appointmentsToday: 3 },
  { id: "2", name: "Lisa Thompson", role: "Technician", avatar: "LT", color: "bg-purple-500", active: true, appointmentsToday: 2 },
  { id: "3", name: "Tom Kennedy", role: "Electrician", avatar: "TK", color: "bg-amber-500", active: true, appointmentsToday: 2 },
  { id: "4", name: "Rachel Green", role: "Plumber", avatar: "RG", color: "bg-green-500", active: false, appointmentsToday: 0 },
];

const timeSlots = [
  "8:00 AM", "9:00 AM", "10:00 AM", "11:00 AM",
  "12:00 PM", "1:00 PM", "2:00 PM", "3:00 PM",
  "4:00 PM", "5:00 PM", "6:00 PM",
];

const staffSchedule: Record<string, string[]> = {
  "Mike R.": ["9:00", "10:30", "1:00"],
  "Lisa T.": ["10:30", "5:00"],
  "Tom K.": ["3:30"],
};

// ── Helper Components ──

function AppointmentCard({ appointment }: { appointment: Appointment }) {
  const statusColors: Record<AppointmentStatus, string> = {
    confirmed: "border-l-green-500",
    pending: "border-l-amber-500",
    completed: "border-l-blue-500",
    cancelled: "border-l-red-500",
  };

  return (
    <div className={`border-l-4 ${statusColors[appointment.status]} bg-card rounded-lg p-3 border border-border shadow-sm hover:shadow-md transition-all cursor-pointer`}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">
            {appointment.avatar}
          </div>
          <div>
            <p className="text-sm font-medium">{appointment.client}</p>
            <p className="text-[10px] text-muted-foreground">{appointment.service}</p>
          </div>
        </div>
        <Badge variant={
          appointment.status === "confirmed" ? "success" :
          appointment.status === "pending" ? "warning" :
          appointment.status === "completed" ? "default" :
          "destructive"
        } className="text-[10px] px-1.5 py-0">
          {appointment.status}
        </Badge>
      </div>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <Clock className="h-3 w-3" />
          <span>{appointment.time} ({appointment.duration})</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="flex items-center gap-1 bg-muted rounded-full px-2 py-0.5">
            <div className="h-3 w-3 rounded-full bg-primary/20 text-[7px] flex items-center justify-center font-bold text-primary">
              {appointment.staff.split(" ").map(n => n[0]).join("")}
            </div>
            <span className="text-[10px]">{appointment.staff}</span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border">
        <button className="p-1 rounded-md hover:bg-muted text-muted-foreground">
          <Phone className="h-3 w-3" />
        </button>
        <button className="p-1 rounded-md hover:bg-muted text-muted-foreground">
          <Mail className="h-3 w-3" />
        </button>
        <button className="p-1 rounded-md hover:bg-muted text-muted-foreground ml-auto">
          <MoreHorizontal className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

function NewAppointmentModal({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(1);

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center" onClick={onClose}>
      <div className="bg-background rounded-2xl shadow-2xl w-full max-w-lg mx-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div>
            <h3 className="text-lg font-semibold">New Appointment</h3>
            <p className="text-sm text-muted-foreground">Step {step} of 3</p>
          </div>
          <button onClick={onClose} className="rounded-md p-1 hover:bg-muted">
            <X className="h-5 w-5" />
          </button>
        </div>

        {step === 1 && (
          <div className="p-6 space-y-4">
            <div>
              <label className="text-sm font-medium">Customer</label>
              <select className="w-full mt-1 h-10 rounded-lg border border-input bg-background px-3 text-sm">
                <option>John Smith</option>
                <option>Sarah Johnson</option>
                <option>Mike Davis</option>
                <option>+ New Customer</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Service</label>
              <select className="w-full mt-1 h-10 rounded-lg border border-input bg-background px-3 text-sm">
                <option>HVAC Maintenance</option>
                <option>Plumbing Repair</option>
                <option>Electrical Wiring</option>
                <option>AC Installation</option>
                <option>Roof Inspection</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Date</label>
                <input type="date" className="w-full mt-1 h-10 rounded-lg border border-input bg-background px-3 text-sm" defaultValue={new Date().toISOString().split("T")[0]} />
              </div>
              <div>
                <label className="text-sm font-medium">Time</label>
                <select className="w-full mt-1 h-10 rounded-lg border border-input bg-background px-3 text-sm">
                  {timeSlots.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Assigned Staff</label>
              <div className="grid grid-cols-2 gap-2 mt-1">
                {staffMembers.map(s => (
                  <label key={s.id} className="flex items-center gap-2 p-2 rounded-lg border border-border hover:bg-muted cursor-pointer">
                    <input type="radio" name="staff" className="accent-primary" />
                    <div className={`h-6 w-6 rounded-full ${s.color} flex items-center justify-center text-[10px] text-white font-medium`}>
                      {s.avatar}
                    </div>
                    <span className="text-xs">{s.name.split(" ")[0]}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
              <input type="checkbox" className="accent-primary" />
              <span className="text-sm">Send confirmation notification</span>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="p-6 space-y-4">
            <div>
              <label className="text-sm font-medium">Notes</label>
              <textarea
                className="w-full mt-1 h-24 rounded-lg border border-input bg-background p-3 text-sm resize-none"
                placeholder="Add any special instructions or notes..."
              />
            </div>
            <div>
              <label className="text-sm font-medium">Reminder Settings</label>
              <div className="space-y-2 mt-1">
                {[
                  { label: "SMS reminder 24h before", checked: true },
                  { label: "Email reminder 2h before", checked: true },
                  { label: "Phone call reminder (premium)", checked: false },
                ].map((item) => (
                  <label key={item.label} className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted cursor-pointer">
                    <input type="checkbox" defaultChecked={item.checked} className="accent-primary" />
                    <span className="text-sm">{item.label}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Recurrence</label>
              <select className="w-full mt-1 h-10 rounded-lg border border-input bg-background px-3 text-sm">
                <option>No repeat</option>
                <option>Daily</option>
                <option>Weekly</option>
                <option>Bi-weekly</option>
                <option>Monthly</option>
              </select>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="p-6 space-y-4">
            <div className="bg-primary/5 rounded-xl p-4 text-center">
              <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-3">
                <Check className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold">Appointment Summary</h3>
              <div className="mt-4 space-y-2 text-sm text-left">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Customer</span>
                  <span className="font-medium">John Smith</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Service</span>
                  <span className="font-medium">HVAC Maintenance</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Date</span>
                  <span className="font-medium">Today, 10:30 AM</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Staff</span>
                  <span className="font-medium">Mike Reynolds</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Duration</span>
                  <span className="font-medium">1 hour</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Reminders</span>
                  <span className="font-medium">SMS + Email</span>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between p-6 border-t border-border">
          <Button variant="outline" size="sm" onClick={() => setStep(Math.max(1, step - 1))} disabled={step === 1}>
            Back
          </Button>
          <Button size="sm" onClick={() => step < 3 ? setStep(step + 1) : onClose()}>
            {step < 3 ? "Continue" : "Create Appointment"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ──

export default function AppointmentsPage() {
  const [viewMode, setViewMode] = useState<ViewMode>("day");
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState<"today" | "upcoming" | "completed" | "cancelled">("today");

  const tabs = [
    { key: "today" as const, label: "Today", count: todayAppointments.length },
    { key: "upcoming" as const, label: "Upcoming", count: upcomingAppointments.length },
    { key: "completed" as const, label: "Completed", count: 2 },
    { key: "cancelled" as const, label: "Cancelled", count: 0 },
  ];

  const currentAppointments = activeTab === "today" ? todayAppointments : upcomingAppointments;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Calendar className="h-8 w-8 text-primary" />
            Appointment Booking
          </h1>
          <p className="text-muted-foreground">Manage, schedule, and track appointments</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Settings2 className="h-3.5 w-3.5 mr-1" /> Settings
          </Button>
          <Button size="sm" onClick={() => setShowModal(true)}>
            <Plus className="h-3.5 w-3.5 mr-1" /> New Appointment
          </Button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
        {[
          { label: "Today", value: "5", change: "+2 vs yesterday", icon: Calendar, color: "text-blue-600" },
          { label: "This Week", value: "24", change: "+15%", icon: Clock, color: "text-green-600" },
          { label: "Completed", value: "18", change: "92% on time", icon: Check, color: "text-purple-600" },
          { label: "No-Show Rate", value: "4%", change: "-2% improvement", icon: AlertCircle, color: "text-amber-600" },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">{stat.label}</p>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
              <p className="text-2xl font-bold">{stat.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{stat.change}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* View Controls & Search */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="bg-muted rounded-lg p-0.5 flex">
            {(["day", "week", "month"] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-3 py-1.5 rounded-md text-xs transition-colors capitalize ${
                  viewMode === mode ? "bg-background shadow-sm font-medium" : "text-muted-foreground"
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1 text-sm">
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="font-medium px-2">
              {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
            </span>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search appointments..."
              className="h-10 w-48 rounded-lg border border-input bg-background pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <Button variant="outline" size="sm">
            <Filter className="h-3.5 w-3.5 mr-1" /> Filter
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-4">
          {/* Tabs */}
          <div className="flex gap-1 bg-muted rounded-lg p-0.5">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 px-4 py-2 rounded-md text-sm transition-colors ${
                  activeTab === tab.key
                    ? "bg-background shadow-sm font-medium"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.label} ({tab.count})
              </button>
            ))}
          </div>

          {/* Calendar / Schedule View */}
          {viewMode === "day" && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-primary" />
                  Today&apos;s Schedule
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  {timeSlots.map((slot) => {
                    const apts = currentAppointments.filter(a => a.time === slot);
                    return (
                      <div key={slot} className="flex items-start gap-3 py-2 border-b border-border last:border-0 min-h-[48px]">
                        <div className="text-xs text-muted-foreground font-mono w-16 shrink-0 pt-1">{slot}</div>
                        <div className="flex-1 space-y-1">
                          {apts.length > 0 ? apts.map(apt => (
                            <div key={apt.id} className="flex items-center gap-2 p-2 rounded-lg bg-primary/5 border border-primary/10">
                              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-[9px] font-medium text-primary shrink-0">
                                {apt.avatar}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                  <p className="text-xs font-medium">{apt.client}</p>
                                  <Badge variant={
                                    apt.status === "confirmed" ? "success" :
                                    apt.status === "pending" ? "warning" : "default"
                                  } className="text-[8px] px-1 py-0">{apt.status}</Badge>
                                </div>
                                <p className="text-[10px] text-muted-foreground">{apt.service} • {apt.staff}</p>
                              </div>
                            </div>
                          )) : (
                            <div className="text-[10px] text-muted-foreground italic px-2">Available</div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {viewMode === "week" && (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                <CalendarDays className="h-8 w-8 mx-auto mb-2" />
                <p className="text-sm">Week view coming soon</p>
                <p className="text-xs">Switch to Day or Month view</p>
              </CardContent>
            </Card>
          )}

          {viewMode === "month" && (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                <CalendarDays className="h-8 w-8 mx-auto mb-2" />
                <p className="text-sm">Month view coming soon</p>
                <p className="text-xs">Calendar month view with appointment indicators</p>
              </CardContent>
            </Card>
          )}

          {/* Appointment List */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <List className="h-4 w-4 text-primary" />
                  {activeTab === "today" ? "Today's Appointments" : "Upcoming Appointments"}
                </span>
                <span className="text-xs text-muted-foreground">{currentAppointments.length} total</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {currentAppointments.map((apt) => (
                <AppointmentCard key={apt.id} appointment={apt} />
              ))}
              {currentAppointments.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No {activeTab} appointments</p>
                  <Button variant="outline" size="sm" className="mt-3" onClick={() => setShowModal(true)}>
                    <Plus className="h-3.5 w-3.5 mr-1" /> Book an Appointment
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-4">
          {/* Staff Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" /> Staff Schedule
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {staffMembers.map((staff) => (
                <div key={staff.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                  <div className={`h-8 w-8 rounded-full ${staff.color} flex items-center justify-center text-xs font-medium text-white`}>
                    {staff.avatar}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">{staff.name}</p>
                      <div className={`h-2 w-2 rounded-full ${staff.active ? "bg-green-500" : "bg-muted"}`} />
                    </div>
                    <p className="text-xs text-muted-foreground">{staff.role}</p>
                    <p className="text-[10px] text-muted-foreground">{staff.appointmentsToday} appointments today</p>
                  </div>
                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className={`h-1.5 w-1.5 rounded-full ${i < 4 ? "bg-primary" : "bg-muted"}`} />
                    ))}
                  </div>
                </div>
              ))}
              <Button variant="outline" size="sm" className="w-full">
                <UserPlus className="h-3.5 w-3.5 mr-1" /> Manage Staff
              </Button>
            </CardContent>
          </Card>

          {/* Reminder Automation */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Bell className="h-4 w-4 text-primary" /> Reminder Automation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { label: "SMS Reminder", time: "24h before", enabled: true },
                { label: "Email Reminder", time: "2h before", enabled: true },
                { label: "Phone Call", time: "Premium only", enabled: false },
                { label: "Follow-up SMS", time: "After no-show", enabled: true },
              ].map((reminder) => (
                <label key={reminder.label} className="flex items-center justify-between cursor-pointer">
                  <div>
                    <p className="text-sm">{reminder.label}</p>
                    <p className="text-[10px] text-muted-foreground">{reminder.time}</p>
                  </div>
                  <div className={`w-10 h-5 rounded-full ${reminder.enabled ? "bg-primary" : "bg-muted"} relative transition-colors`}>
                    <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 shadow transition-all ${
                      reminder.enabled ? "left-5" : "left-0.5"
                    }`} />
                  </div>
                </label>
              ))}
              <Button variant="outline" size="sm" className="w-full">
                <Repeat className="h-3.5 w-3.5 mr-1" /> Configure Rules
              </Button>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Quick Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Avg. Duration</span>
                <span className="text-sm font-medium">1h 35m</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Booking Rate</span>
                <span className="text-sm font-medium text-green-600">+23%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Reschedule Rate</span>
                <span className="text-sm font-medium text-amber-600">8%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Peak Time</span>
                <span className="text-sm font-medium">10:30 AM</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modal */}
      {showModal && <NewAppointmentModal onClose={() => setShowModal(false)} />}
    </div>
  );
}
