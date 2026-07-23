"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Bot, Loader2, Save, Send, BookOpen, MessageSquare, Sparkles } from "lucide-react";
import { useToast } from "@/components/toaster";
import { ErrorBoundary } from "@/components/error-boundary";
import Link from "next/link";

interface AIConfig {
  systemPrompt: string;
  businessInfo: string;
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

const defaultConfig: AIConfig = {
  systemPrompt: "",
  businessInfo: "",
  services: "",
  faqs: "",
  pricingGuidance: "",
  companyPolicies: "",
  serviceAreas: "",
  businessHours: JSON.stringify(
    Array.from({ length: 7 }, (_, i) => ({
      day: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"][i],
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

function AiBrainContent() {
  const [config, setConfig] = useState<AIConfig>(defaultConfig);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetch("/api/ai/brain")
      .then((r) => r.ok ? r.json() : Promise.reject("No config"))
      .then((data) => {
        if (data && data.id) {
          const safeParse = (val: string | null | undefined) => {
            if (!val) return "";
            try {
              const parsed = JSON.parse(val);
              return Array.isArray(parsed) ? parsed.join("\n") : "";
            } catch {
              return "";
            }
          };
          const safeBusinessHours = (val: string | null | undefined) => {
            if (!val) return defaultConfig.businessHours;
            try {
              const parsed = JSON.parse(val);
              return Array.isArray(parsed) ? val : defaultConfig.businessHours;
            } catch {
              return defaultConfig.businessHours;
            }
          };
          setConfig({
            systemPrompt: data.systemPrompt || "",
            businessInfo: data.businessInfo || "",
            services: safeParse(data.services),
            faqs: safeParse(data.faqs),
            pricingGuidance: data.pricingGuidance || "",
            companyPolicies: data.companyPolicies || "",
            serviceAreas: safeParse(data.serviceAreas),
            businessHours: safeBusinessHours(data.businessHours),
            greetingMessage: data.greetingMessage || defaultConfig.greetingMessage,
            leadCollectionRules: data.leadCollectionRules || "",
            appointmentBookingRules: data.appointmentBookingRules || "",
            responseStyle: data.responseStyle || "",
            escalationRules: data.escalationRules || "",
          });
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const body = {
        ...config,
        services: JSON.stringify(config.services.split("\n").filter(Boolean)),
        faqs: JSON.stringify(config.faqs.split("\n").filter(Boolean)),
        serviceAreas: JSON.stringify(config.serviceAreas.split("\n").filter(Boolean)),
      };
      const res = await fetch("/api/ai/brain", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed to save");
      toast("AI Brain configuration saved", "success");
    } catch {
      toast("Failed to save configuration", "error");
    } finally {
      setSaving(false);
    }
  };

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    const text = inputValue.trim();
    if (!text || sending) return;

    // Add user message immediately
    const userMsg = { role: "user" as const, content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInputValue("");
    setSending(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          conversationId: conversationId, // null on first message — server creates one
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: `Error: ${data.error || "AI test failed."}${data.detail ? ` (${data.detail})` : ""}` },
        ]);
      } else {
        setMessages((prev) => [...prev, { role: "assistant", content: data.response || "No response" }]);
        // Persist conversation ID returned by server
        if (data.conversationId) {
          setConversationId(data.conversationId);
        }
      }
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "Error: Network error. Please check your connection." }]);
    } finally {
      setSending(false);
    }
  };

  const handleNewChat = () => {
    setMessages([]);
    setConversationId(null);
    setInputValue("");
  };

  const hours = useMemo(() => {
    try {
      const parsed = JSON.parse(config.businessHours || "[]");
      return Array.isArray(parsed) ? parsed : JSON.parse(defaultConfig.businessHours);
    } catch {
      return JSON.parse(defaultConfig.businessHours);
    }
  }, [config.businessHours]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-muted-foreground animate-pulse">Loading AI Brain...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Bot className="h-6 w-6" /> AI Brain
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configure your AI assistant&apos;s knowledge and behavior
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/dashboard/knowledge-base">
            <Button variant="outline" size="sm">
              <BookOpen className="h-4 w-4 mr-1.5" /> Knowledge Base
            </Button>
          </Link>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
            Save Configuration
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* System Prompt */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">AI Instructions / System Prompt</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={config.systemPrompt}
              onChange={(e) => setConfig({ ...config, systemPrompt: e.target.value })}
              rows={8}
              placeholder="You are a helpful AI assistant for a service business..."
              className="font-mono text-xs"
            />
          </CardContent>
        </Card>

        {/* Business Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Business Information</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={config.businessInfo}
              onChange={(e) => setConfig({ ...config, businessInfo: e.target.value })}
              rows={8}
              placeholder="Describe your business, history, mission, etc."
            />
          </CardContent>
        </Card>

        {/* Services */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Services (one per line)</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={config.services}
              onChange={(e) => setConfig({ ...config, services: e.target.value })}
              rows={6}
              placeholder="HVAC Maintenance&#10;AC Repair&#10;Plumbing&#10;Electrical Wiring"
            />
          </CardContent>
        </Card>

        {/* FAQs */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">FAQs (one per line)</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={config.faqs}
              onChange={(e) => setConfig({ ...config, faqs: e.target.value })}
              rows={6}
              placeholder="Q: What are your hours? A: We're open Mon-Fri 9-5"
            />
          </CardContent>
        </Card>

        {/* Pricing Guidance */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Pricing Guidance</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={config.pricingGuidance}
              onChange={(e) => setConfig({ ...config, pricingGuidance: e.target.value })}
              rows={6}
              placeholder="Provide pricing ranges, hourly rates, etc."
            />
          </CardContent>
        </Card>

        {/* Company Policies */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Company Policies</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={config.companyPolicies}
              onChange={(e) => setConfig({ ...config, companyPolicies: e.target.value })}
              rows={6}
              placeholder="Cancellation policy, warranty info, etc."
            />
          </CardContent>
        </Card>

        {/* Service Areas */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Service Areas (one per line)</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={config.serviceAreas}
              onChange={(e) => setConfig({ ...config, serviceAreas: e.target.value })}
              rows={6}
              placeholder="Phoenix, AZ&#10;Scottsdale, AZ&#10;Tempe, AZ"
            />
          </CardContent>
        </Card>

        {/* Greeting Message */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Greeting Message</CardTitle>
          </CardHeader>
          <CardContent>
            <Input
              value={config.greetingMessage}
              onChange={(e) => setConfig({ ...config, greetingMessage: e.target.value })}
            />
          </CardContent>
        </Card>

        {/* Lead Collection Rules */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Lead Collection Rules</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={config.leadCollectionRules}
              onChange={(e) => setConfig({ ...config, leadCollectionRules: e.target.value })}
              rows={4}
              placeholder="Collect name, phone, and email from every lead. Ask for service type before booking."
            />
          </CardContent>
        </Card>

        {/* Appointment Booking Rules */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Appointment Booking Rules</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={config.appointmentBookingRules}
              onChange={(e) => setConfig({ ...config, appointmentBookingRules: e.target.value })}
              rows={4}
              placeholder="Appointments must be scheduled at least 2 hours in advance. Confirm availability before booking."
            />
          </CardContent>
        </Card>

        {/* Response Style */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Response Style</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={config.responseStyle}
              onChange={(e) => setConfig({ ...config, responseStyle: e.target.value })}
              rows={4}
              placeholder="Be professional and friendly. Use emojis sparingly. Keep responses concise."
            />
          </CardContent>
        </Card>

        {/* Escalation Rules */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Escalation Rules</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={config.escalationRules}
              onChange={(e) => setConfig({ ...config, escalationRules: e.target.value })}
              rows={4}
              placeholder="Escalate to human when customer asks for manager, expresses frustration, or requests complex pricing."
            />
          </CardContent>
        </Card>
      </div>

      {/* Business Hours */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Business Hours</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {hours.map((h: { day: string; open: string; close: string; closed: boolean }, i: number) => (
              <div key={h.day} className="flex items-center gap-2 p-2 rounded-lg bg-muted/30">
                <span className="text-sm w-24 shrink-0">{h.day}</span>
                <input
                  type="checkbox"
                  checked={!h.closed}
                  onChange={(e) => {
                    const newHours = [...hours];
                    newHours[i] = { ...newHours[i], closed: !e.target.checked };
                    setConfig({ ...config, businessHours: JSON.stringify(newHours) });
                  }}
                  className="accent-primary"
                />
                <span className="text-xs text-muted-foreground mr-1">Open</span>
                {!h.closed && (
                  <>
                    <input
                      type="time"
                      value={h.open}
                      onChange={(e) => {
                        const newHours = [...hours];
                        newHours[i] = { ...newHours[i], open: e.target.value };
                        setConfig({ ...config, businessHours: JSON.stringify(newHours) });
                      }}
                      className="h-7 w-20 rounded border border-input bg-background px-1 text-xs"
                    />
                    <span className="text-xs text-muted-foreground">to</span>
                    <input
                      type="time"
                      value={h.close}
                      onChange={(e) => {
                        const newHours = [...hours];
                        newHours[i] = { ...newHours[i], close: e.target.value };
                        setConfig({ ...config, businessHours: JSON.stringify(newHours) });
                      }}
                      className="h-7 w-20 rounded border border-input bg-background px-1 text-xs"
                    />
                  </>
                )}
                {h.closed && <span className="text-xs text-muted-foreground">Closed</span>}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Test AI — Persistent Chat */}
      <Card className="flex flex-col">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" /> Test AI
          </CardTitle>
          <div className="flex items-center gap-2">
            {messages.length > 0 && (
              <span className="text-xs text-muted-foreground">{messages.length} messages</span>
            )}
            <Button variant="outline" size="sm" onClick={handleNewChat} disabled={messages.length === 0 && !conversationId}>
              <MessageSquare className="h-3.5 w-3.5 mr-1" /> New Chat
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col flex-1 min-h-0">
          {/* Chat messages area */}
          <div className="flex-1 overflow-y-auto space-y-3 mb-4 max-h-[400px] pr-1">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-center text-muted-foreground">
                <Bot className="h-8 w-8 mb-2 opacity-30" />
                <p className="text-sm">Send a message to test your AI</p>
                <p className="text-xs opacity-60 mt-1">The AI will remember context from previous messages</p>
              </div>
            ) : (
              messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  {msg.role === "assistant" && (
                    <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-1">
                      <Bot className="h-3.5 w-3.5 text-primary" />
                    </div>
                  )}
                  <div
                    className={`max-w-[80%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    }`}
                  >
                    {msg.content}
                  </div>
                  {msg.role === "user" && (
                    <div className="h-6 w-6 rounded-full bg-secondary flex items-center justify-center shrink-0 mt-1">
                      <span className="text-xs font-medium">You</span>
                    </div>
                  )}
                </div>
              ))
            )}
            {sending && (
              <div className="flex gap-2 justify-start">
                <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-1">
                  <Bot className="h-3.5 w-3.5 text-primary" />
                </div>
                <div className="bg-muted rounded-lg px-3 py-2 text-sm">
                  <Loader2 className="h-4 w-4 animate-spin inline mr-1" />
                  Thinking...
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input area */}
          <div className="flex gap-2 pt-2 border-t border-border">
            <Input
              placeholder='Type a message... e.g. "I need to book an AC repair"'
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              className="flex-1"
              disabled={sending}
            />
            <Button size="sm" onClick={handleSend} disabled={sending || !inputValue.trim()}>
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
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