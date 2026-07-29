"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import {
  Sparkles,
  Loader2,
  Save,
  Send,
  Plus,
  Trash2,
  MessageSquare,
  Bot,
  Terminal,
  Wand2,
} from "lucide-react";
import { useToast } from "@/components/toaster";

interface Template {
  category: string;
  label: string;
  services: string[];
  emergencyService: boolean;
  greetingMessage: string;
  serviceCount: number;
  faqCount: number;
}

interface AIConfig {
  systemPrompt: string;
  services: string;
  faqs: string;
  pricingGuidance: string;
  companyPolicies: string;
  serviceAreas: string;
  businessHours: string;
  greetingMessage: string;
  leadCollectionRules: string;
  appointmentBookingRules: string;
  responseStyle: string;
  escalationRules: string;
}

const DEFAULTS: AIConfig = {
  systemPrompt: "",
  services: "",
  faqs: "",
  pricingGuidance: "",
  companyPolicies: "",
  serviceAreas: "",
  businessHours: JSON.stringify(
    Array.from({ length: 7 }, (_, i) => ({
      day: ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"][i],
      open: i < 5 ? "09:00" : i === 5 ? "10:00" : "",
      close: i < 5 ? "17:00" : i === 5 ? "15:00" : "",
      closed: i === 6,
    }))
  ),
  greetingMessage: "Hello! How can I help you today?",
  leadCollectionRules: "",
  appointmentBookingRules: "",
  responseStyle: "",
  escalationRules: "",
};

