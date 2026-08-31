"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Phone, Zap, Loader2, PhoneMissed, Pencil, Trash2, Plus, Save, X,
} from "lucide-react";
import { useToast } from "@/components/toaster";
import { getStatusColor, getStatusLabel, formatDate, generateId } from "@/lib/utils";

interface AutomationRule {
  id: string;
  type: string;
  enabled: boolean;
  delayMinutes: number;
  messageTemplate: string;
  channel: string;
}

interface MissedCall {
  id: string;
  callerNumber: string;
  callerName: string;
  calledAt: string;
  handled: boolean;
}

const RULE_TYPES = [
  "missed_call",
  "appointment_reminder",
  "review_request",
  "quote_followup",
  "thank_you",
  "reengagement",
];

const RULE_CHANNELS = ["sms", "phone"];

const defaultTemplates: Record<string, string> = {
  missed_call: "Hi {{name}}, we missed your call! We'll call you back shortly. Or text us to book an appointment.",
  appointment_reminder: "Reminder: You have a {{service}} appointment tomorrow at {{time}}. Reply C to confirm or R to reschedule.",
  review_request: "Thanks for choosing us! How was your experience? Leave a review: {{link}}",
  quote_followup: "Hi {{name}}, following up on your quote for {{service}}. Ready to book? Reply YES to schedule.",
  thank_you: "Thank you {{name}} for your business! We appreciate your trust in us.",
  reengagement: "Hi {{name}}, we haven't seen you in a while! Here's a special offer: {{offer}}",
};

