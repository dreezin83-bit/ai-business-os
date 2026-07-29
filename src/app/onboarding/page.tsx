"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  ChevronLeft,
  ChevronRight,
  Check,
  Loader2,
  Sparkles,
  Upload,
  FileText,
  SkipForward,
  X,
} from "lucide-react";
import { useToast } from "@/components/toaster";
import { cn } from "@/lib/utils";

const CATEGORIES = [
  "HVAC",
  "Plumbing",
  "Roofing",
  "Electrical",
  "Cleaning",
  "Landscaping",
  "Pest Control",
  "Dental",
  "Law Firm",
  "Real Estate",
  "General Contractor",
  "Other",
];

const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

interface DayHours {
  open: string;
  close: string;
  closed: boolean;
}

interface FormData {
  businessName: string;
  category: string;
  phone: string;
  email: string;
  website: string;
  serviceArea: string;
  hours: Record<string, DayHours>;
  emergencyAvailable: boolean;
  emergencyNote: string;
  services: string;
  greeting: string;
  knowledgeText: string;
}

const TOTAL_STEPS = 4;

const defaultHours: Record<string, DayHours> = {};
DAYS.forEach((day) => {
  defaultHours[day] = { open: "08:00", close: "17:00", closed: day === "Saturday" || day === "Sunday" };
});

