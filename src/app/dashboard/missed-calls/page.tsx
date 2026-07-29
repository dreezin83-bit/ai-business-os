"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  PhoneForwarded,
  Copy,
  Check,
  Loader2,
  Phone,
} from "lucide-react";
import { useToast } from "@/components/toaster";

interface Carrier {
  id: string;
  name: string;
  code: string;
}

interface PhoneNumber {
  id: string;
  number: string;
}

export default function MissedCallsPage() {
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [carriers, setCarriers] = useState<Carrier[]>([]);
  const [selectedCarrier, setSelectedCarrier] = useState<string>("");
  const [aiNumber, setAiNumber] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const carriersRes = await fetch("/api/carriers");
        if (carriersRes.ok) {
          const data = await carriersRes.json();
          setCarriers(Array.isArray(data) ? data : []);
        }

        const settingsRes = await fetch("/api/settings");
        if (settingsRes.ok) {
          const data = await settingsRes.json();
          if (data?.id) {
            try {
              const phoneRes = await fetch(`/api/business/${data.id}/phone`);
              if (phoneRes.ok) {
                const phoneData = await phoneRes.json();
                const numbers = Array.isArray(phoneData) ? phoneData : [];
                if (numbers.length > 0) {
                  setAiNumber(numbers[0].number);
                }
              }
            } catch {
              // no numbers
            }
          }
        }
      } catch {
        // silently handle
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const selectedCarrierData = carriers.find((c) => c.id === selectedCarrier);
  const forwardingCode =
    selectedCarrierData && aiNumber
      ? selectedCarrierData.code.replace("{number}", aiNumber)
      : null;

  const handleCopyCode = () => {
    if (!forwardingCode) return;
    navigator.clipboard.writeText(forwardingCode).then(() => {
      setCopiedCode(true);
      toast("Forwarding code copied", "success");
      setTimeout(() => setCopiedCode(false), 2000);
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
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <PhoneForwarded className="h-6 w-6" /> Call Forwarding Setup
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Forward calls you miss to your AI receptionist — so you never lose a lead.
        </p>
      </div>

      {/* No AI number state */}
      {!aiNumber && (
        <Card>
          <CardContent className="flex flex-col items-center text-center py-10">
            <div className="h-14 w-14 rounded-full bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mx-auto mb-4">
              <Phone className="h-6 w-6 text-white/15" />
            </div>
            <h3 className="text-base font-medium text-white/50 mb-2">
              No AI phone number yet
            </h3>
            <p className="text-sm text-white/30 max-w-sm">
              You'll get an AI phone number after subscribing. Then you can set up call forwarding here.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Forwarding setup */}
      {aiNumber && carriers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Forward Calls to Your AI</CardTitle>
            <CardDescription className="text-white/40">
              Calls you answer go to you. Calls you miss go to the AI.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* AI number display */}
            <div className="flex items-center gap-3 bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-3">
              <div className="h-9 w-9 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                <Phone className="h-3.5 w-3.5 text-emerald-400" />
              </div>
              <div>
                <p className="text-xs text-white/30">Your AI number</p>
                <p className="text-sm font-semibold font-mono text-white">{aiNumber}</p>
              </div>
            </div>

            {/* Carrier selector */}
            <div>
              <label className="text-xs font-medium text-white/60 mb-1.5 block">
                Select Your Carrier
              </label>
              <select
                value={selectedCarrier}
                onChange={(e) => setSelectedCarrier(e.target.value)}
                className="glass-input h-10 appearance-none cursor-pointer w-full"
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
            {forwardingCode && (
              <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-5 space-y-4">
                <div>
                  <p className="text-xs text-white/40 mb-2">
                    Your forwarding code:
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 bg-black/50 border border-white/[0.06] rounded-lg px-4 py-3 text-base font-mono font-bold text-white tracking-wider text-center select-all">
                      {forwardingCode}
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
                </div>

                {/* Step-by-step */}
                <div className="border-t border-white/[0.06] pt-4 space-y-3">
                  <p className="text-xs font-semibold text-white/40 uppercase tracking-wider">
                    How to activate
                  </p>

                  <div className="flex items-start gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-xs font-medium text-white/50">
                      1
                    </span>
                    <p className="text-sm text-white/70 pt-0.5">
                      Open your phone's dialer app.
                    </p>
                  </div>

                  <div className="flex items-start gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-xs font-medium text-white/50">
                      2
                    </span>
                    <div className="pt-0.5">
                      <p className="text-sm text-white/70">
                        Dial{" "}
                        <code className="bg-white/[0.06] px-1.5 py-0.5 rounded text-xs font-mono text-white/90 font-semibold">
                          {forwardingCode}
                        </code>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-xs font-medium text-white/50">
                      3
                    </span>
                    <p className="text-sm text-white/70 pt-0.5">
                      Press Call. You'll hear a confirmation tone after a few seconds.
                    </p>
                  </div>

                  <div className="flex items-start gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-xs font-medium text-white/50">
                      4
                    </span>
                    <p className="text-sm text-white/70 pt-0.5">
                      That's it! Calls you don't answer will now be forwarded to your AI receptionist.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Carriers loading */}
      {aiNumber && carriers.length === 0 && (
        <Card>
          <CardContent className="flex items-center justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-white/20" />
            <span className="ml-2 text-sm text-white/30">Loading carriers...</span>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
