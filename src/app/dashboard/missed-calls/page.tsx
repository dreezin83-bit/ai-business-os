"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Phone,
  PhoneForwarded,
  Copy,
  Check,
  Loader2,
  ArrowRight,
  ExternalLink,
  Settings,
  AlertCircle,
  BadgeCheck,
} from "lucide-react";
import { useToast } from "@/components/toaster";
import { cn } from "@/lib/utils";

interface Carrier {
  id: string;
  name: string;
  code: string;
}

interface PhoneNumber {
  id: string;
  number: string;
  provider: string;
}

interface BusinessSettings {
  id: string;
  name: string;
  voiceSetupReady?: boolean;
}

const WHERE_TO_ADD = [
  { label: "Google Business Profile", checked: false },
  { label: "Website", checked: false },
  { label: "Facebook", checked: false },
  { label: "Yard Signs", checked: false },
  { label: "Business Cards", checked: false },
  { label: "Marketing Materials", checked: false },
];

export default function MissedCallsPage() {
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [carriers, setCarriers] = useState<Carrier[]>([]);
  const [selectedCarrier, setSelectedCarrier] = useState<string>("");
  const [phoneNumbers, setPhoneNumbers] = useState<PhoneNumber[]>([]);
  const [settings, setSettings] = useState<BusinessSettings | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedNumber, setCopiedNumber] = useState(false);
  const [checklist, setChecklist] = useState(WHERE_TO_ADD);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        // Fetch carriers
        const carriersRes = await fetch("/api/carriers");
        if (carriersRes.ok) {
          const data = await carriersRes.json();
          setCarriers(Array.isArray(data) ? data : []);
        }

        // Fetch settings to get business ID for phone numbers
        const settingsRes = await fetch("/api/settings");
        if (settingsRes.ok) {
          const data = await settingsRes.json();
          setSettings(data);

          // Fetch phone numbers
          try {
            const phoneRes = await fetch(`/api/business/${data.id}/phone`);
            if (phoneRes.ok) {
              const phoneData = await phoneRes.json();
              setPhoneNumbers(Array.isArray(phoneData) ? phoneData : []);
            }
          } catch {
            // no numbers yet — fine
          }
        }
      } catch {
        // silently handle — page will show empty states
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const selectedCarrierData = carriers.find((c) => c.id === selectedCarrier);
  const aiNumber = phoneNumbers.length > 0 ? phoneNumbers[0].number : null;
  const hasVoiceSetup = settings?.voiceSetupReady || phoneNumbers.length > 0;

  const handleCopyCode = () => {
    if (!selectedCarrierData || !aiNumber) return;
    const code = selectedCarrierData.code.replace("{number}", aiNumber);
    navigator.clipboard.writeText(code).then(() => {
      setCopiedCode(true);
      toast("Forwarding code copied", "success");
      setTimeout(() => setCopiedCode(false), 2000);
    });
  };

  const handleCopyNumber = (num: string) => {
    navigator.clipboard.writeText(num).then(() => {
      setCopiedNumber(true);
      toast("Number copied", "success");
      setTimeout(() => setCopiedNumber(false), 2000);
    });
  };

  const toggleChecklist = (idx: number) => {
    setChecklist((prev) => prev.map((item, i) => (i === idx ? { ...item, checked: !item.checked } : item)));
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
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Phone className="h-6 w-6" /> Missed Calls
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Never miss a lead. Set up AI to answer calls you can't.
        </p>
      </div>

      {/* Option 1: Forward Missed Calls (Recommended) */}
      <Card className="relative overflow-hidden">
        {/* Recommended badge */}
        <div className="absolute top-0 right-0">
          <span className="inline-flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-medium px-3 py-1 rounded-bl-xl">
            <BadgeCheck className="h-3 w-3" /> Recommended
          </span>
        </div>

        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <PhoneForwarded className="h-4 w-4 text-emerald-400" />
            Forward Missed Calls from Your Number
          </CardTitle>
          <CardDescription className="text-white/40">
            Calls you answer go to you. Calls you miss go to the AI.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Carrier selector */}
          {carriers.length > 0 ? (
            <>
              <div>
                <label className="text-xs font-medium text-white/60 mb-1.5 block">
                  Select Your Carrier
                </label>
                <select
                  value={selectedCarrier}
                  onChange={(e) => setSelectedCarrier(e.target.value)}
                  className="glass-input h-10 appearance-none cursor-pointer"
                  style={{ WebkitAppearance: "none" }}
                >
                  <option value="" disabled className="bg-black">
                    Choose your carrier...
                  </option>
                  {carriers.map((c) => (
                    <option key={c.id} value={c.id} className="bg-black text-white">
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Forwarding code */}
              {selectedCarrierData && aiNumber && (
                <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-4 space-y-3">
                  <p className="text-xs text-white/50">
                    Dial this code to activate call forwarding:
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 bg-black/50 border border-white/[0.06] rounded-lg px-4 py-2.5 text-sm font-mono text-white/80">
                      {selectedCarrierData.code.replace("{number}", aiNumber)}
                    </code>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCopyCode}
                      className="shrink-0"
                    >
                      {copiedCode ? (
                        <Check className="h-4 w-4 text-emerald-400" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>

                  <div className="space-y-2 pt-2">
                    <p className="text-[11px] font-medium text-white/50 uppercase tracking-wider">
                      How to activate:
                    </p>
                    <div className="space-y-1.5">
                      <div className="flex items-start gap-2 text-sm text-white/60">
                        <span className="text-white/20 font-mono text-xs mt-0.5">1.</span>
                        Open your phone's dialer.
                      </div>
                      <div className="flex items-start gap-2 text-sm text-white/60">
                        <span className="text-white/20 font-mono text-xs mt-0.5">2.</span>
                        Dial <code className="mx-1 bg-white/[0.04] px-1.5 py-0.5 rounded text-xs font-mono text-white/80">
                          {selectedCarrierData.code.replace("{number}", aiNumber)}
                        </code>
                      </div>
                      <div className="flex items-start gap-2 text-sm text-white/60">
                        <span className="text-white/20 font-mono text-xs mt-0.5">3.</span>
                        Press Call. You'll hear a confirmation tone.
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {selectedCarrierData && !aiNumber && (
                <div className="bg-amber-500/5 border border-amber-500/10 rounded-xl p-4 flex items-start gap-3">
                  <AlertCircle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-amber-200/80 font-medium">No AI number yet</p>
                    <p className="text-xs text-amber-200/50 mt-0.5">
                      You need an AI phone number before setting up forwarding.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3"
                      onClick={() => (window.location.href = "/dashboard/settings")}
                    >
                      <Settings className="h-3.5 w-3.5 mr-1" />
                      Buy a Number
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-6 text-sm text-white/30">
              <Loader2 className="h-5 w-5 mx-auto mb-2 animate-spin" />
              Loading carriers...
            </div>
          )}
        </CardContent>
      </Card>

      {/* Option 2: Advertise AI Number Directly */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Phone className="h-4 w-4 text-blue-400" />
            Advertise Your AI Number
          </CardTitle>
          <CardDescription className="text-white/40">
            Publish this number anywhere — all calls go to the AI.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {hasVoiceSetup && aiNumber ? (
            <div className="space-y-5">
              {/* Number display */}
              <div className="flex items-center gap-3 bg-white/[0.03] border border-white/[0.06] rounded-xl px-5 py-4">
                <div className="h-10 w-10 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
                  <Phone className="h-4 w-4 text-blue-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-lg font-bold font-mono text-white tracking-wide">
                    {aiNumber}
                  </p>
                  <p className="text-[11px] text-white/30">Your AI phone number</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCopyNumber(aiNumber)}
                  className="shrink-0"
                >
                  {copiedNumber ? (
                    <Check className="h-4 w-4 text-emerald-400" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>

              {/* Where to add checklist */}
              <div>
                <p className="text-xs font-medium text-white/50 mb-3">
                  Add this number to:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {checklist.map((item, idx) => (
                    <button
                      key={item.label}
                      onClick={() => toggleChecklist(idx)}
                      className={cn(
                        "flex items-center gap-2.5 rounded-lg border px-3.5 py-2.5 text-sm transition-all duration-200 text-left",
                        item.checked
                          ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-300"
                          : "border-white/[0.06] bg-white/[0.02] text-white/50 hover:border-white/[0.1]"
                      )}
                    >
                      <div
                        className={cn(
                          "h-4 w-4 rounded border flex items-center justify-center shrink-0 transition-colors",
                          item.checked
                            ? "bg-emerald-500 border-emerald-500"
                            : "border-white/20"
                        )}
                      >
                        {item.checked && <Check className="h-2.5 w-2.5 text-white" />}
                      </div>
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="h-14 w-14 rounded-full bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mx-auto mb-4">
                <Phone className="h-6 w-6 text-white/20" />
              </div>
              <h3 className="text-base font-medium text-white/60 mb-2">No AI number yet</h3>
              <p className="text-sm text-white/30 mb-5 max-w-sm mx-auto">
                Purchase a phone number to let AI handle your calls automatically. It takes less than a minute.
              </p>
              <Button onClick={() => (window.location.href = "/dashboard/settings")}>
                <Settings className="h-4 w-4 mr-1.5" />
                Buy a Number
                <ArrowRight className="h-4 w-4 ml-1.5" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick tip */}
      <div className="flex items-start gap-3 bg-white/[0.02] border border-white/[0.06] rounded-xl p-4">
        <div className="h-8 w-8 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0 mt-0.5">
          <ExternalLink className="h-3.5 w-3.5 text-blue-400" />
        </div>
        <div>
          <p className="text-sm text-white/70 font-medium">Pro tip</p>
          <p className="text-xs text-white/40 mt-0.5">
            Add your AI number to your Google Business Profile and website first — those are where most customers find you.
          </p>
        </div>
      </div>
    </div>
  );
}
