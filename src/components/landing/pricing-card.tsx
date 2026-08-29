"use client";

import { useState } from "react";
import SubscribeCta from "@/components/landing/subscribe-cta";
import { Badge } from "@/components/ui/badge";
import { Check, ShieldCheck } from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// PRICING CONSTANTS — single source of truth for the landing page pricing card.
//
// Approved, owner-ratified offer:
//   First month $399, then $199/month recurring (billed via Paystack).
//
// YEARLY_DISCOUNT_PCT is a WORKING HYPOTHESIS, NOT owner-ratified.
// The yearly price displayed is derived from this single constant so the whole
// page can be re-priced by editing one number once the lead ratifies it.
// Do NOT promote the yearly price as final until ratification.
// ─────────────────────────────────────────────────────────────────────────────
const MONTHLY_FIRST_MONTH = 399;
const MONTHLY_RECURRING = 199;
const YEARLY_DISCOUNT_PCT = 15; // pending owner ratification

const YEARLY_PER_MONTH = Math.round(
  MONTHLY_RECURRING * (1 - YEARLY_DISCOUNT_PCT / 100)
);

const fmt = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const FEATURES = [
  "AI website chatbot that answers 24/7",
  "AI phone receptionist (call, qualify, book)",
  "CRM with automatic lead capture",
  "Appointment booking & confirmations",
  "Email automation & follow-up sequences",
  "Knowledge base your AI learns from",
  "Reporting, alerts & human handoff",
];

export default function PricingCard() {
  const [yearly, setYearly] = useState(false);

  const perMonth = yearly ? YEARLY_PER_MONTH : MONTHLY_RECURRING;

  return (
    <div className="relative mx-auto max-w-md">
      {/* Glow */}
      <div className="absolute -inset-4 rounded-3xl bg-indigo-600/20 blur-2xl" aria-hidden />

      <div className="relative rounded-2xl border border-white/10 bg-slate-900/80 backdrop-blur-xl p-7 md:p-8">
        {/* Billing toggle */}
        <div className="flex items-center justify-center gap-1 mb-7">
          <button
            type="button"
            onClick={() => setYearly(false)}
            className={`rounded-full px-4 py-1.5 text-[13px] font-medium transition-colors ${
              !yearly
                ? "bg-white text-black"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Monthly
          </button>
          <button
            type="button"
            onClick={() => setYearly(true)}
            className={`rounded-full px-4 py-1.5 text-[13px] font-medium transition-colors flex items-center gap-1.5 ${
              yearly
                ? "bg-white text-black"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Yearly
            <span
              className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                yearly ? "bg-indigo-500 text-white" : "bg-indigo-500/20 text-indigo-300"
              }`}
            >
              -{YEARLY_DISCOUNT_PCT}%
            </span>
          </button>
        </div>

        <div className="text-center mb-7">
          {yearly ? (
            <div>
              <div className="flex items-end justify-center gap-1">
                <span className="text-5xl font-bold tracking-tight text-white">
                  {fmt.format(perMonth)}
                </span>
                <span className="text-sm text-slate-400 mb-2">/mo</span>
              </div>
              <p className="text-[13px] text-slate-400 mt-1.5">
                Billed annually ({fmt.format(perMonth * 12)}/year) — save{" "}
                {YEARLY_DISCOUNT_PCT}%
              </p>
            </div>
          ) : (
            <div>
              <div className="flex items-end justify-center gap-1">
                <span className="text-5xl font-bold tracking-tight text-white">
                  {fmt.format(MONTHLY_FIRST_MONTH)}
                </span>
                <span className="text-sm text-slate-400 mb-2">first month</span>
              </div>
              <p className="text-[13px] text-slate-400 mt-1.5">
                then {fmt.format(MONTHLY_RECURRING)}/month, recurring
              </p>
            </div>
          )}
          <Badge className="mt-3 bg-indigo-500/15 text-indigo-300 border border-indigo-500/25 font-medium">
            Everything included
          </Badge>
        </div>

        <ul className="space-y-2.5 mb-8">
          {FEATURES.map((f) => (
            <li key={f} className="flex items-start gap-2.5 text-[13.5px] text-slate-300">
              <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-indigo-500/20">
                <Check className="h-3 w-3 text-indigo-300" />
              </span>
              {f}
            </li>
          ))}
        </ul>

        <SubscribeCta
          variant="default"
          size="lg"
          className="w-full bg-white hover:bg-white/90 text-black font-semibold h-12 rounded-xl"
        >
          Subscribe now
        </SubscribeCta>

        <p className="flex items-center justify-center gap-1.5 mt-4 text-[11px] text-slate-500">
          <ShieldCheck className="h-3.5 w-3.5 text-slate-600" />
          Secure checkout via Paystack · Cancel anytime
        </p>
      </div>
    </div>
  );
}
