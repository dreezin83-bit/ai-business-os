"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import {
  Bot, Loader2, Save, Send, Wand2, AlertTriangle, X, CheckCircle2,
  Building2, Plus, Trash2, MessageSquare, Sparkles, BookOpen,
} from "lucide-react";
import { useToast } from "@/components/toaster";
import { ErrorBoundary } from "@/components/error-boundary";
import Link from "next/link";

const WARNING_DISMISS_KEY = "ai-brain-warning-dismissed";

interface BusinessInfo {
  name: string; phone: string; email: string; website: string;
}

interface Template {
  category: string; label: string; services: string[];
  emergencyService: boolean; greetingMessage: string;
  serviceCount: number; faqCount: number;
}

interface AIConfig {
  systemPrompt: string; services: string; faqs: string;
  pricingGuidance: string; companyPolicies: string;
  serviceAreas: string; businessHours: string;
  greetingMessage: string; leadCollectionRules: string;
  appointmentBookingRules: string; responseStyle: string;
  escalationRules: string;
}

const DEFAULTS: AIConfig = {
  systemPrompt: "", services: "", faqs: "",
  pricingGuidance: "", companyPolicies: "", serviceAreas: "",
  businessHours: JSON.stringify(
    Array.from({ length: 7 }, (_, i) => ({
      day: ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"][i],
      open: i < 5 ? "09:00" : i === 5 ? "10:00" : "",
      close: i < 5 ? "17:00" : i === 5 ? "15:00" : "",
      closed: i === 6,
    }))
  ),
  greetingMessage: "Hello! How can I help you today?",
  leadCollectionRules: "", appointmentBookingRules: "",
  responseStyle: "", escalationRules: "",
};

