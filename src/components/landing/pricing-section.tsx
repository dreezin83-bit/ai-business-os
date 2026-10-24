"use client";

import Link from "next/link";
import { useState } from "react";
import { Check } from "lucide-react";

/**
 * PricingSection — single-plan pricing with a Monthly / 6 Months / Yearly
 * billing toggle. Truthful by construction:
 *   - Every plan: $399 for the first month, then the rate shown.
 *   - Yearly is 5% off the monthly rate ($199 → $189/mo), billed annually.
 * No crossed-out anchors, no urgency copy, no limited-offer claims (those are
 * pending owner confirmation per the business plan and must not ship).
 */
type Period = "monthly" | "half" | "yearly";

const PERIODS: { id: Period; label: string; badge?: string }[] = [
  { id: "monthly", label: "Monthly" },
  { id: "half", label: "6 Months" },
  { id: "yearly", label: "Yearly", badge: "Save 5%" },
];

const DETAILS: Record<
  Period,
  { rate: string; suffix: string; billed: string }
> = {
  monthly: { rate: "$199", suffix: "/mo", billed: "Billed monthly after the first month" },
  half: { rate: "$199", suffix: "/mo", billed: "Billed every 6 months — $1,194 per period" },
  yearly: { rate: "$189", suffix: "/mo", billed: "Billed annually — $2,268 per year (5% off)" },
};

const INCLUSIONS = [
  "AI phone receptionist — answers & qualifies calls 24/7",
  "Website chatbot powered by your AI Brain",
  "Lead capture & CRM pipeline",
  "Automatic appointment booking",
  "Email follow-up automation",
  "Knowledge base you control (services, pricing, areas)",
  "Reporting & analytics dashboard",
  "10,000 AI credits included every month",
];

export default function PricingSection() {
  const [period, setPeriod] = useState<Period>("monthly");
  const detail = DETAILS[period];

  return (
    <section
      id="pricing"
      className="py-16 md:py-24 border-t border-white/[0.04]"
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="text-center mb-10">
          <p className="text-xs uppercase tracking-[0.2em] text-purple-400 font-semibold mb-3">
            Pricing
          </p>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
            One plan. Everything included.
          </h2>
          <p className="text-slate-400 max-w-xl mx-auto">
            A flat monthly rate for the whole AI front office — no per-seat
            fees, no setup charges.
          </p>
        </div>

        {/* Billing toggle */}
        <div className="flex justify-center mb-10">
          <div className="inline-flex items-center gap-1 rounded-full bg-white/[0.05] border border-white/[0.08] p-1">
            {PERIODS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPeriod(p.id)}
                aria-pressed={period === p.id}
                className={`relative inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold transition-colors ${
                  period === p.id
                    ? "bg-purple-500 text-white shadow-md shadow-purple-500/25"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {p.label}
                {p.badge && (
                  <span className="inline-flex items-center rounded-full bg-emerald-500/15 border border-emerald-500/30 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-emerald-300">
                    {p.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Plan card */}
        <div className="glass rounded-3xl p-8 md:p-10 max-w-2xl mx-auto relative overflow-hidden">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-white">
                Sagenify AI
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                For service businesses
              </p>
            </div>
            <span className="inline-flex items-center rounded-full bg-purple-500/10 border border-purple-500/25 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-purple-300">
              Most popular
            </span>
          </div>

          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-5xl font-bold tracking-tight text-white">
              {detail.rate}
            </span>
            <span className="text-lg text-slate-400 font-medium">
              {detail.suffix}
            </span>
          </div>
          <p className="text-xs text-slate-400 mb-2">{detail.billed}</p>
          <p className="text-xs text-slate-500 mb-8">
            First month $399, then the rate above. Prices in USD.
          </p>

          <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-2.5 mb-8">
            {INCLUSIONS.map((item) => (
              <li
                key={item}
                className="flex items-start gap-2.5 text-[13px] text-slate-300"
              >
                <Check className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
                {item}
              </li>
            ))}
          </ul>

          <Link
            href="/sign-up"
            className="inline-flex h-12 w-full items-center justify-center rounded-full bg-purple-500 hover:bg-purple-400 text-white font-semibold text-[15px] transition-colors"
          >
            Start Free Trial
          </Link>
          <p className="text-center text-[11px] text-slate-500 mt-3">
            No credit card required to start.
          </p>
        </div>
      </div>
    </section>
  );
}