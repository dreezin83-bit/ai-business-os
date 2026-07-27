"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Settings,
  Loader2,
  Save,
  Copy,
  Check,
  ExternalLink,
  Phone,
  Plus,
  Trash2,
  BadgeCheck,
} from "lucide-react";
import { useToast } from "@/components/toaster";

interface BusinessSettings {
  name: string;
  phone: string;
  email: string;
  website: string;
  address: string;
  vapiWebhookToken?: string;
  voiceSetupReady?: boolean;
}

interface PhoneNumber {
  id: string;
  businessId: string;
  vapiPhoneNumberId: string;
  number: string;
  serverUrl?: string;
  provider: string;
  createdAt: string;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<BusinessSettings>({
    name: "",
    phone: "",
    email: "",
    website: "",
    address: "",
    vapiWebhookToken: undefined,
    voiceSetupReady: false,
  });
  const [phoneNumbers, setPhoneNumbers] = useState<PhoneNumber[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [buying, setBuying] = useState(false);
  const [releasing, setReleasing] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchPhoneNumbers = useCallback(
    async (bizId: string) => {
      try {
        const res = await fetch(`/api/business/${bizId}/phone`);
        if (res.ok) {
          const data = await res.json();
          setPhoneNumbers(Array.isArray(data) ? data : []);
        }
      } catch {
        // silently fail — phone numbers are optional
      }
    },
    []
  );

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => (r.ok ? r.json() : Promise.reject("No settings")))
      .then((data) => {
        if (data && data.id) {
          setBusinessId(data.id);
          setSettings({
            name: data.name || "",
            phone: data.phone || "",
            email: data.email || "",
            website: data.website || "",
            address: data.address || "",
            vapiWebhookToken: data.vapiWebhookToken || undefined,
            voiceSetupReady: data.voiceSetupReady || false,
          });
          fetchPhoneNumbers(data.id);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [fetchPhoneNumbers]);

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

  const handleBuyNumber = async () => {
    if (!businessId) return;
    setBuying(true);
    try {
      const res = await fetch(`/api/business/${businessId}/phone`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to buy number");
      }
      const newNumber = await res.json();
      setPhoneNumbers((prev) => [...prev, newNumber]);
      setSettings((s) => ({ ...s, voiceSetupReady: true }));
      toast(`Phone number ${newNumber.number} purchased!`, "success");
    } catch (err: any) {
      toast(err.message || "Failed to buy phone number", "error");
    } finally {
      setBuying(false);
    }
  };

  const handleReleaseNumber = async (phoneId: string) => {
    if (!businessId) return;
    if (!confirm("Release this phone number? This cannot be undone from this dashboard.")) return;
    setReleasing(phoneId);
    try {
      const res = await fetch(`/api/business/${businessId}/phone`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumberId: phoneId }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to release number");
      }
      setPhoneNumbers((prev) => prev.filter((p) => p.id !== phoneId));
      toast("Phone number released", "success");
    } catch (err: any) {
      toast(err.message || "Failed to release phone number", "error");
    } finally {
      setReleasing(null);
    }
  };

  const handleCopyNumber = (number: string) => {
    navigator.clipboard.writeText(number).then(() => {
      toast("Number copied", "success");
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
            Manage your business settings and voice numbers
          </p>
        </div>
        <Button size="sm" onClick={handleSave} disabled={saving}>
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin mr-1" />
          ) : (
            <Save className="h-4 w-4 mr-1" />
          )}
          Save Changes
        </Button>
      </div>

      {/* Business Information */}
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
                onChange={(e) =>
                  setSettings({ ...settings, name: e.target.value })
                }
                placeholder="Your Business Name"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Phone Number
              </label>
              <Input
                value={settings.phone}
                onChange={(e) =>
                  setSettings({ ...settings, phone: e.target.value })
                }
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
                onChange={(e) =>
                  setSettings({ ...settings, email: e.target.value })
                }
                placeholder="contact@business.com"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Website
              </label>
              <Input
                value={settings.website}
                onChange={(e) =>
                  setSettings({ ...settings, website: e.target.value })
                }
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
              onChange={(e) =>
                setSettings({ ...settings, address: e.target.value })
              }
              placeholder="123 Main Street, Suite 100&#10;Phoenix, AZ 85001"
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Voice Phone Numbers */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Phone className="h-4 w-4" /> Voice Phone Numbers
            {settings.voiceSetupReady && (
              <span className="inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                <BadgeCheck className="h-3 w-3" /> Voice ready
              </span>
            )}
          </CardTitle>
          <Button
            size="sm"
            variant="outline"
            onClick={handleBuyNumber}
            disabled={buying}
          >
            {buying ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1" />
            ) : (
              <Plus className="h-4 w-4 mr-1" />
            )}
            Buy Number
          </Button>
        </CardHeader>
        <CardContent>
          {phoneNumbers.length === 0 ? (
            <div className="text-center py-6 text-sm text-muted-foreground">
              <Phone className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p>No voice numbers yet.</p>
              <p className="text-xs mt-1">
                Buy a number to receive AI-powered voice calls.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {phoneNumbers.map((pn) => (
                <div
                  key={pn.id}
                  className="flex items-center justify-between bg-muted/50 rounded-lg px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium font-mono">{pn.number}</p>
                      <p className="text-xs text-muted-foreground">
                        {pn.provider} · Added{" "}
                        {new Date(pn.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleCopyNumber(pn.number)}
                      title="Copy number"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-red-500 hover:text-red-600"
                      onClick={() => handleReleaseNumber(pn.id)}
                      disabled={releasing === pn.id}
                      title="Release number"
                    >
                      {releasing === pn.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Webhook URL */}
      {webhookUrl && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ExternalLink className="h-4 w-4" /> Vapi Voice Webhook
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground mb-3">
              Use this URL in your Vapi dashboard to connect AI voice agents to
              your business. This URL is unique to your account — keep it
              private.
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
