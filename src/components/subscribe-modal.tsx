"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, ArrowRight, ShieldCheck, CreditCard, Sparkles } from "lucide-react";

interface SubscribeModalProps {
  open: boolean;
  onClose: () => void;
}

const CHECKOUT_URL = "/api/paystack/checkout";

export default function SubscribeModal({ open, onClose }: SubscribeModalProps) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [plan, setPlan] = useState<"starter" | "professional">("starter");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email.trim()) {
      setError("Email is required");
      return;
    }
    if (!name.trim()) {
      setError("Full name is required");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(CHECKOUT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          name: name.trim(),
          companyName: companyName.trim(),
          plan,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to initialize payment");
        setSubmitting(false);
        return;
      }

      if (data.authorization_url) {
        window.location.href = data.authorization_url;
      } else {
        setError("No payment URL returned");
        setSubmitting(false);
      }
    } catch {
      setError("Network error. Please try again.");
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-md bg-[#0a0a0b] border-white/[0.08] text-white">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-blue-400" />
            Subscribe to Sagenify AI
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {/* Plan selector */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setPlan("starter")}
              className={`rounded-xl border p-3 text-left transition-all cursor-pointer ${
                plan === "starter"
                  ? "border-white/30 bg-white/[0.06]"
                  : "border-white/[0.06] bg-transparent hover:bg-white/[0.03]"
              }`}
            >
              <div className="text-xs font-semibold text-white/70 mb-0.5">Starter</div>
              <div className="text-lg font-bold text-white">$399<span className="text-xs font-normal text-white/30"> first mo</span></div>
              <div className="text-[11px] text-white/30 mt-0.5">then $199/month</div>
            </button>
            <button
              type="button"
              onClick={() => setPlan("professional")}
              className={`rounded-xl border p-3 text-left transition-all cursor-pointer ${
                plan === "professional"
                  ? "border-white/30 bg-white/[0.06]"
                  : "border-white/[0.06] bg-transparent hover:bg-white/[0.03]"
              }`}
            >
              <div className="text-xs font-semibold text-white/70 mb-0.5">Professional</div>
              <div className="text-lg font-bold text-white">$399<span className="text-xs font-normal text-white/30"> first mo</span></div>
              <div className="text-[11px] text-white/30 mt-0.5">then $199/month</div>
            </button>
          </div>

          {/* Form fields */}
          <div className="space-y-3">
            <div>
              <label className="text-[11px] font-medium text-white/40 uppercase tracking-wider mb-1.5 block">
                Full Name
              </label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Smith"
                className="bg-white/[0.03] border-white/[0.08] text-white placeholder:text-white/20 h-10 text-sm rounded-lg"
                autoComplete="name"
              />
            </div>
            <div>
              <label className="text-[11px] font-medium text-white/40 uppercase tracking-wider mb-1.5 block">
                Email Address
              </label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="john@yourbusiness.com"
                className="bg-white/[0.03] border-white/[0.08] text-white placeholder:text-white/20 h-10 text-sm rounded-lg"
                autoComplete="email"
              />
            </div>
            <div>
              <label className="text-[11px] font-medium text-white/40 uppercase tracking-wider mb-1.5 block">
                Company Name <span className="text-white/15">(optional)</span>
              </label>
              <Input
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Acme Services Inc"
                className="bg-white/[0.03] border-white/[0.08] text-white placeholder:text-white/20 h-10 text-sm rounded-lg"
                autoComplete="organization"
              />
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-lg bg-red-500/5 border border-red-500/10 px-3 py-2 text-xs text-red-400">
              {error}
            </div>
          )}

          {/* Submit */}
          <Button
            type="submit"
            disabled={submitting}
            className="w-full bg-white hover:bg-white/90 text-black font-semibold text-sm h-11 rounded-xl transition-all duration-200"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
            ) : (
              <CreditCard className="h-4 w-4 mr-1.5" />
            )}
            {submitting ? "Redirecting to Paystack..." : "Subscribe with Paystack"}
            {!submitting && <ArrowRight className="h-4 w-4 ml-1.5" />}
          </Button>

          {/* Footer */}
          <div className="flex items-center justify-center gap-1.5 text-[11px] text-white/20">
            <ShieldCheck className="h-3 w-3" />
            Secure payment via Paystack
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
