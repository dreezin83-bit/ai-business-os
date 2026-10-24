"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  PhoneCall, Lock, Loader2, Volume2, Play, Save, CheckCircle2,
  AlertTriangle, Phone,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/toaster";

/**
 * VoicePage — consolidated AI Voice Call section (/dashboard/voice).
 *
 * Gating: voice is a paid-plan feature. The page calls /api/subscription and
 * shows the full UI behind a blurred lock overlay until a verified
 * subscription exists (hasSubscription === true). While the check is in
 * flight we never flash unlocked content.
 *
 * Backend hooks used (real, existing endpoints):
 *   GET  /api/voice/provision  — phone number + provisioning status
 *   POST /api/voice/provision  — trigger provisioning ("Get Phone Number")
 *   GET  /api/ai-calls         — recent call history
 * Greeting / objection / custom-rules + voice choice are configuration
 * blocks; they persist locally on this device until the voice config API
 * lands (Vapi assistant wiring is in flight on the architecture track).
 */

const VOICES = [
  { id: "sarah", name: "Sarah", desc: "Warm and friendly — great default for service businesses." },
  { id: "marcus", name: "Marcus", desc: "Professional baritone, polished and confident." },
  { id: "amelia", name: "Amelia", desc: "Bright and clear, energetic and approachable." },
  { id: "james", name: "James", desc: "Calm and reassuring — good for high-stress calls." },
  { id: "aisha", name: "Aisha", desc: "Natural and upbeat, easy to listen to." },
] as const;

const CONFIG_KEY = "sagenify.voice.config.v1";

interface ProvisionStatus {
  voiceSetupReady: boolean;
  phoneNumber: string | null;
  provisionError: string | null;
  canProvision: boolean;
}

interface CallRow {
  id: string;
  callId: string;
  customerPhone: string;
  status: string;
  outcome: string;
  createdAt: string;
}

const SAMPLE_LINE =
  "Thanks for calling! You have reached the team. How can we help you today?";

