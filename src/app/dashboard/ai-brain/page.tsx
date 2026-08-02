"use client";

import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import {
  Bot, Loader2, Save, Send, Wand2, AlertTriangle, X, CheckCircle2,
  Building2, Plus, Trash2, MessageSquare, Sparkles, BookOpen,
  Phone, Globe, Clock, Mail, Bell, Webhook, ExternalLink,
} from "lucide-react";
import { useToast } from "@/components/toaster";
import { ErrorBoundary } from "@/components/error-boundary";
import Link from "next/link";

const WARNING_DISMISS_KEY = "ai-brain-warning-dismissed";

interface BusinessInfo { name: string; phone: string; email: string; website: string; }
interface Template { category: string; label: string; services: string[]; emergencyService: boolean; greetingMessage: string; serviceCount: number; faqCount: number; }
interface AIConfig {
  systemPrompt: string; services: string; faqs: string;
  pricingGuidance: string; companyPolicies: string; serviceAreas: string;
  businessHours: string; greetingMessage: string; leadCollectionRules: string;
  appointmentBookingRules: string; responseStyle: string; escalationRules: string;
}

const DEFAULTS: AIConfig = {
  systemPrompt: "", services: "", faqs: "",
  pricingGuidance: "", companyPolicies: "", serviceAreas: "",
  businessHours: JSON.stringify(Array.from({ length: 7 }, (_, i) => ({
    day: ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"][i],
    open: i < 5 ? "09:00" : i === 5 ? "10:00" : "", close: i < 5 ? "17:00" : i === 5 ? "15:00" : "", closed: i === 6,
  }))),
  greetingMessage: "Hello! How can I help you today?",
  leadCollectionRules: "", appointmentBookingRules: "", responseStyle: "", escalationRules: "",
};

const TABS = [
  { id: "profile", label: "Business Profile", icon: Building2 },
  { id: "knowledge", label: "Knowledge Base", icon: BookOpen },
  { id: "behavior", label: "Behavior", icon: Sparkles },
  { id: "channels", label: "Channels", icon: Phone },
] as const;

