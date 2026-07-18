"use client";

import { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Bot, Loader2, Save } from "lucide-react";
import { useToast } from "@/components/toaster";
import { ErrorBoundary } from "@/components/error-boundary";

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
};

export default function AiBrainPage() {
  return (
    <ErrorBoundary>
      <AiBrainPageInner />
    </ErrorBoundary>
  );
}

function AiBrainPageInner() {
  const [config, setConfig] = useState<AIConfig>(defaultConfig);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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
      toast("Failed to save", "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const hours = useMemo(() => {
    try {
      const parsed = JSON.parse(config.businessHours || "[]");
      return Array.isArray(parsed) ? parsed : JSON.parse(defaultConfig.businessHours);
    } catch {
      return JSON.parse(defaultConfig.businessHours);
    }
  }, [config.businessHours]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Bot className="h-6 w-6" /> AI Brain
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configure your AI assistant&apos;s knowledge and behavior
          </p>
        </div>
        <Button size="sm" onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
          Save Configuration
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">System Prompt</CardTitle>
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
    </div>
  );
}