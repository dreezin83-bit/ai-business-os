"use client";

import { useEffect, useState } from "react";
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
  Phone,
  PhoneCall,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Bot,
  Calendar,
} from "lucide-react";
import { useToast } from "@/components/toaster";

interface BusinessSettings {
  name: string;
  phone: string;
  email: string;
  website: string;
  address: string;
}

interface SubscriptionInfo {
  active: boolean;
  plan?: string;
}

interface VoiceStatus {
  provisionState: string; // idle | provisioning | completed | failed
  assistantId: string | null;
  setupReady: boolean;
  provisionedAt: string | null;
  provisionError: string | null;
  phoneNumber: string | null;
  lastCallAt: string | null;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<BusinessSettings>({
    name: "",
    phone: "",
    email: "",
    website: "",
    address: "",
  });
  const [aiNumber, setAiNumber] = useState<string | null>(null);
  const [hasSubscription, setHasSubscription] = useState(false);
  const [subscriptionChecked, setSubscriptionChecked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copiedNumber, setCopiedNumber] = useState(false);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [voiceStatus, setVoiceStatus] = useState<VoiceStatus>({
    provisionState: "idle",
    assistantId: null,
    setupReady: false,
    provisionedAt: null,
    provisionError: null,
    phoneNumber: null,
    lastCallAt: null,
  });
  const { toast } = useToast();

