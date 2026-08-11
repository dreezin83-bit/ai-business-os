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
  Send, Mail, Loader2, ArrowLeft,
} from "lucide-react";
import { useToast } from "@/components/toaster";
interface Lead {
  id: string;
  name: string;
  phone: string;
  email: string;
}
export default function ComposePage() {
  const router = useRouter();
  const { toast } = useToast();
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
      setTo(lead.email || "");
    }
  };
  const handleSubmit = async () => {
    if (!to.trim() || !body.trim()) return;
    if (!subject.trim()) return;
    setSending(true);
    try {
      const res = await fetch("/api/communications/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "email",
          to: to.trim(),
          subject: subject.trim(),
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
    if (!subject.trim()) return false;
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
              Send an email message
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
                  To (email address) *
                </label>
                <Input
                  type="email"
                  placeholder="john@example.com"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                />
              </div>
              {/* Subject */}
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
              {/* Body */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  Message Body *
                </label>
                <Textarea
                  placeholder="Write your email message..."
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
                  <p className="text-xs">Best for detailed messages, follow-ups, and formal communication.</p>
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
                  via Email
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
