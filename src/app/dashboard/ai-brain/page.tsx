"use client";

import { useEffect, useState, useMemo } from "react";
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
  const [testMessage, setTestMessage] = useState("");
  const [testResponse, setTestResponse] = useState("");
  const [testing, setTesting] = useState(false);
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

  const handleTestAi = async () => {
    if (!testMessage.trim()) return;
    setTesting(true);
    setTestResponse("");
    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: testMessage, conversationId: "test" }),
      });
      if (!res.ok) throw new Error("AI test failed");
      const data = await res.json();
      setTestResponse(data.response || "No response");
    } catch {
      setTestResponse("Error: AI test failed. Check your configuration.");
    } finally {
      setTesting(false);
    }
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

      {/* Test AI Feature */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" /> Test AI
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Send a test message to see how your AI responds with the current configuration.
          </p>
          <div className="flex gap-2">
            <Input
              placeholder='e.g. "I need to book an AC repair"'
              value={testMessage}
              onChange={(e) => setTestMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleTestAi();
                }
              }}
              className="flex-1"
            />
            <Button size="sm" onClick={handleTestAi} disabled={testing || !testMessage.trim()}>
              {testing ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Send className="h-4 w-4 mr-1" />}
              Send
            </Button>
          </div>
          {testResponse && (
            <div className="rounded-lg border border-border p-4 bg-muted/30">
              <div className="flex items-start gap-2">
                <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="h-3.5 w-3.5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-muted-foreground mb-1">AI Response</p>
                  <p className="text-sm whitespace-pre-wrap">{testResponse}</p>
                </div>
              </div>
            </div>
          )}
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