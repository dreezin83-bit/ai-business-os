"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Settings, Loader2, Save, Copy, Check, ExternalLink } from "lucide-react";
import { useToast } from "@/components/toaster";

interface BusinessSettings {
  name: string;
  phone: string;
  email: string;
  website: string;
  address: string;
  vapiWebhookToken?: string;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<BusinessSettings>({
    name: "",
    phone: "",
    email: "",
    website: "",
    address: "",
    vapiWebhookToken: undefined,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.ok ? r.json() : Promise.reject("No settings"))
      .then((data) => {
        if (data && data.id) {
          setSettings({
            name: data.name || "",
            phone: data.phone || "",
            email: data.email || "",
            website: data.website || "",
            address: data.address || "",
            vapiWebhookToken: data.vapiWebhookToken || undefined,
          });
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (!res.ok) throw new Error("Failed to save");
      toast("Settings saved successfully", "success");
    } catch {
      toast("Failed to save settings", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleCopyWebhook = () => {
    const url = `https://ai-business-os-six.vercel.app/api/voice/vapi/${settings.vapiWebhookToken}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      toast("Webhook URL copied to clipboard", "success");
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const webhookUrl = settings.vapiWebhookToken
    ? `https://ai-business-os-six.vercel.app/api/voice/vapi/${settings.vapiWebhookToken}`
    : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Settings className="h-6 w-6" /> Settings
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your business settings
          </p>
        </div>
        <Button size="sm" onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
          Save Changes
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Business Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Business Name
              </label>
              <Input
                value={settings.name}
                onChange={(e) => setSettings({ ...settings, name: e.target.value })}
                placeholder="Your Business Name"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Phone Number
              </label>
              <Input
                value={settings.phone}
                onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                placeholder="(555) 123-4567"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Email Address
              </label>
              <Input
                type="email"
                value={settings.email}
                onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                placeholder="contact@business.com"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Website
              </label>
              <Input
                value={settings.website}
                onChange={(e) => setSettings({ ...settings, website: e.target.value })}
                placeholder="https://yourbusiness.com"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              Address
            </label>
            <Textarea
              value={settings.address}
              onChange={(e) => setSettings({ ...settings, address: e.target.value })}
              placeholder="123 Main Street, Suite 100&#10;Phoenix, AZ 85001"
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {webhookUrl && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ExternalLink className="h-4 w-4" /> Vapi Voice Webhook
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground mb-3">
              Use this URL in your Vapi dashboard to connect AI voice agents to your business.
              This URL is unique to your account — keep it private.
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-muted px-3 py-2 rounded-md text-xs font-mono break-all">
                {webhookUrl}
              </code>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyWebhook}
                className="shrink-0"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}