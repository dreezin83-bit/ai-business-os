"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Send, Mail, Smartphone, MessageSquare, Loader2, ArrowLeft,
} from "lucide-react";
import { useToast } from "@/components/toaster";

type Channel = "email" | "sms" | "whatsapp";

interface Lead {
  id: string;
  name: string;
  phone: string;
  email: string;
}

const CHANNELS: { key: Channel; label: string; icon: React.ElementType }[] = [
  { key: "email", label: "Email", icon: Mail },
  { key: "sms", label: "SMS", icon: Smartphone },
  { key: "whatsapp", label: "WhatsApp", icon: MessageSquare },
];

export default function ComposePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [channel, setChannel] = useState<Channel>("email");
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedLeadId, setSelectedLeadId] = useState<string>("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    fetch("/api/leads")
      .then((r) => r.ok ? r.json() : [])
      .then((data) => setLeads(data))
      .catch(() => {});
  }, []);

  const handleLeadSelect = (leadId: string) => {
    setSelectedLeadId(leadId);
    const lead = leads.find((l) => l.id === leadId);
    if (lead) {
      if (channel === "email") {
        setTo(lead.email || "");
      } else {
        setTo(lead.phone || "");
      }
    }
  };

  const handleChannelChange = (newChannel: Channel) => {
    setChannel(newChannel);
    if (selectedLeadId) {
      const lead = leads.find((l) => l.id === selectedLeadId);
      if (lead) {
        setTo(newChannel === "email" ? lead.email || "" : lead.phone || "");
      }
    }
    if (newChannel !== "email") {
      setSubject("");
    }
  };

  const handleSubmit = async () => {
    if (!to.trim() || !body.trim()) return;
    if (channel === "email" && !subject.trim()) return;

    setSending(true);
    try {
      const res = await fetch("/api/communications/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: channel,
          to: to.trim(),
          ...(channel === "email" ? { subject: subject.trim() } : {}),
          body: body.trim(),
          leadId: selectedLeadId || undefined,
        }),
      });

      if (!res.ok) throw new Error("Failed to send");

      toast("Message sent successfully!", "success");
      router.push("/dashboard/messages");
    } catch {
      toast("Failed to send message. Please try again.", "error");
    } finally {
      setSending(false);
    }
  };

  const isValid = () => {
    if (!to.trim() || !body.trim()) return false;
    if (channel === "email" && !subject.trim()) return false;
    return true;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard/messages")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Compose Message</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Send an email, SMS, or WhatsApp message
            </p>
          </div>
        </div>
        <Button size="sm" onClick={handleSubmit} disabled={sending || !isValid()}>
          {sending ? (
            <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
          ) : (
            <Send className="h-4 w-4 mr-1.5" />
          )}
          Send
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main form */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Message Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Channel selector */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                  Channel
                </label>
                <div className="flex gap-2">
                  {CHANNELS.map((ch) => (
                    <button
                      key={ch.key}
                      onClick={() => handleChannelChange(ch.key)}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm transition-colors flex-1 ${
                        channel === ch.key
                          ? "border-primary bg-primary/5 text-primary font-medium"
                          : "border-border hover:bg-muted text-muted-foreground"
                      }`}
                    >
                      <ch.icon className="h-4 w-4" />
                      {ch.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Lead selector (optional) */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  Lead (optional)
                </label>
                <Select value={selectedLeadId} onValueChange={handleLeadSelect}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a lead to auto-fill contact info..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None — enter manually</SelectItem>
                    {leads.map((lead) => (
                      <SelectItem key={lead.id} value={lead.id}>
                        {lead.name} — {lead.email || lead.phone}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* To */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  To {channel === "email" ? "(email address)" : "(phone number)"} *
                </label>
                <Input
                  type={channel === "email" ? "email" : "tel"}
                  placeholder={channel === "email" ? "john@example.com" : "+1 (555) 123-4567"}
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                />
              </div>

              {/* Subject (email only) */}
              {channel === "email" && (
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">
                    Subject *
                  </label>
                  <Input
                    placeholder="Message subject"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                  />
                </div>
              )}

              {/* Body */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  Message Body *
                </label>
                <Textarea
                  placeholder={
                    channel === "email"
                      ? "Write your email message..."
                      : "Type your message..."
                  }
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={8}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Send Tips</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <div className="flex items-start gap-2">
                <Mail className="h-4 w-4 mt-0.5 text-blue-500 shrink-0" />
                <div>
                  <p className="font-medium text-foreground">Email</p>
                  <p className="text-xs">Best for detailed messages, newsletters, and formal communication.</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Smartphone className="h-4 w-4 mt-0.5 text-green-500 shrink-0" />
                <div>
                  <p className="font-medium text-foreground">SMS</p>
                  <p className="text-xs">Best for appointment reminders, short notifications, and urgent alerts.</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <MessageSquare className="h-4 w-4 mt-0.5 text-purple-500 shrink-0" />
                <div>
                  <p className="font-medium text-foreground">WhatsApp</p>
                  <p className="text-xs">Best for rich media, conversational support, and international clients.</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Recipient Preview</CardTitle>
            </CardHeader>
            <CardContent>
              {to ? (
                <p className="text-sm font-medium break-all">{to}</p>
              ) : (
                <p className="text-sm text-muted-foreground">No recipient selected</p>
              )}
              {selectedLeadId && (
                <p className="text-xs text-muted-foreground mt-1">
                  via {channel === "email" ? "Email" : channel === "sms" ? "SMS" : "WhatsApp"}
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}