type TabId = (typeof TABS)[number]["id"];

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
  const [activeTab, setActiveTab] = useState<TabId>("profile");

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

  // Section refs
  const pricingRef = useRef<HTMLDivElement>(null);

  // ── Load ──────────────────────────────────────────
  useEffect(() => {
    try { if (typeof window !== "undefined" && localStorage.getItem(WARNING_DISMISS_KEY) === "1") setWarningDismissed(true); } catch {}
    Promise.all([
      fetch("/api/ai/brain").then((r) => (r.ok ? r.json() : null)),
      fetch("/api/ai-templates").then((r) => (r.ok ? r.json() : null)),
      fetch("/api/business/current").then((r) => (r.ok ? r.json() : null)),
    ]).then(([brainData, templateData, bizData]) => {
      if (brainData) {
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
        try { const svc = JSON.parse(brainData.services || "[]"); setServicesList(Array.isArray(svc) && svc.length ? svc : [""]); }
        catch { setServicesList(brainData.services ? brainData.services.split("\n").filter(Boolean) : [""]); }
      }
      if (templateData?.templates) setTemplates(templateData.templates);
      if (bizData) setBusinessInfo({ name: bizData.name || "", phone: bizData.phone || "", email: bizData.email || "", website: bizData.website || "" });
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  // Derived
  const dismissWarning = () => { setWarningDismissed(true); try { localStorage.setItem(WARNING_DISMISS_KEY, "1"); } catch {} };
  const showWarning = !warningDismissed && (!config.pricingGuidance?.trim() || !config.serviceAreas?.trim());
  const hasPricing = !!config.pricingGuidance?.trim();
  const hasServiceAreas = !!config.serviceAreas?.trim();
  const hasBusinessHours = useMemo(() => {
    try { return JSON.parse(config.businessHours || "[]").some((d: any) => !d.closed); } catch { return false; }
  }, [config.businessHours]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  // ── Save ──────────────────────────────────────────
  const saveConfig = useCallback(async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/ai/brain", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...config, services: JSON.stringify(servicesList.filter(Boolean)), faqs: JSON.stringify(faqList.filter((f) => f.q && f.a)) }),
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
      const res = await fetch("/api/ai-brain/apply-template", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ category }) });
      if (res.ok) {
        setSelectedCategory(category);
        const brainRes = await fetch("/api/ai/brain");
        if (brainRes.ok) {
          const d = await brainRes.json();
          setConfig({
            systemPrompt: d.systemPrompt || "", services: d.services || "", faqs: d.faqs || "",
            pricingGuidance: d.pricingGuidance || "", companyPolicies: d.companyPolicies || "",
            serviceAreas: d.serviceAreas || "", businessHours: d.businessHours || DEFAULTS.businessHours,
            greetingMessage: d.greetingMessage || DEFAULTS.greetingMessage,
            leadCollectionRules: d.leadCollectionRules || "", appointmentBookingRules: d.appointmentBookingRules || "",
            responseStyle: d.responseStyle || "", escalationRules: d.escalationRules || "",
          });
          try { const svc = JSON.parse(d.services || "[]"); setServicesList(Array.isArray(svc) && svc.length ? svc : [""]); } catch { setServicesList([""]); }
        }
        toast({ title: "Template Applied!", description: "Review and save your changes." });
      } else toast({ title: "Error", description: "Failed to apply template.", variant: "destructive" });
    } catch { toast({ title: "Error", description: "Failed to apply template.", variant: "destructive" }); }
    finally { setApplyingTemplate(false); }
  };

  // ── Chat ──────────────────────────────────────────
  const sendTestMessage = async () => {
    if (!inputValue.trim() || sending) return;
    const userMsg = inputValue.trim(); setInputValue("");
    setMessages((prev) => [...prev, { role: "user", content: userMsg }]); setSending(true);
    try {
      const res = await fetch("/api/ai/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: userMsg, conversationId, source: "dashboard" }) });
      if (res.ok) {
        const data = await res.json();
        setMessages((prev) => [...prev, { role: "assistant", content: data.response || "(no response)" }]);
        if (data.conversationId) setConversationId(data.conversationId);
      } else setMessages((prev) => [...prev, { role: "assistant", content: "⚠️ Failed to get a response." }]);
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

  const hours = useMemo(() => {
    try { return JSON.parse(config.businessHours || "[]"); }
    catch { return JSON.parse(DEFAULTS.businessHours); }
  }, [config.businessHours]);

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
        <div className="flex items-center gap-2">
          <Link href="/dashboard/knowledge-base">
            <Button variant="outline" size="sm"><BookOpen className="h-4 w-4 mr-1.5" /> Documents</Button>
          </Link>
          <Button onClick={saveConfig} disabled={saving} className="gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Configuration
          </Button>
        </div>
      </div>

      {/* Warning Banner */}
      {showWarning && (
        <div className="flex items-start gap-3 bg-amber-500/5 border border-amber-500/20 rounded-xl p-4 animate-scale-in">
          <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-amber-200/90 mb-2">To get the best performance, configure:</p>
            <ul className="space-y-1.5 text-sm text-amber-200/60">
              {!hasPricing && <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-amber-400 shrink-0" />Pricing guidance (needed for quotes)</li>}
              {!hasServiceAreas && <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-amber-400 shrink-0" />Service areas (where you operate)</li>}
              {!hasBusinessHours && <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-amber-400 shrink-0" />Business hours (for scheduling)</li>}
            </ul>
          </div>
          <button onClick={dismissWarning} className="shrink-0 text-amber-400/60 hover:text-amber-400 transition-colors p-1" aria-label="Dismiss"><X className="h-4 w-4" /></button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-white/[0.06]">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-[1px] transition-colors ${
              activeTab === tab.id ? "border-white text-white" : "border-transparent text-white/35 hover:text-white/60"
            }`}
          >
            <tab.icon className="h-4 w-4" /> {tab.label}
          </button>
        ))}
      </div>

      {/* ── TAB: Business Profile ─────────────────────────── */}
      {activeTab === "profile" && (
        <div className="space-y-6">
          {/* Business Profile Card */}
          <Card>
            <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-base"><Building2 className="h-4 w-4 text-blue-400" /> What Your AI Knows</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2.5">
                {[
                  { label: "Business Name", filled: !!businessInfo.name, value: businessInfo.name || "Not set" },
                  { label: "Phone Number", filled: !!businessInfo.phone, value: businessInfo.phone || "Not set" },
                  { label: "Email", filled: !!businessInfo.email, value: businessInfo.email || "Not set" },
                  { label: "Website", filled: !!businessInfo.website, value: businessInfo.website || "Not set" },
                  { label: "Service Areas", filled: hasServiceAreas, value: hasServiceAreas ? config.serviceAreas : "Not set" },
                  { label: "Business Hours", filled: hasBusinessHours, value: hasBusinessHours ? "Configured" : "Not set" },
                  { label: "Pricing", filled: hasPricing, value: hasPricing ? "Configured" : "Not set" },
                ].map((f) => (
                  <div key={f.label} className="flex items-center gap-2.5 py-1.5">
                    {f.filled ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" /> : <AlertTriangle className="h-3.5 w-3.5 text-amber-400 shrink-0" />}
                    <span className="text-xs text-white/35 w-28 shrink-0">{f.label}</span>
                    <span className={`text-xs truncate ${f.filled ? "text-white/60" : "text-white/25"}`}>{f.value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Services + Pricing */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="pb-3"><div className="flex items-center justify-between"><CardTitle className="text-base">Services</CardTitle><Button variant="ghost" size="sm" onClick={addService} className="h-7 gap-1 text-xs"><Plus className="h-3 w-3" /> Add</Button></div></CardHeader>
              <CardContent className="space-y-2 max-h-72 overflow-y-auto">
                {servicesList.map((svc, i) => (
                  <div key={i} className="flex gap-2"><Input value={svc} onChange={(e) => updateService(i, e.target.value)} placeholder={`Service #${i + 1}`} className="h-9 text-sm" />
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

          {/* Service Areas + Business Hours */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-base">Service Areas</CardTitle></CardHeader>
              <CardContent>
                <Textarea value={config.serviceAreas} onChange={(e) => setConfig((c) => ({ ...c, serviceAreas: e.target.value }))}
                  placeholder="Phoenix, AZ · Scottsdale, AZ · Tempe, AZ" rows={5} className="text-sm resize-none" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-base">Business Hours</CardTitle></CardHeader>
              <CardContent>
                <div className="grid gap-2 sm:grid-cols-2">
                  {hours.map((h: any, i: number) => (
                    <div key={h.day} className="flex items-center gap-2 p-2 rounded-lg bg-white/[0.03]">
                      <span className="text-sm w-24 shrink-0">{h.day}</span>
                      <input type="checkbox" checked={!h.closed} onChange={(e) => { const nh = [...hours]; nh[i] = { ...nh[i], closed: !e.target.checked }; setConfig({ ...config, businessHours: JSON.stringify(nh) }); }} className="accent-primary" />
                      <span className="text-xs text-white/30 mr-1">Open</span>
                      {!h.closed ? (<><input type="time" value={h.open} onChange={(e) => { const nh = [...hours]; nh[i] = { ...nh[i], open: e.target.value }; setConfig({ ...config, businessHours: JSON.stringify(nh) }); }} className="h-7 w-20 rounded border border-white/[0.08] bg-transparent px-1 text-xs" /><span className="text-xs text-white/20">to</span><input type="time" value={h.close} onChange={(e) => { const nh = [...hours]; nh[i] = { ...nh[i], close: e.target.value }; setConfig({ ...config, businessHours: JSON.stringify(nh) }); }} className="h-7 w-20 rounded border border-white/[0.08] bg-transparent px-1 text-xs" /></>) : <span className="text-xs text-white/20">Closed</span>}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Greeting */}
          <Card>
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
        </div>
      )}

      {/* ── TAB: Knowledge Base ───────────────────────────── */}
      {activeTab === "knowledge" && (
        <div className="space-y-6">
          {/* Template Selector */}
          <Card>
            <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-base"><Wand2 className="h-4 w-4 text-amber-400" /> Industry Template</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {templates.map((t) => (
                  <button key={t.category} onClick={() => applyTemplate(t.category)} disabled={applyingTemplate}
                    className={`relative flex flex-col items-center gap-2 p-3 rounded-xl border text-sm transition-all duration-200 text-left ${
                      selectedCategory === t.category ? "border-amber-500 bg-amber-500/10 text-white shadow-lg shadow-amber-500/10"
                        : "border-white/[0.06] bg-white/[0.02] text-slate-300 hover:border-white/[0.12] hover:bg-white/[0.04]"}`}>
                    <div className={`h-8 w-8 rounded-lg flex items-center justify-center text-xs font-bold ${selectedCategory === t.category ? "bg-amber-500 text-white" : "bg-white/[0.06] text-slate-400"}`}>{t.label.slice(0, 2).toUpperCase()}</div>
                    <span className="font-medium leading-tight text-center">{t.label}</span>
                    <span className="text-[10px] text-slate-500">{t.serviceCount} services · {t.faqCount} FAQs</span>
                    {applyingTemplate && selectedCategory === t.category && <Loader2 className="h-4 w-4 animate-spin absolute top-1 right-1 text-amber-400" />}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* FAQs */}
          <Card>
            <CardHeader className="pb-3"><div className="flex items-center justify-between"><CardTitle className="text-base">Frequently Asked Questions</CardTitle><Button variant="ghost" size="sm" onClick={addFaq} className="h-7 gap-1 text-xs"><Plus className="h-3 w-3" /> Add FAQ</Button></div></CardHeader>
            <CardContent className="space-y-3 max-h-96 overflow-y-auto">
              {faqList.map((faq, i) => (
                <div key={i} className="grid grid-cols-1 md:grid-cols-2 gap-2 p-3 rounded-lg bg-white/[0.03] border border-white/[0.05]">
                  <div><label className="text-[11px] text-slate-500 mb-1 block">Question</label><Input value={faq.q} onChange={(e) => setFaqList((prev) => prev.map((f, idx) => (idx === i ? { ...f, q: e.target.value } : f)))} placeholder="How much does it cost?" className="h-8 text-sm" /></div>
                  <div><label className="text-[11px] text-slate-500 mb-1 block">Answer</label><div className="flex gap-2"><Input value={faq.a} onChange={(e) => setFaqList((prev) => prev.map((f, idx) => (idx === i ? { ...f, a: e.target.value } : f)))} placeholder="Pricing varies..." className="h-8 text-sm flex-1" /><Button variant="ghost" size="icon" onClick={() => removeFaq(i)} className="h-8 w-8 shrink-0 text-slate-500 hover:text-red-400"><Trash2 className="h-3.5 w-3.5" /></Button></div></div>
                </div>
              ))}
              {faqList.length === 0 && <p className="text-sm text-slate-500 text-center py-6">No FAQs yet. Add one to train your AI.</p>}
            </CardContent>
          </Card>

          {/* Company Policies */}
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Company Policies</CardTitle></CardHeader>
            <CardContent>
              <Textarea value={config.companyPolicies} onChange={(e) => setConfig((c) => ({ ...c, companyPolicies: e.target.value }))}
                placeholder="24-hour cancellation policy. Licensed and insured. All work guaranteed..." rows={6} className="text-sm resize-none" />
            </CardContent>
          </Card>

          {/* Link to documents */}
          <Card className="border-dashed border-white/[0.06] bg-white/[0.01]">
            <CardContent className="py-6 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-white/70">Upload Documents</p>
                <p className="text-xs text-white/35 mt-0.5">Upload PDFs, manuals, price sheets to your Knowledge Base</p>
              </div>
              <Link href="/dashboard/knowledge-base"><Button variant="outline" size="sm"><ExternalLink className="h-3.5 w-3.5 mr-1" /> Open Knowledge Base</Button></Link>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── TAB: Behavior ──────────────────────────────────── */}
      {activeTab === "behavior" && (
        <div className="space-y-6">
          {/* Personality & Tone */}
          <Card>
            <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-base"><Sparkles className="h-4 w-4 text-purple-400" /> Personality &amp; Tone</CardTitle></CardHeader>
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
            </CardContent>
          </Card>

          {/* System Prompt */}
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">System Prompt</CardTitle></CardHeader>
            <CardContent>
              <Textarea value={config.systemPrompt} onChange={(e) => setConfig((c) => ({ ...c, systemPrompt: e.target.value }))}
                placeholder="You are a friendly, knowledgeable assistant for..." rows={8} className="font-mono text-sm resize-none" />
            </CardContent>
          </Card>

          {/* Behavior rules */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              { label: "Response Style", key: "responseStyle" as const, placeholder: "Be professional and friendly. Use emojis sparingly. Keep responses concise." },
              { label: "Lead Collection Rules", key: "leadCollectionRules" as const, placeholder: "Collect: name, phone, email, service needed. Always confirm contact info." },
              { label: "Appointment Booking Rules", key: "appointmentBookingRules" as const, placeholder: "Offer 2-hour windows. Confirm someone 18+ will be home. Send confirmation." },
              { label: "Escalation Rules", key: "escalationRules" as const, placeholder: "Escalate to human when: price > $5,000, customer requests manager, emergency situations." },
            ].map((p) => (
              <Card key={p.key}>
                <CardHeader className="pb-3"><CardTitle className="text-base">{p.label}</CardTitle></CardHeader>
                <CardContent>
                  <Textarea value={config[p.key]} onChange={(e) => setConfig((c) => ({ ...c, [p.key]: e.target.value }))} placeholder={p.placeholder} rows={5} className="text-sm resize-none" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* ── TAB: Channels ──────────────────────────────────── */}
      {activeTab === "channels" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              { icon: Phone, title: "Phone", desc: businessInfo.phone || "Not configured", link: "/dashboard/settings", linkLabel: "Configure", color: "emerald" },
              { icon: MessageSquare, title: "SMS", desc: "Automated text messaging", link: "/dashboard/automation", linkLabel: "Automation", color: "blue" },
              { icon: Mail, title: "Email", desc: "Automated email responses", link: "/dashboard/messages/compose", linkLabel: "Compose", color: "purple" },
              { icon: Globe, title: "Chatbot", desc: "Website widget & embed", link: "/dashboard/chatbot", linkLabel: "Chatbot Setup", color: "amber" },
              { icon: Clock, title: "Business Hours", desc: hasBusinessHours ? "Hours configured" : "Set your hours", link: "#", linkLabel: "Business Profile", color: "cyan", onClick: () => setActiveTab("profile") },
              { icon: Bell, title: "Notifications", desc: "Alert preferences", link: "/dashboard/settings", linkLabel: "Settings", color: "rose" },
            ].map((ch) => (
              <Card key={ch.title}>
                <CardContent className="p-5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`h-10 w-10 rounded-xl bg-${ch.color}-500/10 border border-${ch.color}-500/20 flex items-center justify-center shrink-0`}>
                      <ch.icon className={`h-5 w-5 text-${ch.color}-400`} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white/80">{ch.title}</p>
                      <p className="text-xs text-white/35 mt-0.5">{ch.desc}</p>
                    </div>
                  </div>
                  {ch.onClick ? (
                    <Button variant="outline" size="sm" onClick={ch.onClick} className="text-xs h-7">{ch.linkLabel}</Button>
                  ) : (
                    <Link href={ch.link}><Button variant="outline" size="sm" className="text-xs h-7">{ch.linkLabel}</Button></Link>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* ── Test Chat (all tabs) ───────────────────────────── */}
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
                Test your AI by sending a message. Try: "I need a price quote"
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