  useEffect(() => {
    async function load() {
      try {
        const settingsRes = await fetch("/api/settings");
        if (settingsRes.ok) {
          const data = await settingsRes.json();
          if (data && data.id) {
            setBusinessId(data.id);
            setSettings({
              name: data.name || "",
              phone: data.phone || "",
              email: data.email || "",
              website: data.website || "",
              address: data.address || "",
            });
            // Capture voice status fields
            setVoiceStatus({
              provisionState: data.voiceProvisionState || "idle",
              assistantId: data.vapiAssistantId || null,
              setupReady: data.voiceSetupReady === true,
              provisionedAt: data.voiceProvisionedAt || null,
              provisionError: data.voiceProvisionError || null,
              phoneNumber: aiNumber, // will be set below
              lastCallAt: data.lastCallAt || null,
            });
          }
        }

        try {
          const subRes = await fetch("/api/subscription");
          if (subRes.ok) {
            const subData: SubscriptionInfo = await subRes.json();
            setHasSubscription(subData.active === true);
          }
        } catch {
          // silently fail
        }
        setSubscriptionChecked(true);

        try {
          const settingsData = await (await fetch("/api/settings")).json();
          if (settingsData?.id) {
            const phoneRes = await fetch(`/api/business/${settingsData.id}/phone`);
            if (phoneRes.ok) {
              const phoneData = await phoneRes.json();
              const numbers = Array.isArray(phoneData) ? phoneData : [];
              if (numbers.length > 0) {
                setAiNumber(numbers[0].number);
                setVoiceStatus(prev => ({ ...prev, phoneNumber: numbers[0].number }));
              }
            }
          }
        } catch {
          // no numbers yet
        }
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    }
    load();
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

  const handleCopyNumber = () => {
    if (!aiNumber) return;
    navigator.clipboard.writeText(aiNumber).then(() => {
      setCopiedNumber(true);
      toast("Number copied", "success");
      setTimeout(() => setCopiedNumber(false), 2000);
    });
  };

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

      {/* AI Voice Status */}
      {subscriptionChecked && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Bot className="h-4 w-4" /> AI Voice Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* No subscription */}
            {!hasSubscription ? (
              <div className="text-center py-6">
                <div className="h-12 w-12 rounded-full bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mx-auto mb-3">
                  <Phone className="h-5 w-5 text-white/15" />
                </div>
                <p className="text-sm text-white/30">
                  Available with a paid plan
                </p>
                <p className="text-xs text-white/20 mt-1">
                  Subscribe to get an AI phone number
                </p>
              </div>
            ) : voiceStatus.provisionState === "failed" ? (
              /* Failed provisioning */
              <div className="rounded-xl bg-red-500/5 border border-red-500/20 p-5">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
                    <XCircle className="h-5 w-5 text-red-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-red-300">Provisioning Failed</p>
                    <p className="text-xs text-red-200/60 mt-1">
                      {voiceStatus.provisionError || "An error occurred while setting up your AI voice number. Please contact support."}
                    </p>
                  </div>
                </div>
              </div>
            ) : voiceStatus.provisionState === "provisioning" || (!aiNumber && voiceStatus.provisionState !== "completed") ? (
              /* Provisioning in progress */
              <div className="text-center py-6">
                <div className="h-12 w-12 rounded-full bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mx-auto mb-3">
                  <Loader2 className="h-5 w-5 text-white/15 animate-spin" />
                </div>
                <p className="text-sm text-white/30">
                  Your AI number is being provisioned
                </p>
                <p className="text-xs text-white/20 mt-1">
                  This usually takes a few moments after subscribing
                </p>
              </div>
            ) : aiNumber || voiceStatus.phoneNumber ? (
              /* Active — full status card */
              <div className="space-y-4">
                {/* Phone Number */}
                <div className="flex items-center gap-4 bg-white/[0.03] border border-white/[0.06] rounded-xl px-5 py-4">
                  <div className="h-10 w-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                    <Phone className="h-4 w-4 text-emerald-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-lg font-bold font-mono text-white tracking-wide">
                      {aiNumber || voiceStatus.phoneNumber}
                    </p>
                    <p className="text-[11px] text-white/30">
                      Your AI receptionist number — active and ready
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopyNumber}
                    className="shrink-0"
                  >
                    {copiedNumber ? (
                      <Check className="h-4 w-4 text-emerald-400" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>

                {/* Status Grid */}
                <div className="grid grid-cols-2 gap-3">
                  {/* Provisioning Status */}
                  <div className="rounded-lg bg-white/[0.03] border border-white/[0.06] p-3">
                    <div className="flex items-center gap-2 mb-1">
                      {voiceStatus.setupReady ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                      ) : voiceStatus.provisionState === "completed" ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                      ) : (
                        <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
                      )}
                      <span className="text-[11px] text-white/35 uppercase tracking-wider">Status</span>
                    </div>
                    <p className="text-sm font-medium text-white">
                      {voiceStatus.setupReady ? "Ready" : voiceStatus.provisionState === "completed" ? "Active" : voiceStatus.provisionState}
                    </p>
                  </div>

                  {/* Provisioned At */}
                  <div className="rounded-lg bg-white/[0.03] border border-white/[0.06] p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Calendar className="h-3.5 w-3.5 text-white/25" />
                      <span className="text-[11px] text-white/35 uppercase tracking-wider">Provisioned</span>
                    </div>
                    <p className="text-sm font-medium text-white">
                      {voiceStatus.provisionedAt
                        ? new Date(voiceStatus.provisionedAt).toLocaleDateString()
                        : "—"}
                    </p>
                  </div>

                  {/* Assistant ID */}
                  <div className="rounded-lg bg-white/[0.03] border border-white/[0.06] p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Bot className="h-3.5 w-3.5 text-white/25" />
                      <span className="text-[11px] text-white/35 uppercase tracking-wider">Assistant ID</span>
                    </div>
                    <p className="text-xs font-mono text-white/60 truncate" title={voiceStatus.assistantId || ""}>
                      {voiceStatus.assistantId
                        ? voiceStatus.assistantId.length > 20
                          ? voiceStatus.assistantId.slice(0, 20) + "…"
                          : voiceStatus.assistantId
                        : "—"}
                    </p>
                  </div>

                  {/* Last Call */}
                  <div className="rounded-lg bg-white/[0.03] border border-white/[0.06] p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Clock className="h-3.5 w-3.5 text-white/25" />
                      <span className="text-[11px] text-white/35 uppercase tracking-wider">Last Call</span>
                    </div>
                    <p className="text-sm font-medium text-white">
                      {voiceStatus.lastCallAt
                        ? new Date(voiceStatus.lastCallAt).toLocaleString()
                        : "Never"}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              /* Idle — awaiting provisioning trigger */
              <div className="text-center py-6">
                <div className="h-12 w-12 rounded-full bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mx-auto mb-3">
                  <Bot className="h-5 w-5 text-white/15" />
                </div>
                <p className="text-sm text-white/30">
                  Voice setup not started
                </p>
                <p className="text-xs text-white/20 mt-1">
                  Complete onboarding to activate your AI voice
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
