"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/toaster";
import { Loader2, Mail, MessageSquare, Smartphone, Save, Check } from "lucide-react";

interface CommSettings {
  id?: string;
  emailEnabled: boolean;
  whatsappEnabled: boolean;
  smsEnabled: boolean;
  primaryMethod: string;
}

const methods = [
  { value: "email", label: "Email", icon: Mail, color: "blue" },
  { value: "whatsapp", label: "WhatsApp", icon: MessageSquare, color: "green" },
  { value: "sms", label: "SMS", icon: Smartphone, color: "purple" },
];

export default function CommunicationSettingsPage() {
  const [settings, setSettings] = useState<CommSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetch("/api/communication-settings")
      .then((r) => r.json())
      .then((data) => {
        setSettings(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const toggle = (key: "emailEnabled" | "whatsappEnabled" | "smsEnabled") => {
    if (!settings) return;
    const updated = { ...settings, [key]: !settings[key] };
    setSettings(updated);
  };

  const save = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      const res = await fetch("/api/communication-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (res.ok) {
        toast("Communication settings saved", "success");
      } else {
        toast("Failed to save settings", "error");
      }
    } catch {
      toast("Failed to save settings", "error");
    }
    setSaving(false);
  };

  const enabledCount = [settings?.emailEnabled, settings?.whatsappEnabled, settings?.smsEnabled].filter(Boolean).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Communication Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configure how your business communicates with customers
        </p>
      </div>

      {/* Channel toggles */}
      <Card>
        <CardHeader>
          <CardTitle>Communication Channels</CardTitle>
          <CardDescription>Enable or disable contact methods</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {methods.map((method) => {
            const key = `${method.value}Enabled` as keyof CommSettings;
            const enabled = settings?.[key] as boolean;
            return (
              <div
                key={method.value}
                className="flex items-center justify-between p-4 rounded-lg border hover:bg-accent/50 transition-colors cursor-pointer"
                onClick={() => toggle(key as any)}
              >
                <div className="flex items-center gap-3">
                  <div className={`h-9 w-9 rounded-lg bg-${method.color}-500/10 flex items-center justify-center`}>
                    <method.icon className={`h-4 w-4 text-${method.color}-500`} />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{method.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {enabled ? "Enabled" : "Disabled"}
                    </p>
                  </div>
                </div>
                <div className={`h-6 w-11 rounded-full transition-colors ${
                  enabled ? "bg-green-500" : "bg-muted"
                } relative`}>
                  <div className={`h-5 w-5 rounded-full bg-white absolute top-0.5 transition-transform ${
                    enabled ? "translate-x-5.5" : "translate-x-0.5"
                  }`} />
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Primary method */}
      <Card>
        <CardHeader>
          <CardTitle>Primary Contact Method</CardTitle>
          <CardDescription>
            The AI will suggest this method first when asking customers how to reach them
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <Select
              value={settings?.primaryMethod || "email"}
              onValueChange={(v) => setSettings((s) => s ? { ...s, primaryMethod: v } : s)}
            >
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Select method" />
              </SelectTrigger>
              <SelectContent>
                {methods
                  .filter((m) => {
                    const key = `${m.value}Enabled` as keyof CommSettings;
                    return settings?.[key] as boolean;
                  })
                  .map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      <div className="flex items-center gap-2">
                        <m.icon className="h-3.5 w-3.5" />
                        {m.label}
                      </div>
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            {enabledCount === 0 && (
              <p className="text-xs text-red-500">Enable at least one channel</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Preview */}
      <Card>
        <CardHeader>
          <CardTitle>AI Behavior Preview</CardTitle>
          <CardDescription>How the AI will interact based on these settings</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg bg-muted p-4 text-sm space-y-2">
            {!settings?.emailEnabled && !settings?.whatsappEnabled && !settings?.smsEnabled ? (
              <p className="text-red-500">No channels enabled. Enable at least one.</p>
            ) : enabledCount === 1 ? (
              <p>
                AI will ask for{" "}
                <strong>
                  {settings?.emailEnabled ? "email address" : ""}
                  {settings?.whatsappEnabled ? "WhatsApp number" : ""}
                  {settings?.smsEnabled ? "phone number" : ""}
                </strong>{" "}
                only.
              </p>
            ) : (
              <p>
                AI will ask: <em>"Would you like updates through{" "}
                {[
                  settings?.emailEnabled && "Email",
                  settings?.whatsappEnabled && "WhatsApp",
                  settings?.smsEnabled && "SMS",
                ].filter(Boolean).join(" or ")}
                ?"</em>
              </p>
            )}
            {settings?.primaryMethod && (
              <p className="text-xs text-muted-foreground">
                Primary method: <Badge variant="outline" className="text-[10px]">{settings.primaryMethod}</Badge>
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Button onClick={save} disabled={saving || !settings}>
        {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
        Save Settings
      </Button>
    </div>
  );
}