function AiBrainContent() {
  const { toast } = useToast();
  const [config, setConfig] = useState<AIConfig>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [applyingTemplate, setApplyingTemplate] = useState(false);
  const [businessInfo, setBusinessInfo] = useState<BusinessInfo>({ name: "", phone: "", email: "", website: "" });
  const [warningDismissed, setWarningDismissed] = useState(false);

  // Section refs
  const pricingRef = useRef<HTMLDivElement>(null);
  const servicesRef = useRef<HTMLDivElement>(null);
  const greetingRef = useRef<HTMLDivElement>(null);
  const policiesRef = useRef<HTMLDivElement>(null);

  // Personality sliders
  const [formality, setFormality] = useState(50);
  const [warmth, setWarmth] = useState(60);
  const [conciseness, setConciseness] = useState(50);

  // Editable lists
  const [servicesList, setServicesList] = useState<string[]>([""]);
  const [faqList, setFaqList] = useState<{ q: string; a: string }[]>([{ q: "", a: "" }]);

  // Test chat
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // ── Load ──────────────────────────────────────────
  useEffect(() => {
    try {
      if (typeof window !== "undefined" && localStorage.getItem(WARNING_DISMISS_KEY) === "1") {
        setWarningDismissed(true);
      }
    } catch {}

    Promise.all([
      fetch("/api/ai/brain").then((r) => (r.ok ? r.json() : null)),
      fetch("/api/ai-templates").then((r) => (r.ok ? r.json() : null)),
      fetch("/api/business/current").then((r) => (r.ok ? r.json() : null)),
    ]).then(([brainData, templateData, bizData]) => {
      if (brainData) {
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
          setServicesList(brainData.services ? brainData.services.split("\n").filter(Boolean) : [""]);
        }
      }
      if (templateData?.templates) setTemplates(templateData.templates);
      if (bizData) setBusinessInfo({ name: bizData.name || "", phone: bizData.phone || "", email: bizData.email || "", website: bizData.website || "" });
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  // Derived state
  const dismissWarning = () => { setWarningDismissed(true); try { localStorage.setItem(WARNING_DISMISS_KEY, "1"); } catch {} };
  const scrollTo = (ref: React.RefObject<HTMLDivElement | null>) => ref.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  const showWarning = !warningDismissed && (!config.pricingGuidance?.trim() || !config.serviceAreas?.trim());
  const hasPricing = !!config.pricingGuidance?.trim();
  const hasServiceAreas = !!config.serviceAreas?.trim();
  const hasBusinessHours = (() => {
    try { const h = JSON.parse(config.businessHours || "[]"); return Array.isArray(h) && h.some((d: any) => !d.closed); } catch { return false; }
  })();

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  // ── Save ──────────────────────────────────────────
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
      if (res.ok) toast({ title: "Saved!", description: "AI configuration updated." });
      else toast({ title: "Error", description: "Failed to save.", variant: "destructive" });
    } catch { toast({ title: "Error", description: "Failed to save.", variant: "destructive" }); }
    finally { setSaving(false); }
  }, [config, servicesList, faqList, toast]);

  // ── Template ──────────────────────────────────────
  const applyTemplate = async (category: string) => {
    setApplyingTemplate(true);
    try {
      const res = await fetch("/api/ai-brain/apply-template", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category }),
      });
      if (res.ok) {
        setSelectedCategory(category);
        const brainRes = await fetch("/api/ai/brain");
        if (brainRes.ok) {
          const brainData = await brainRes.json();
          setConfig({
            systemPrompt: brainData.systemPrompt || "", services: brainData.services || "",
            faqs: brainData.faqs || "", pricingGuidance: brainData.pricingGuidance || "",
            companyPolicies: brainData.companyPolicies || "", serviceAreas: brainData.serviceAreas || "",
            businessHours: brainData.businessHours || DEFAULTS.businessHours,
            greetingMessage: brainData.greetingMessage || DEFAULTS.greetingMessage,
            leadCollectionRules: brainData.leadCollectionRules || "",
            appointmentBookingRules: brainData.appointmentBookingRules || "",
            responseStyle: brainData.responseStyle || "", escalationRules: brainData.escalationRules || "",
          });
          try { const svc = JSON.parse(brainData.services || "[]"); setServicesList(Array.isArray(svc) && svc.length ? svc : [""]); } catch { setServicesList([""]); }
        }
        toast({ title: "Template Applied!", description: "AI configured — review and save." });
      } else toast({ title: "Error", description: "Failed to apply template.", variant: "destructive" });
    } catch { toast({ title: "Error", description: "Failed to apply template.", variant: "destructive" }); }
    finally { setApplyingTemplate(false); }
  };

  // ── Chat ──────────────────────────────────────────
  const sendTestMessage = async () => {
    if (!inputValue.trim() || sending) return;
    const userMsg = inputValue.trim();
    setInputValue("");
    setMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setSending(true);
    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMsg, conversationId, source: "dashboard" }),
      });
      if (res.ok) {
        const data = await res.json();
        setMessages((prev) => [...prev, { role: "assistant", content: data.response || "(no response)" }]);
        if (data.conversationId) setConversationId(data.conversationId);
      } else {
        setMessages((prev) => [...prev, { role: "assistant", content: "⚠️ Failed to get a response." }]);
      }
    } catch { setMessages((prev) => [...prev, { role: "assistant", content: "⚠️ Connection error." }]); }
    finally { setSending(false); }
  };

  const handleNewChat = () => { setMessages([]); setConversationId(null); setInputValue(""); };

  // ── Services ──────────────────────────────────────
  const addService = () => setServicesList((prev) => [...prev, ""]);
  const removeService = (i: number) => setServicesList((prev) => prev.filter((_, idx) => idx !== i));
  const updateService = (i: number, v: string) => setServicesList((prev) => prev.map((s, idx) => (idx === i ? v : s)));

  // ── FAQs ──────────────────────────────────────────
  const addFaq = () => setFaqList((prev) => [...prev, { q: "", a: "" }]);
  const removeFaq = (i: number) => setFaqList((prev) => prev.filter((_, idx) => idx !== i));

  const hours = (() => {
    try { const h = JSON.parse(config.businessHours || "[]"); return Array.isArray(h) ? h : JSON.parse(DEFAULTS.businessHours); }
    catch { return JSON.parse(DEFAULTS.businessHours); }
  })();

  // ── Loading ───────────────────────────────────────
  if (loading) {
    return (
      <div className="p-6 space-y-6 animate-pulse">
        <div className="h-8 w-48 bg-white/[0.06] rounded" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {[1,2,3].map((i) => <div key={i} className="h-32 bg-white/[0.04] rounded-xl" />)}
        </div>
        <div className="h-96 bg-white/[0.04] rounded-xl" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/25">
            <Bot className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">AI Brain</h1>
            <p className="text-sm text-slate-400">Complete AI configuration center</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Link href="/dashboard/knowledge-base">
            <Button variant="outline" size="sm"><BookOpen className="h-4 w-4 mr-1.5" /> Knowledge Base</Button>
          </Link>
          <Button onClick={saveConfig} disabled={saving} className="gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Configuration
          </Button>
        </div>
      </div>

      {/* ── Warning Banner ────────────────────────────────── */}
      {showWarning && (
        <div className="flex items-start gap-3 bg-amber-500/5 border border-amber-500/20 rounded-xl p-4 animate-scale-in">
          <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-amber-200/90 mb-2">To get the best performance, make sure to:</p>
            <ul className="space-y-1.5 text-sm text-amber-200/60">
              {!hasPricing && <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-amber-400 shrink-0" /> Set your <button onClick={() => scrollTo(pricingRef)} className="underline underline-offset-2 hover:text-amber-200 font-medium">pricing</button> (the AI needs price ranges)</li>}
              {!hasServiceAreas && <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-amber-400 shrink-0" /> Add your <button onClick={() => scrollTo(servicesRef)} className="underline underline-offset-2 hover:text-amber-200 font-medium">service locations</button></li>}
              {!hasBusinessHours && <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-amber-400 shrink-0" /> Configure <button onClick={() => scrollTo(policiesRef)} className="underline underline-offset-2 hover:text-amber-200 font-medium">business hours</button></li>}
            </ul>
          </div>
          <button onClick={dismissWarning} className="shrink-0 text-amber-400/60 hover:text-amber-400 transition-colors p-1" aria-label="Dismiss"><X className="h-4 w-4" /></button>
        </div>
      )}

      {/* ── Business Profile Card ─────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base"><Building2 className="h-4 w-4 text-blue-400" /> What Your AI Knows</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2.5">
            {[
              { label: "Business Name", filled: !!businessInfo.name, value: businessInfo.name || "Not set" },
              { label: "Phone Number", filled: !!businessInfo.phone, value: businessInfo.phone || "Not set" },
              { label: "Email", filled: !!businessInfo.email, value: businessInfo.email || "Not set" },
              { label: "Website", filled: !!businessInfo.website, value: businessInfo.website || "Not set" },
              { label: "Service Areas", filled: hasServiceAreas, value: hasServiceAreas ? config.serviceAreas : "Not set", action: hasServiceAreas ? undefined : () => scrollTo(servicesRef) },
              { label: "Business Hours", filled: hasBusinessHours, value: hasBusinessHours ? "Configured" : "Not set", action: hasBusinessHours ? undefined : () => scrollTo(policiesRef) },
              { label: "Pricing", filled: hasPricing, value: hasPricing ? "Configured" : "Not set", action: hasPricing ? undefined : () => scrollTo(pricingRef) },
            ].map((field) => (
              <div key={field.label} className="flex items-center gap-2.5 py-1.5">
                {field.filled ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" /> : <AlertTriangle className="h-3.5 w-3.5 text-amber-400 shrink-0" />}
                <span className="text-xs text-white/35 w-28 shrink-0">{field.label}</span>
                {field.action ? <button onClick={field.action} className="text-xs text-amber-400/80 hover:text-amber-300 underline underline-offset-2 truncate text-left">{field.value}</button>
                  : <span className={`text-xs truncate ${field.filled ? "text-white/60" : "text-white/25"}`}>{field.value}</span>}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ── Template Selector ─────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base"><Wand2 className="h-4 w-4 text-amber-400" /> Industry Template</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {templates.map((t) => (
              <button key={t.category} onClick={() => applyTemplate(t.category)} disabled={applyingTemplate}
                className={`relative flex flex-col items-center gap-2 p-3 rounded-xl border text-sm transition-all duration-200 text-left ${
                  selectedCategory === t.category ? "border-amber-500 bg-amber-500/10 text-white shadow-lg shadow-amber-500/10"
                    : "border-white/[0.06] bg-white/[0.02] text-slate-300 hover:border-white/[0.12] hover:bg-white/[0.04]"}`}>
                <div className={`h-8 w-8 rounded-lg flex items-center justify-center text-xs font-bold ${selectedCategory === t.category ? "bg-amber-500 text-white" : "bg-white/[0.06] text-slate-400"}`}>
                  {t.label.slice(0, 2).toUpperCase()}
                </div>
                <span className="font-medium leading-tight text-center">{t.label}</span>
                <span className="text-[10px] text-slate-500">{t.serviceCount} services · {t.faqCount} FAQs</span>
                {applyingTemplate && selectedCategory === t.category && <Loader2 className="h-4 w-4 animate-spin absolute top-1 right-1 text-amber-400" />}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ── Personality & Tone ────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base"><Sparkles className="h-4 w-4 text-purple-400" /> Personality &amp; Tone</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { label: "Formality", value: formality, set: setFormality, left: "Casual", right: "Formal" },
              { label: "Warmth", value: warmth, set: setWarmth, left: "Neutral", right: "Empathetic" },
              { label: "Conciseness", value: conciseness, set: setConciseness, left: "Detailed", right: "Brief" },
            ].map((s) => (
              <div key={s.label} className="space-y-2">
                <div className="flex justify-between text-sm"><span className="text-slate-400">{s.label}</span><span className="text-white font-mono">{s.value}%</span></div>
                <Slider value={[s.value]} onValueChange={([v]) => s.set(v)} min={0} max={100} step={1} className="py-1" />
                <div className="flex justify-between text-[11px] text-slate-500"><span>{s.left}</span><span>{s.right}</span></div>
              </div>
            ))}
          </div>
          <div>
            <label className="text-sm font-medium text-slate-300 mb-1.5 block">System Prompt</label>
            <Textarea value={config.systemPrompt} onChange={(e) => setConfig((c) => ({ ...c, systemPrompt: e.target.value }))}
              placeholder="You are a friendly, knowledgeable assistant for..." rows={6} className="font-mono text-sm resize-none" />
          </div>
        </CardContent>
      </Card>

      {/* ── Services & Pricing ────────────────────────────── */}
      <div ref={servicesRef} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Services</CardTitle>
              <Button variant="ghost" size="sm" onClick={addService} className="h-7 gap-1 text-xs"><Plus className="h-3 w-3" /> Add</Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 max-h-72 overflow-y-auto">
            {servicesList.map((svc, i) => (
              <div key={i} className="flex gap-2">
                <Input value={svc} onChange={(e) => updateService(i, e.target.value)} placeholder={`Service #${i + 1}`} className="h-9 text-sm" />
                <Button variant="ghost" size="icon" onClick={() => removeService(i)} className="h-9 w-9 shrink-0 text-slate-500 hover:text-red-400"><Trash2 className="h-3.5 w-3.5" /></Button>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card ref={pricingRef}>
          <CardHeader className="pb-3"><CardTitle className="text-base">Pricing Guidance</CardTitle></CardHeader>
          <CardContent>
            <Textarea value={config.pricingGuidance} onChange={(e) => setConfig((c) => ({ ...c, pricingGuidance: e.target.value }))}
              placeholder="Furnace repair: $150-$600. AC replacement: $3,500-$7,500..." rows={8} className="text-sm resize-none" />
          </CardContent>
        </Card>
      </div>

      {/* ── FAQs ──────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Frequently Asked Questions</CardTitle>
            <Button variant="ghost" size="sm" onClick={addFaq} className="h-7 gap-1 text-xs"><Plus className="h-3 w-3" /> Add FAQ</Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 max-h-96 overflow-y-auto">
          {faqList.map((faq, i) => (
            <div key={i} className="grid grid-cols-1 md:grid-cols-2 gap-2 p-3 rounded-lg bg-white/[0.03] border border-white/[0.05]">
              <div>
                <label className="text-[11px] text-slate-500 mb-1 block">Question</label>
                <Input value={faq.q} onChange={(e) => setFaqList((prev) => prev.map((f, idx) => (idx === i ? { ...f, q: e.target.value } : f)))}
                  placeholder="How much does it cost?" className="h-8 text-sm" />
              </div>
              <div>
                <label className="text-[11px] text-slate-500 mb-1 block">Answer</label>
                <div className="flex gap-2">
                  <Input value={faq.a} onChange={(e) => setFaqList((prev) => prev.map((f, idx) => (idx === i ? { ...f, a: e.target.value } : f)))}
                    placeholder="Pricing varies..." className="h-8 text-sm flex-1" />
                  <Button variant="ghost" size="icon" onClick={() => removeFaq(i)} className="h-8 w-8 shrink-0 text-slate-500 hover:text-red-400"><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              </div>
            </div>
          ))}
          {faqList.length === 0 && <p className="text-sm text-slate-500 text-center py-6">No FAQs yet. Add one to train your AI.</p>}
        </CardContent>
      </Card>

      {/* ── Policies ──────────────────────────────────────── */}
      <div ref={policiesRef} className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[
          { label: "Lead Collection Rules", key: "leadCollectionRules" as const, placeholder: "Collect: name, phone, email, service needed..." },
          { label: "Appointment Booking Rules", key: "appointmentBookingRules" as const, placeholder: "Offer 2-hour windows. Confirm someone 18+ will be home..." },
          { label: "Escalation Rules", key: "escalationRules" as const, placeholder: "Escalate to human when: price > $5,000..." },
          { label: "Company Policies", key: "companyPolicies" as const, placeholder: "24-hour cancellation policy. Licensed and insured..." },
          { label: "Service Areas", key: "serviceAreas" as const, placeholder: "Phoenix, AZ · Scottsdale, AZ · Tempe, AZ" },
          { label: "Response Style", key: "responseStyle" as const, placeholder: "Be professional and friendly. Use emojis sparingly." },
        ].map((p) => (
          <Card key={p.key}>
            <CardHeader className="pb-3"><CardTitle className="text-base">{p.label}</CardTitle></CardHeader>
            <CardContent>
              <Textarea value={config[p.key]} onChange={(e) => setConfig((c) => ({ ...c, [p.key]: e.target.value }))}
                placeholder={p.placeholder} rows={5} className="text-sm resize-none" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Greeting ──────────────────────────────────────── */}
      <Card ref={greetingRef}>
        <CardHeader className="pb-3"><CardTitle className="text-base">Greeting Message</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <Textarea value={config.greetingMessage} onChange={(e) => setConfig((c) => ({ ...c, greetingMessage: e.target.value }))} rows={2} className="text-sm resize-none" />
          {config.greetingMessage && (
            <div className="p-4 rounded-xl bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20">
              <p className="text-xs text-slate-500 mb-1">Live Preview</p>
              <div className="flex gap-3 items-start">
                <div className="h-8 w-8 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0"><Bot className="h-4 w-4 text-blue-400" /></div>
                <div className="bg-slate-800/80 rounded-2xl rounded-tl-sm px-4 py-2.5 text-sm text-slate-200">{config.greetingMessage}</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Business Hours ────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Business Hours</CardTitle></CardHeader>
        <CardContent>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {hours.map((h: any, i: number) => (
              <div key={h.day} className="flex items-center gap-2 p-2 rounded-lg bg-white/[0.03]">
                <span className="text-sm w-24 shrink-0">{h.day}</span>
                <input type="checkbox" checked={!h.closed} onChange={(e) => {
                  const nh = [...hours]; nh[i] = { ...nh[i], closed: !e.target.checked };
                  setConfig({ ...config, businessHours: JSON.stringify(nh) });
                }} className="accent-primary" />
                <span className="text-xs text-white/30 mr-1">Open</span>
                {!h.closed && (<>
                  <input type="time" value={h.open} onChange={(e) => { const nh = [...hours]; nh[i] = { ...nh[i], open: e.target.value }; setConfig({ ...config, businessHours: JSON.stringify(nh) }); }} className="h-7 w-20 rounded border border-white/[0.08] bg-transparent px-1 text-xs" />
                  <span className="text-xs text-white/20">to</span>
                  <input type="time" value={h.close} onChange={(e) => { const nh = [...hours]; nh[i] = { ...nh[i], close: e.target.value }; setConfig({ ...config, businessHours: JSON.stringify(nh) }); }} className="h-7 w-20 rounded border border-white/[0.08] bg-transparent px-1 text-xs" />
                </>)}
                {h.closed && <span className="text-xs text-white/20">Closed</span>}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ── Test Chat ─────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base"><MessageSquare className="h-4 w-4 text-green-400" /> Test Your AI</CardTitle>
            <div className="flex items-center gap-2">
              {messages.length > 0 && <span className="text-xs text-white/25">{messages.length} messages</span>}
              <Button variant="outline" size="sm" onClick={handleNewChat} disabled={messages.length === 0 && !conversationId}>New Chat</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-64 overflow-y-auto mb-3 space-y-3 p-3 rounded-lg bg-white/[0.02] border border-white/[0.06]">
            {messages.length === 0 && (
              <div className="flex items-center justify-center h-full text-sm text-slate-500">
                Test your AI by sending a message below. Try: "I need a price quote"
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`flex gap-2 ${m.role === "user" ? "justify-end" : ""}`}>
                {m.role === "assistant" && <div className="h-7 w-7 rounded-full bg-green-500/20 flex items-center justify-center shrink-0 mt-0.5"><Bot className="h-3.5 w-3.5 text-green-400" /></div>}
                <div className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm ${m.role === "user" ? "bg-blue-500/20 text-blue-100 rounded-tr-sm" : "bg-slate-800 text-slate-200 rounded-tl-sm"}`}>{m.content}</div>
              </div>
            ))}
            {sending && (
              <div className="flex gap-2">
                <div className="h-7 w-7 rounded-full bg-green-500/20 flex items-center justify-center shrink-0"><Bot className="h-3.5 w-3.5 text-green-400" /></div>
                <div className="bg-slate-800 rounded-2xl rounded-tl-sm px-4 py-2 text-sm text-slate-400"><Loader2 className="h-3.5 w-3.5 animate-spin inline mr-1" />Thinking...</div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
          <form onSubmit={(e) => { e.preventDefault(); sendTestMessage(); }} className="flex gap-2">
            <Input value={inputValue} onChange={(e) => setInputValue(e.target.value)} placeholder="Type a test message..." className="flex-1 text-sm" disabled={sending} />
            <Button type="submit" size="icon" disabled={sending || !inputValue.trim()} className="shrink-0">{sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function AiBrainPage() {
  return (
    <ErrorBoundary>
      <AiBrainContent />
    </ErrorBoundary>
  );
}