export default function AutomationPage() {
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [missedCalls, setMissedCalls] = useState<MissedCall[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [editingRule, setEditingRule] = useState<string | null>(null);
  const [editTemplate, setEditTemplate] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    fetch("/api/automation")
      .then((r) => r.ok ? r.json() : { rules: [], missedCalls: [] })
      .then((data) => {
        setRules(data.rules || []);
        setMissedCalls(data.missedCalls || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const toggleRule = async (rule: AutomationRule) => {
    setSaving(rule.id);
    try {
      const res = await fetch(`/api/automation`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...rule, enabled: !rule.enabled }),
      });
      if (!res.ok) throw new Error("Failed");
      setRules((prev) => prev.map((r) => r.id === rule.id ? { ...r, enabled: !r.enabled } : r));
      toast(`Rule ${rule.enabled ? "disabled" : "enabled"}`, "success");
    } catch {
      toast("Failed to update rule", "error");
    } finally {
      setSaving(null);
    }
  };

  const saveTemplate = async (rule: AutomationRule) => {
    setSaving(rule.id);
    try {
      const res = await fetch(`/api/automation`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...rule, messageTemplate: editTemplate }),
      });
      if (!res.ok) throw new Error("Failed");
      setRules((prev) => prev.map((r) => r.id === rule.id ? { ...r, messageTemplate: editTemplate } : r));
      setEditingRule(null);
      toast("Template saved", "success");
    } catch {
      toast("Failed to save template", "error");
    } finally {
      setSaving(null);
    }
  };

  const addRule = async (type: string) => {
    setSaving("new");
    try {
      const newRule = {
        id: generateId(),
        type,
        enabled: true,
        delayMinutes: 0,
        messageTemplate: defaultTemplates[type] || "",
        channel: "sms",
      };
      const res = await fetch("/api/automation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newRule),
      });
      if (!res.ok) throw new Error("Failed");
      setRules((prev) => [...prev, newRule]);
      toast("Rule added", "success");
    } catch {
      toast("Failed to add rule", "error");
    } finally {
      setSaving(null);
    }
  };

  const deleteRule = async (rule: AutomationRule) => {
    setSaving(rule.id);
    try {
      const res = await fetch(`/api/automation?id=${rule.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      setRules((prev) => prev.filter((r) => r.id !== rule.id));
      toast("Rule deleted", "success");
    } catch {
      toast("Failed to delete rule", "error");
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Group existing rules by type
  const existingTypes = new Set(rules.map((r) => r.type));
  const availableTypes = RULE_TYPES.filter((t) => !existingTypes.has(t));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Phone className="h-6 w-6" /> Phone & SMS Automation
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Automate follow-ups, reminders, and responses
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Automation Rules */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <Zap className="h-4 w-4" /> Automation Rules
              </CardTitle>
              {availableTypes.length > 0 && (
                <div className="flex gap-1">
                  {availableTypes.slice(0, 3).map((t) => (
                    <Button
                      key={t}
                      variant="outline"
                      size="sm"
                      className="text-[10px] h-7"
                      onClick={() => addRule(t)}
                      disabled={saving === "new"}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      {getStatusLabel(t)}
                    </Button>
                  ))}
                </div>
              )}
            </CardHeader>
            <CardContent className="space-y-3">
              {rules.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Zap className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No automation rules yet</p>
                  <p className="text-xs mt-1">Add rules to automate your communication</p>
                  <div className="flex gap-2 justify-center mt-3">
                    {RULE_TYPES.slice(0, 4).map((t) => (
                      <Button
                        key={t}
                        variant="outline"
                        size="sm"
                        className="text-[10px]"
                        onClick={() => addRule(t)}
                        disabled={saving === "new"}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        {getStatusLabel(t)}
                      </Button>
                    ))}
                  </div>
                </div>
              ) : (
                rules.map((rule) => (
                  <div
                    key={rule.id}
                    className="rounded-lg border border-border p-4 hover:bg-accent/30 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-11 h-6 rounded-full ${rule.enabled ? "bg-primary" : "bg-muted"} relative cursor-pointer transition-colors`}
                          onClick={() => toggleRule(rule)}
                        >
                          <div className={`w-5 h-5 rounded-full bg-white absolute top-0.5 shadow transition-all ${
                            rule.enabled ? "left-5" : "left-0.5"
                          }`} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium capitalize">
                              {getStatusLabel(rule.type)}
                            </span>
                            <Badge variant="outline" className="text-[10px] uppercase">
                              {rule.channel}
                            </Badge>
                            {rule.delayMinutes > 0 && (
                              <Badge variant="secondary" className="text-[10px]">
                                {rule.delayMinutes}m delay
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {rule.enabled ? "Active" : "Disabled"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => {
                            setEditingRule(editingRule === rule.id ? null : rule.id);
                            setEditTemplate(rule.messageTemplate);
                          }}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-destructive"
                          onClick={() => deleteRule(rule)}
                          disabled={saving === rule.id}
                        >
                          {saving === rule.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      </div>
                    </div>

                    {editingRule === rule.id && (
                      <div className="mt-3 pt-3 border-t border-border space-y-2">
                        <label className="text-xs font-medium text-muted-foreground">
                          Message Template
                        </label>
                        <Textarea
                          value={editTemplate}
                          onChange={(e) => setEditTemplate(e.target.value)}
                          rows={3}
                          className="text-xs"
                        />
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setEditingRule(null)}
                          >
                            Cancel
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => saveTemplate(rule)}
                            disabled={saving === rule.id}
                          >
                            {saving === rule.id ? (
                              <Loader2 className="h-3 w-3 animate-spin mr-1" />
                            ) : (
                              <Save className="h-3 w-3 mr-1" />
                            )}
                            Save
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Missed Calls */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <PhoneMissed className="h-4 w-4" /> Missed Calls
              </CardTitle>
            </CardHeader>
            <CardContent>
              {missedCalls.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <PhoneMissed className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No missed calls</p>
                  <p className="text-xs mt-1">Missed calls will appear here</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {missedCalls.map((call) => (
                    <div
                      key={call.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
                    >
                      <div>
                        <p className="text-sm font-medium">{call.callerName || "Unknown"}</p>
                        <p className="text-xs text-muted-foreground">{call.callerNumber}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {formatDate(call.calledAt)}
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className={`text-[10px] ${call.handled ? "bg-green-500/10 text-green-500" : "bg-amber-500/10 text-amber-500"}`}
                      >
                        {call.handled ? "Handled" : "Pending"}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Quick Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Active Rules</span>
                <span className="font-medium">{rules.filter((r) => r.enabled).length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Rules</span>
                <span className="font-medium">{rules.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Missed Calls</span>
                <span className="font-medium">{missedCalls.length}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}