export default function OnboardingPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [form, setForm] = useState<FormData>({
    businessName: "",
    category: "",
    phone: "",
    email: "",
    website: "",
    serviceArea: "",
    hours: { ...defaultHours },
    emergencyAvailable: false,
    emergencyNote: "",
    services: "",
    greeting: "",
    knowledgeText: "",
  });

  const update = (field: keyof FormData, value: any) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const updateHour = (day: string, field: keyof DayHours, value: any) => {
    setForm((prev) => ({
      ...prev,
      hours: {
        ...prev.hours,
        [day]: { ...prev.hours[day], [field]: value },
      },
    }));
  };

  const defaultGreeting = `Hello! Welcome to ${form.businessName || "[Business Name]"}. How can I help you today?`;

  const canNext = (): boolean => {
    switch (step) {
      case 1:
        return !!form.businessName.trim() && !!form.category && !!form.phone.trim() && !!form.email.trim();
      case 2:
        return !!form.serviceArea.trim();
      case 3:
        return !!form.services.trim();
      case 4:
        return true; // optional step
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (step < TOTAL_STEPS) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleSkipStep4 = () => {
    handleSubmit(true);
  };

  const handleSubmit = async (skipped = false) => {
    setSubmitting(true);
    try {
      const payload: Record<string, any> = {
        businessName: form.businessName,
        category: form.category,
        phone: form.phone,
        email: form.email,
        website: form.website || undefined,
        serviceArea: form.serviceArea,
        businessHours: form.hours,
        emergencyAvailable: form.emergencyAvailable,
        emergencyNote: form.emergencyNote || undefined,
        servicesOffered: form.services,
        greeting: form.greeting || defaultGreeting,
        knowledgeContent: skipped ? undefined : form.knowledgeText || undefined,
      };

      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to complete onboarding");
      }

      setCompleted(true);
      toast("Onboarding complete! Welcome aboard.", "success");
      setTimeout(() => router.push("/dashboard"), 2000);
    } catch (err: any) {
      toast(err.message || "Something went wrong. Please try again.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  if (completed) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center relative overflow-hidden">
        {/* Ambient glow */}
        <div className="fixed inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-[150px]" />
        </div>

        <Card className="relative w-full max-w-md mx-4 border-white/[0.06] bg-white/[0.02] backdrop-blur-xl">
          <CardContent className="flex flex-col items-center py-12 px-6 text-center">
            <div className="h-16 w-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-6">
              <Check className="h-8 w-8 text-emerald-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">You're all set!</h2>
            <p className="text-sm text-white/50 mb-6">
              Your AI Business OS is ready. Redirecting to your dashboard...
            </p>
            <div className="loader" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center relative overflow-hidden">
      {/* Ambient glow */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-purple-500/5 rounded-full blur-[100px]" />
      </div>

      <div className="relative w-full max-w-2xl mx-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-3">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white shadow-lg shadow-purple-500/25">
              AI
            </div>
            <span className="font-semibold text-sm text-white">AI Business OS</span>
          </div>
          <h1 className="text-2xl font-bold text-white mb-1">Set Up Your Business</h1>
          <p className="text-sm text-white/40">
            Complete these steps to activate your AI-powered operating system.
          </p>
        </div>

        {/* Progress indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <div key={i} className="flex items-center gap-2">
              <button
                onClick={() => i + 1 < step && setStep(i + 1)}
                disabled={i + 1 > step}
                className={cn(
                  "h-8 w-8 rounded-full flex items-center justify-center text-xs font-medium border transition-all duration-300",
                  i + 1 < step
                    ? "bg-emerald-500 border-emerald-500 text-white cursor-pointer"
                    : i + 1 === step
                    ? "bg-white/10 border-white/20 text-white"
                    : "bg-transparent border-white/[0.06] text-white/30 cursor-default"
                )}
              >
                {i + 1 < step ? <Check className="h-3.5 w-3.5" /> : i + 1}
              </button>
              {i < TOTAL_STEPS - 1 && (
                <div
                  className={cn(
                    "h-px w-8 transition-colors duration-300",
                    i + 1 < step ? "bg-emerald-500" : "bg-white/[0.06]"
                  )}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step content */}
        <Card className="border-white/[0.06] bg-white/[0.02] backdrop-blur-xl">
          {step === 1 && (
            <>
              <CardHeader>
                <CardTitle className="text-lg">Business Basics</CardTitle>
                <CardDescription className="text-white/40">
                  Tell us about your business so we can personalize your AI.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-white/60 mb-1.5 block">
                    Business Name <span className="text-red-400">*</span>
                  </label>
                  <Input
                    value={form.businessName}
                    onChange={(e) => update("businessName", e.target.value)}
                    placeholder="ACME Services Inc."
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-white/60 mb-1.5 block">
                    Business Category <span className="text-red-400">*</span>
                  </label>
                  <select
                    value={form.category}
                    onChange={(e) => update("category", e.target.value)}
                    className="glass-input h-10 appearance-none cursor-pointer"
                    style={{ WebkitAppearance: "none" }}
                  >
                    <option value="" disabled className="bg-black">
                      Select a category...
                    </option>
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat} className="bg-black text-white">
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-white/60 mb-1.5 block">
                      Phone Number <span className="text-red-400">*</span>
                    </label>
                    <Input
                      value={form.phone}
                      onChange={(e) => update("phone", e.target.value)}
                      placeholder="(555) 123-4567"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-white/60 mb-1.5 block">
                      Email Address <span className="text-red-400">*</span>
                    </label>
                    <Input
                      type="email"
                      value={form.email}
                      onChange={(e) => update("email", e.target.value)}
                      placeholder="contact@yourbusiness.com"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-white/60 mb-1.5 block">
                    Website <span className="text-white/30">(optional)</span>
                  </label>
                  <Input
                    value={form.website}
                    onChange={(e) => update("website", e.target.value)}
                    placeholder="https://yourbusiness.com"
                  />
                </div>
              </CardContent>
            </>
          )}

          {step === 2 && (
            <>
              <CardHeader>
                <CardTitle className="text-lg">Service Area & Hours</CardTitle>
                <CardDescription className="text-white/40">
                  Define where and when you operate.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div>
                  <label className="text-xs font-medium text-white/60 mb-1.5 block">
                    Service Area <span className="text-red-400">*</span>
                  </label>
                  <Textarea
                    value={form.serviceArea}
                    onChange={(e) => update("serviceArea", e.target.value)}
                    placeholder="Phoenix, AZ; Scottsdale, AZ; Tempe, AZ (zip codes: 85001-85099)"
                    rows={2}
                  />
                  <p className="text-[11px] text-white/25 mt-1">
                    Enter cities, zip codes, or regions you serve — separated by commas or semicolons.
                  </p>
                </div>

                <div>
                  <label className="text-xs font-medium text-white/60 mb-2 block">
                    Business Hours
                  </label>
                  <div className="space-y-2">
                    {DAYS.map((day) => (
                      <div
                        key={day}
                        className="flex items-center gap-3 bg-white/[0.02] rounded-xl px-3 py-2 border border-white/[0.04]"
                      >
                        <span className="text-sm text-white/70 w-24 shrink-0">{day}</span>
                        {form.hours[day]?.closed ? (
                          <span className="text-xs text-white/30 flex-1">Closed</span>
                        ) : (
                          <div className="flex items-center gap-2 flex-1">
                            <input
                              type="time"
                              value={form.hours[day]?.open || "08:00"}
                              onChange={(e) => updateHour(day, "open", e.target.value)}
                              className="glass-input h-8 w-28 text-xs"
                            />
                            <span className="text-white/20 text-xs">to</span>
                            <input
                              type="time"
                              value={form.hours[day]?.close || "17:00"}
                              onChange={(e) => updateHour(day, "close", e.target.value)}
                              className="glass-input h-8 w-28 text-xs"
                            />
                          </div>
                        )}
                        <button
                          onClick={() => updateHour(day, "closed", !form.hours[day]?.closed)}
                          className={cn(
                            "text-[10px] font-medium px-2 py-0.5 rounded-full border transition-colors shrink-0",
                            form.hours[day]?.closed
                              ? "bg-white/[0.04] border-white/[0.08] text-white/40"
                              : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                          )}
                        >
                          {form.hours[day]?.closed ? "Closed" : "Open"}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-white/80">
                        Emergency Service Available?
                      </label>
                      <p className="text-[11px] text-white/30">
                        Let customers know if you handle emergencies after hours.
                      </p>
                    </div>
                    <button
                      onClick={() => update("emergencyAvailable", !form.emergencyAvailable)}
                      className={cn(
                        "relative h-6 w-11 rounded-full transition-colors duration-200",
                        form.emergencyAvailable ? "bg-emerald-500" : "bg-white/[0.08]"
                      )}
                    >
                      <span
                        className={cn(
                          "absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform duration-200 shadow-sm",
                          form.emergencyAvailable ? "translate-x-5.5" : "translate-x-0.5"
                        )}
                      />
                    </button>
                  </div>
                  {form.emergencyAvailable && (
                    <Input
                      value={form.emergencyNote}
                      onChange={(e) => update("emergencyNote", e.target.value)}
                      placeholder="e.g. Available 24/7 for emergencies — call anytime"
                    />
                  )}
                </div>
              </CardContent>
            </>
          )}

          {step === 3 && (
            <>
              <CardHeader>
                <CardTitle className="text-lg">Services & Greeting</CardTitle>
                <CardDescription className="text-white/40">
                  Tell the AI what services you offer and how to greet customers.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-white/60 mb-1.5 block">
                    Services Offered <span className="text-red-400">*</span>
                  </label>
                  <Textarea
                    value={form.services}
                    onChange={(e) => update("services", e.target.value)}
                    placeholder={`AC repair & installation\nHeating system repair\nDuct cleaning\nIndoor air quality\nMaintenance plans\nEmergency repairs`}
                    rows={5}
                  />
                  <p className="text-[11px] text-white/25 mt-1">
                    List each service on a new line. This helps the AI understand what you offer.
                  </p>
                </div>

                <div>
                  <label className="text-xs font-medium text-white/60 mb-1.5 block">
                    Preferred Greeting
                  </label>
                  <Textarea
                    value={form.greeting}
                    onChange={(e) => update("greeting", e.target.value)}
                    placeholder={defaultGreeting}
                    rows={3}
                  />
                  <p className="text-[11px] text-white/25 mt-1">
                    How should the AI greet your customers? Leave blank to use the default.
                  </p>
                </div>
              </CardContent>
            </>
          )}

          {step === 4 && (
            <>
              <CardHeader>
                <CardTitle className="text-lg">Knowledge Base</CardTitle>
                <CardDescription className="text-white/40">
                  Upload documents or paste content to train your AI. You can skip this and add more later.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Upload zone */}
                <div className="border-2 border-dashed border-white/[0.08] rounded-2xl p-8 text-center hover:border-white/[0.15] transition-colors cursor-pointer">
                  <Upload className="h-8 w-8 mx-auto mb-3 text-white/20" />
                  <p className="text-sm text-white/40 mb-1">
                    Drop files here or click to browse
                  </p>
                  <p className="text-[11px] text-white/20">
                    PDF, DOC, TXT supported · Max 10MB per file
                  </p>
                  <input type="file" accept=".pdf,.doc,.docx,.txt" className="hidden" />
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-white/[0.06]" />
                  <span className="text-xs text-white/20">or paste text</span>
                  <div className="flex-1 h-px bg-white/[0.06]" />
                </div>

                <Textarea
                  value={form.knowledgeText}
                  onChange={(e) => update("knowledgeText", e.target.value)}
                  placeholder="Paste FAQs, pricing info, policies, or any text you want the AI to know..."
                  rows={6}
                  className="min-h-[120px]"
                />
              </CardContent>
            </>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between px-6 pb-6 gap-3">
            <div>
              {step > 1 && (
                <Button variant="ghost" onClick={handleBack} disabled={submitting}>
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Back
                </Button>
              )}
            </div>

            <div className="flex items-center gap-2">
              {step === TOTAL_STEPS && (
                <Button variant="ghost" onClick={handleSkipStep4} disabled={submitting}>
                  <SkipForward className="h-4 w-4 mr-1" />
                  Skip
                </Button>
              )}

              {step < TOTAL_STEPS ? (
                <Button onClick={handleNext} disabled={!canNext()}>
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              ) : (
                <Button onClick={() => handleSubmit(false)} disabled={submitting || !canNext()}>
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                  ) : (
                    <Sparkles className="h-4 w-4 mr-1" />
                  )}
                  Complete Setup
                </Button>
              )}
            </div>
          </div>
        </Card>

        {/* Step counter */}
        <p className="text-center text-xs text-white/20 mt-4">
          Step {step} of {TOTAL_STEPS}
        </p>
      </div>
    </div>
  );
}