export default function VoicePage() {
  const { toast } = useToast();
  const [subChecked, setSubChecked] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [prov, setProv] = useState<ProvisionStatus | null>(null);
  const [calls, setCalls] = useState<CallRow[] | null>(null);
  const [provisioning, setProvisioning] = useState(false);
  const [saving, setSaving] = useState(false);

  const [greeting, setGreeting] = useState(
    "Hi, thanks for calling! You've reached us — how can we help you today?"
  );
  const [objections, setObjections] = useState("");
  const [customRules, setCustomRules] = useState("");
  const [voiceId, setVoiceId] = useState<string>("sarah");

  useEffect(() => {
    Promise.all([
      fetch("/api/subscription").then((r) => (r.ok ? r.json() : null)),
      fetch("/api/voice/provision").then((r) => (r.ok ? r.json() : null)),
      fetch("/api/ai-calls?limit=6").then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([sub, provision, recent]) => {
        setUnlocked(sub?.hasSubscription === true);
        setProv(provision);
        setCalls(Array.isArray(recent?.calls) ? recent.calls : Array.isArray(recent) ? recent : null);
        const saved = localStorage.getItem(CONFIG_KEY);
        if (saved) {
          try {
            const cfg = JSON.parse(saved);
            if (cfg.greeting) setGreeting(cfg.greeting);
            if (cfg.objections) setObjections(cfg.objections);
            if (cfg.customRules) setCustomRules(cfg.customRules);
            if (cfg.voiceId) setVoiceId(cfg.voiceId);
          } catch { /* ignore malformed local config */ }
        }
      })
      .catch(() => setUnlocked(false))
      .finally(() => setSubChecked(true));
  }, []);

  const playSample = () => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      toast("Speech preview isn't supported in this browser", "error");
      return;
    }
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(SAMPLE_LINE);
    u.rate = 1;
    u.pitch = voiceId === "marcus" ? 0.85 : voiceId === "aisha" ? 1.05 : 1;
    window.speechSynthesis.speak(u);
    toast("Playing a browser preview of your greeting", "success");
  };

  const getNumber = async () => {
    setProvisioning(true);
    try {
      const res = await fetch("/api/voice/provision", { method: "POST" });
      const data = await res.json();
      if (res.ok && data?.success) {
        toast("Phone number provisioning started", "success");
      } else {
        toast(data?.error || "Provisioning couldn't start — try again in a moment", "error");
      }
      const fresh = await fetch("/api/voice/provision").then((r) => (r.ok ? r.json() : null));
      if (fresh) setProv(fresh);
    } catch {
      toast("Failed to reach provisioning", "error");
    } finally {
      setProvisioning(false);
    }
  };

  const saveConfig = () => {
    setSaving(true);
    try {
      localStorage.setItem(CONFIG_KEY, JSON.stringify({ greeting, objections, customRules, voiceId }));
      toast("Voice settings saved on this device", "success");
    } catch {
      toast("Couldn't save settings", "error");
    } finally {
      setSaving(false);
    }
  };

  const statusBadge = prov?.phoneNumber ? (
    <Badge className="gap-1.5 bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
      <CheckCircle2 className="h-3 w-3" /> Line ready
    </Badge>
  ) : (
    <Badge className="gap-1.5 bg-amber-500/10 text-amber-300 border border-amber-500/30">
      <AlertTriangle className="h-3 w-3" /> Not provisioned
    </Badge>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight dash-heading">
          <PhoneCall className="h-6 w-6" /> AI Voice Call
        </h1>
        <p className="mt-1 text-sm dash-muted">
          Your AI receptionist answers, qualifies, and books — greeting,
          objections, custom rules, voice, and phone number in one place.
        </p>
      </div>

      <div className="relative">
        {/* Content (always mounted; blurred under the overlay while locked) */}
        <div className={`space-y-6 ${unlocked || !subChecked ? "" : "select-none"}`} aria-hidden={!unlocked}>
          {/* Phone number */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-purple-400" /> Phone Number
              </CardTitle>
            </CardHeader>
            <CardContent>
              {prov?.phoneNumber ? (
                <div className="flex flex-wrap items-center gap-3">
                  <p className="font-mono text-lg font-semibold text-[var(--dash-heading)]">
                    {prov.phoneNumber}
                  </p>
                  {statusBadge}
                </div>
              ) : (
                <div>
                  <p className="text-sm dash-muted mb-3">
                    {prov?.provisionError
                      ? `Provisioning hit a snag: ${prov.provisionError}`
                      : "No phone number yet. One tap provisions your dedicated AI line (requires a paid plan and completed onboarding)."}
                  </p>
                  <Button onClick={getNumber} disabled={provisioning || !!prov?.provisionError} className="gap-1.5">
                    {provisioning ? <Loader2 className="h-4 w-4 animate-spin" /> : <PhoneCall className="h-4 w-4" />}
                    {provisioning ? "Provisioning…" : "Get Phone Number"}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Voice options */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Sparkles className="h-4 w-4 text-purple-400" /> Choose a Voice
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-2 gap-3">
                {VOICES.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => setVoiceId(v.id)}
                    className={`text-left rounded-xl border p-3 transition-colors ${
                      voiceId === v.id
                        ? "border-purple-500/50 bg-purple-500/10"
                        : "border-[var(--dash-card-border)] hover:bg-[var(--dash-hover)]"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-[var(--dash-heading)]">{v.name}</span>
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={(e) => { e.stopPropagation(); playSample(); }}
                        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); playSample(); } }}
                        className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-[var(--dash-card-border-hover)] text-[var(--dash-muted)] hover:text-[var(--dash-heading)]"
                        title="Play sample"
                      >
                        <Play className="h-3 w-3" />
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] dash-muted leading-relaxed">{v.desc}</p>
                  </button>
                ))}
              </div>
              <p className="mt-2 text-[11px] dash-muted italic">
                <Volume2 className="mr-1 inline h-3 w-3" />
                Play uses your browser&apos;s speech preview. Your live line&apos;s voice is provisioned through Vapi.
              </p>
            </CardContent>
          </Card>

          {/* Conversation settings: greeting / objections / custom rules */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Sparkles className="h-4 w-4 text-purple-400" /> Conversation Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label htmlFor="voice-greeting" className="mb-1.5 block text-xs font-semibold text-[var(--dash-heading)]">
                  Greeting
                </label>
                <textarea
                  id="voice-greeting"
                  value={greeting}
                  onChange={(e) => setGreeting(e.target.value)}
                  rows={2}
                  className="w-full rounded-lg border border-[var(--dash-card-border)] bg-[var(--dash-card)] px-3 py-2 text-sm text-[var(--dash-heading)] focus:outline-none focus:border-purple-500/50"
                />
                <p className="mt-1 text-[11px] dash-muted">What callers hear the moment your line picks up.</p>
              </div>
              <div>
                <label htmlFor="voice-objections" className="mb-1.5 block text-xs font-semibold text-[var(--dash-heading)]">
                  Objection Handling
                </label>
                <textarea
                  id="voice-objections"
                  value={objections}
                  onChange={(e) => setObjections(e.target.value)}
                  rows={3}
                  placeholder={"e.g. \"We're too expensive\" → share value, offer a free estimate, and offer to book a callback."}
                  className="w-full rounded-lg border border-[var(--dash-card-border)] bg-[var(--dash-card)] px-3 py-2 text-sm text-[var(--dash-heading)] focus:outline-none focus:border-purple-500/50"
                />
              </div>
              <div>
                <label htmlFor="voice-rules" className="mb-1.5 block text-xs font-semibold text-[var(--dash-heading)]">
                  Custom Rules
                </label>
                <textarea
                  id="voice-rules"
                  value={customRules}
                  onChange={(e) => setCustomRules(e.target.value)}
                  rows={3}
                  placeholder={"e.g. Always confirm address and best time before ending the call. Never quote flat prices for repairs."}
                  className="w-full rounded-lg border border-[var(--dash-card-border)] bg-[var(--dash-card)] px-3 py-2 text-sm text-[var(--dash-heading)] focus:outline-none focus:border-purple-500/50"
                />
              </div>
              <div className="flex items-center gap-3">
                <Button onClick={saveConfig} disabled={saving} className="gap-1.5">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {saving ? "Saving…" : "Save Voice Settings"}
                </Button>
                <span className="text-[11px] dash-muted">
                  Saved on this device — server sync ships with the voice configuration API.
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Recent calls */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <PhoneCall className="h-4 w-4 text-purple-400" /> Recent Calls
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!calls ? (
                <p className="text-sm dash-muted">No calls yet — they&apos;ll appear here once your line is live.</p>
              ) : calls.length === 0 ? (
                <p className="text-sm dash-muted">No calls yet — they&apos;ll appear here once your line is live.</p>
              ) : (
                <ul className="divide-y divide-[var(--dash-card-border)]">
                  {calls.map((c) => (
                    <li key={c.id} className="flex flex-wrap items-center gap-2 py-2.5">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-[var(--dash-heading)] truncate">{c.customerPhone || c.callId}</p>
                        <p className="text-[11px] dash-muted">
                          {new Date(c.createdAt).toLocaleString()} · {c.status}
                        </p>
                      </div>
                      <Badge variant={c.outcome === "appointment_booked" ? "default" : "secondary"} className="text-[10px]">
                        {c.outcome || "unknown"}
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Lock overlay — paid plan required */}
        {!unlocked && (
          <div className="absolute inset-0 z-20 flex items-center justify-center rounded-2xl bg-black/60 backdrop-blur-md border border-[var(--dash-card-border)]">
            <div className="mx-auto max-w-sm px-6 text-center">
              {!subChecked ? (
                <>
                  <Loader2 className="mx-auto h-8 w-8 animate-spin text-purple-400" />
                  <p className="mt-3 text-sm font-medium text-white">Checking your subscription…</p>
                </>
              ) : (
                <>
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-purple-500/30 bg-purple-500/15">
                    <Lock className="h-6 w-6 text-purple-300" />
                  </div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-purple-300">
                    Paid plan required
                  </p>
                  <h2 className="mt-3 text-xl font-bold leading-snug text-white">
                    Unlock 24/7 AI Phone Receptionist with a Paid Plan
                  </h2>
                  <p className="mt-2 text-sm text-white/60 leading-relaxed">
                    AI Voice Calling is included with your paid Sagenify plan.
                    Your free trial covers AI chat — voice unlocks with your
                    first paid month.
                  </p>
                  <Link
                    href="/dashboard/settings"
                    className="mt-5 inline-flex h-10 items-center gap-1.5 rounded-full bg-purple-500 px-6 text-sm font-semibold text-white transition-colors hover:bg-purple-400"
                  >
                    Upgrade to Unlock Voice <span aria-hidden>→</span>
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}