export default function AiCommanderPage() {
  const { toast } = useToast();
  const [config, setConfig] = useState<AIConfig>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [applyingTemplate, setApplyingTemplate] = useState(false);

  // Personality sliders
  const [formality, setFormality] = useState(50);
  const [warmth, setWarmth] = useState(60);
  const [conciseness, setConciseness] = useState(50);

  // Editable lists
  const [servicesList, setServicesList] = useState<string[]>([""]);
  const [faqList, setFaqList] = useState<{ q: string; a: string }[]>([{ q: "", a: "" }]);

  // Test console
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // ── Load config & templates ──────────────────────────
  useEffect(() => {
    Promise.all([
      fetch("/api/ai/brain").then((r) => (r.ok ? r.json() : null)),
      fetch("/api/ai-templates").then((r) => (r.ok ? r.json() : null)),
    ]).then(([brainData, templateData]) => {
      if (brainData) {
        const parse = (v: string | null) => {
          if (!v) return "";
          try { const p = JSON.parse(v); return Array.isArray(p) ? p.join("\n") : ""; } catch { return ""; }
        };
        setConfig({
          systemPrompt: brainData.systemPrompt || "",
          services: brainData.services || "",
          faqs: brainData.faqs || "",
          pricingGuidance: brainData.pricingGuidance || brainData.companyPolicies || "",
          companyPolicies: brainData.companyPolicies || "",
          serviceAreas: brainData.serviceAreas || "",
          businessHours: brainData.businessHours || DEFAULTS.businessHours,
          greetingMessage: brainData.greetingMessage || DEFAULTS.greetingMessage,
          leadCollectionRules: brainData.leadCollectionRules || "",
          appointmentBookingRules: brainData.appointmentBookingRules || "",
          responseStyle: brainData.responseStyle || "",
          escalationRules: brainData.escalationRules || "",
        });
        // Parse services
        try {
          const svc = JSON.parse(brainData.services || "[]");
          setServicesList(Array.isArray(svc) && svc.length ? svc : [""]);
        } catch {
          setServicesList(brainData.services ? brainData.services.split("\n").filter(Boolean) : [""]);
        }
      }
      if (templateData?.templates) setTemplates(templateData.templates);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  // scroll messages
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  // ── Save config ──────────────────────────────────────
  const saveConfig = useCallback(async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/ai/brain", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...config,
          services: JSON.stringify(servicesList.filter(Boolean)),
          faqs: JSON.stringify(faqList.filter((f) => f.q && f.a)),
        }),
      });
      if (res.ok) {
        toast({ title: "Saved!", description: "AI configuration updated." });
      } else {
        toast({ title: "Error", description: "Failed to save.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to save.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }, [config, servicesList, faqList, toast]);

  // ── Apply template ───────────────────────────────────
  const applyTemplate = async (category: string) => {
    setApplyingTemplate(true);
    try {
      const res = await fetch("/api/ai-brain/apply-template", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category }),
      });
      if (res.ok) {
        const data = await res.json();
        setSelectedCategory(category);
        // Reload config
        const brainRes = await fetch("/api/ai/brain");
        if (brainRes.ok) {
          const brainData = await brainRes.json();
          setConfig({
            systemPrompt: brainData.systemPrompt || "",
            services: brainData.services || "",
            faqs: brainData.faqs || "",
            pricingGuidance: brainData.pricingGuidance || brainData.companyPolicies || "",
            companyPolicies: brainData.companyPolicies || "",
            serviceAreas: brainData.serviceAreas || "",
            businessHours: brainData.businessHours || DEFAULTS.businessHours,
            greetingMessage: brainData.greetingMessage || DEFAULTS.greetingMessage,
            leadCollectionRules: brainData.leadCollectionRules || "",
            appointmentBookingRules: brainData.appointmentBookingRules || "",
            responseStyle: brainData.responseStyle || "",
            escalationRules: brainData.escalationRules || "",
          });
          try {
            const svc = JSON.parse(brainData.services || "[]");
            setServicesList(Array.isArray(svc) && svc.length ? svc : [""]);
          } catch {
            setServicesList([""]);
          }
        }
        toast({ title: "Template Applied!", description: `AI configured for ${data.template}.` });
      } else {
        toast({ title: "Error", description: "Failed to apply template.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to apply template.", variant: "destructive" });
    } finally {
      setApplyingTemplate(false);
    }
  };

  // ── Test chat ────────────────────────────────────────
  const sendTestMessage = async () => {
    if (!inputValue.trim() || sending) return;
    const userMsg = inputValue.trim();
    setInputValue("");
    setMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setSending(true);
    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMsg, source: "ai-test" }),
      });
      if (res.ok) {
        const data = await res.json();
        setMessages((prev) => [...prev, { role: "assistant", content: data.response || "(no response)" }]);
      } else {
        setMessages((prev) => [...prev, { role: "assistant", content: "⚠️ Failed to get a response. Check your AI configuration." }]);
      }
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "⚠️ Connection error." }]);
    } finally {
      setSending(false);
    }
  };

  // ── Service list helpers ─────────────────────────────
  const addService = () => setServicesList((prev) => [...prev, ""]);
  const removeService = (i: number) => setServicesList((prev) => prev.filter((_, idx) => idx !== i));
  const updateService = (i: number, v: string) => {
    setServicesList((prev) => prev.map((s, idx) => (idx === i ? v : s)));
  };

  // ── FAQ helpers ──────────────────────────────────────
  const addFaq = () => setFaqList((prev) => [...prev, { q: "", a: "" }]);
  const removeFaq = (i: number) => setFaqList((prev) => prev.filter((_, idx) => idx !== i));

  // ── Loading ──────────────────────────────────────────
  if (loading) {
    return (
      <div className="p-6 space-y-6 animate-pulse">
        <div className="h-8 w-48 bg-slate-800 rounded" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {[1,2,3].map((i) => <div key={i} className="h-32 bg-slate-800 rounded-xl" />)}
        </div>
        <div className="h-96 bg-slate-800 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-500/25">
            <Terminal className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">AI Commander</h1>
            <p className="text-sm text-slate-400">Instruct your AI — it&apos;s your front-line agent</p>
          </div>
        </div>
        <Button onClick={saveConfig} disabled={saving} className="gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save Configuration
        </Button>
      </div>

      {/* Template Selector */}
      <Card className="border-slate-800 bg-slate-950/60">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Wand2 className="h-4 w-4 text-amber-400" />
            Choose Your AI Template
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {templates.map((t) => (
              <button
                key={t.category}
                onClick={() => applyTemplate(t.category)}
                disabled={applyingTemplate}
                className={`relative flex flex-col items-center gap-2 p-3 rounded-xl border text-sm transition-all duration-200 text-left ${
                  selectedCategory === t.category
                    ? "border-amber-500 bg-amber-500/10 text-white shadow-lg shadow-amber-500/10"
                    : "border-slate-700/50 bg-slate-900/50 text-slate-300 hover:border-slate-600 hover:bg-slate-800/50"
                }`}
              >
                <div className={`h-8 w-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                  selectedCategory === t.category ? "bg-amber-500 text-white" : "bg-slate-800 text-slate-400"
                }`}>
                  {t.label.slice(0, 2).toUpperCase()}
                </div>
                <span className="font-medium leading-tight text-center">{t.label}</span>
                <span className="text-[10px] text-slate-500">{t.serviceCount} services · {t.faqCount} FAQs</span>
                {applyingTemplate && selectedCategory === t.category && (
                  <Loader2 className="h-4 w-4 animate-spin absolute top-1 right-1 text-amber-400" />
                )}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Personality & Tone */}
      <Card className="border-slate-800 bg-slate-950/60">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4 text-purple-400" />
            Personality &amp; Tone
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { label: "Formality", value: formality, set: setFormality, left: "Casual", right: "Formal" },
              { label: "Warmth", value: warmth, set: setWarmth, left: "Neutral", right: "Empathetic" },
              { label: "Conciseness", value: conciseness, set: setConciseness, left: "Detailed", right: "Brief" },
            ].map((s) => (
              <div key={s.label} className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">{s.label}</span>
                  <span className="text-white font-mono">{s.value}%</span>
                </div>
                <Slider value={[s.value]} onValueChange={([v]) => s.set(v)} min={0} max={100} step={1} className="py-1" />
                <div className="flex justify-between text-[11px] text-slate-500">
                  <span>{s.left}</span>
                  <span>{s.right}</span>
                </div>
              </div>
            ))}
          </div>
          <div>
            <label className="text-sm font-medium text-slate-300 mb-1.5 block">System Prompt</label>
            <Textarea
              value={config.systemPrompt}
              onChange={(e) => setConfig((c) => ({ ...c, systemPrompt: e.target.value }))}
              placeholder="You are a friendly, knowledgeable assistant for..."
              rows={6}
              className="font-mono text-sm bg-slate-900/70 border-slate-700 resize-none"
            />
          </div>
        </CardContent>
      </Card>

      {/* Services & Pricing */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-slate-800 bg-slate-950/60">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Services</CardTitle>
              <Button variant="ghost" size="sm" onClick={addService} className="h-7 gap-1 text-xs">
                <Plus className="h-3 w-3" /> Add
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 max-h-72 overflow-y-auto">
            {servicesList.map((svc, i) => (
              <div key={i} className="flex gap-2">
                <Input
                  value={svc}
                  onChange={(e) => updateService(i, e.target.value)}
                  placeholder={`Service #${i + 1}`}
                  className="bg-slate-900/70 border-slate-700 h-9 text-sm"
                />
                <Button variant="ghost" size="icon" onClick={() => removeService(i)} className="h-9 w-9 shrink-0 text-slate-500 hover:text-red-400">
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-950/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Pricing Guidance</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={config.pricingGuidance}
              onChange={(e) => setConfig((c) => ({ ...c, pricingGuidance: e.target.value }))}
              placeholder="Furnace repair: $150-$600. AC replacement: $3,500-$7,500..."
              rows={8}
              className="bg-slate-900/70 border-slate-700 text-sm resize-none"
            />
          </CardContent>
        </Card>
      </div>

      {/* FAQs */}
      <Card className="border-slate-800 bg-slate-950/60">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Frequently Asked Questions</CardTitle>
            <Button variant="ghost" size="sm" onClick={addFaq} className="h-7 gap-1 text-xs">
              <Plus className="h-3 w-3" /> Add FAQ
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 max-h-96 overflow-y-auto">
          {faqList.map((faq, i) => (
            <div key={i} className="grid grid-cols-1 md:grid-cols-2 gap-2 p-3 rounded-lg bg-slate-900/50 border border-slate-800/50">
              <div>
                <label className="text-[11px] text-slate-500 mb-1 block">Question</label>
                <Input
                  value={faq.q}
                  onChange={(e) => setFaqList((prev) => prev.map((f, idx) => (idx === i ? { ...f, q: e.target.value } : f)))}
                  placeholder="How much does it cost?"
                  className="bg-slate-900/70 border-slate-700 h-8 text-sm"
                />
              </div>
              <div className="relative">
                <label className="text-[11px] text-slate-500 mb-1 block">Answer</label>
                <div className="flex gap-2">
                  <Input
                    value={faq.a}
                    onChange={(e) => setFaqList((prev) => prev.map((f, idx) => (idx === i ? { ...f, a: e.target.value } : f)))}
                    placeholder="Pricing varies..."
                    className="bg-slate-900/70 border-slate-700 h-8 text-sm flex-1"
                  />
                  <Button variant="ghost" size="icon" onClick={() => removeFaq(i)} className="h-8 w-8 shrink-0 text-slate-500 hover:text-red-400">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
          {faqList.length === 0 && (
            <p className="text-sm text-slate-500 text-center py-6">No FAQs yet. Add one to train your AI.</p>
          )}
        </CardContent>
      </Card>

      {/* Policies */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-slate-800 bg-slate-950/60">
          <CardHeader className="pb-3"><CardTitle className="text-base">Lead Collection Rules</CardTitle></CardHeader>
          <CardContent>
            <Textarea
              value={config.leadCollectionRules}
              onChange={(e) => setConfig((c) => ({ ...c, leadCollectionRules: e.target.value }))}
              placeholder="Collect: name, phone, email, service needed..."
              rows={5}
              className="bg-slate-900/70 border-slate-700 text-sm resize-none"
            />
          </CardContent>
        </Card>
        <Card className="border-slate-800 bg-slate-950/60">
          <CardHeader className="pb-3"><CardTitle className="text-base">Appointment Booking Rules</CardTitle></CardHeader>
          <CardContent>
            <Textarea
              value={config.appointmentBookingRules}
              onChange={(e) => setConfig((c) => ({ ...c, appointmentBookingRules: e.target.value }))}
              placeholder="Offer 2-hour windows. Confirm someone 18+ will be home..."
              rows={5}
              className="bg-slate-900/70 border-slate-700 text-sm resize-none"
            />
          </CardContent>
        </Card>
        <Card className="border-slate-800 bg-slate-950/60">
          <CardHeader className="pb-3"><CardTitle className="text-base">Escalation Rules</CardTitle></CardHeader>
          <CardContent>
            <Textarea
              value={config.escalationRules}
              onChange={(e) => setConfig((c) => ({ ...c, escalationRules: e.target.value }))}
              placeholder="Escalate to human when: price > $5,000, customer requests manager..."
              rows={5}
              className="bg-slate-900/70 border-slate-700 text-sm resize-none"
            />
          </CardContent>
        </Card>
        <Card className="border-slate-800 bg-slate-950/60">
          <CardHeader className="pb-3"><CardTitle className="text-base">Company Policies</CardTitle></CardHeader>
          <CardContent>
            <Textarea
              value={config.companyPolicies}
              onChange={(e) => setConfig((c) => ({ ...c, companyPolicies: e.target.value }))}
              placeholder="24-hour cancellation policy. Licensed and insured..."
              rows={5}
              className="bg-slate-900/70 border-slate-700 text-sm resize-none"
            />
          </CardContent>
        </Card>
      </div>

      {/* Greeting */}
      <Card className="border-slate-800 bg-slate-950/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Greeting Message</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3">
            <Textarea
              value={config.greetingMessage}
              onChange={(e) => setConfig((c) => ({ ...c, greetingMessage: e.target.value }))}
              rows={2}
              className="bg-slate-900/70 border-slate-700 text-sm resize-none flex-1"
            />
          </div>
          {config.greetingMessage && (
            <div className="p-4 rounded-xl bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20">
              <p className="text-xs text-slate-500 mb-1">Live Preview</p>
              <div className="flex gap-3 items-start">
                <div className="h-8 w-8 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0">
                  <Bot className="h-4 w-4 text-blue-400" />
                </div>
                <div className="bg-slate-800/80 rounded-2xl rounded-tl-sm px-4 py-2.5 text-sm text-slate-200">
                  {config.greetingMessage}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Test Console */}
      <Card className="border-slate-800 bg-slate-950/60">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <MessageSquare className="h-4 w-4 text-green-400" />
            Talk to Your AI
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 overflow-y-auto mb-3 space-y-3 p-3 rounded-lg bg-slate-900/50 border border-slate-800/50">
            {messages.length === 0 && (
              <div className="flex items-center justify-center h-full text-sm text-slate-500">
                Test your AI by sending a message below. Try: &ldquo;I need a price quote&rdquo;
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`flex gap-2 ${m.role === "user" ? "justify-end" : ""}`}>
                {m.role === "assistant" && (
                  <div className="h-7 w-7 rounded-full bg-green-500/20 flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="h-3.5 w-3.5 text-green-400" />
                  </div>
                )}
                <div
                  className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm ${
                    m.role === "user"
                      ? "bg-blue-500/20 text-blue-100 rounded-tr-sm"
                      : "bg-slate-800 text-slate-200 rounded-tl-sm"
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {sending && (
              <div className="flex gap-2">
                <div className="h-7 w-7 rounded-full bg-green-500/20 flex items-center justify-center shrink-0">
                  <Bot className="h-3.5 w-3.5 text-green-400" />
                </div>
                <div className="bg-slate-800 rounded-2xl rounded-tl-sm px-4 py-2 text-sm text-slate-400">
                  <Loader2 className="h-3.5 w-3.5 animate-spin inline mr-1" />
                  Thinking...
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
          <form
            onSubmit={(e) => { e.preventDefault(); sendTestMessage(); }}
            className="flex gap-2"
          >
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Type a test message..."
              className="bg-slate-900/70 border-slate-700 text-sm flex-1"
              disabled={sending}
            />
            <Button type="submit" size="icon" disabled={sending || !inputValue.trim()} className="shrink-0">
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
