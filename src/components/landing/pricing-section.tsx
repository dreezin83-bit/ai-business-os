"use client";

import Link from "next/link";
import { useState } from "react";
import { Check } from "lucide-react";

/**
 * PricingSection — single-plan pricing with a Monthly / 6 Months / Yearly
 * billing toggle rendering three DISTINCT plan presentations.
 *
 * Owner direction 2026-10-24 (task 0d1c5c78):
 *   - Month 1 is $199/mo like every month — the first-month special is
 *     GONE from billing and from this section.
 *   - "$299/mo" is the real standard list price anchor (crossed out above the
 *     active price; early bird gets $199).
 *   - The banner text below is owner copy, shipped VERBATIM (single source
 *     line so the exact string stays byte-identical).
 *   - Periods: Monthly "$199/mo" (Billed monthly) · 6 Months "$1,194 every
 *     6 months" with a truthful "6 × $199" badge · Yearly "$189/mo
 *     equivalent", "Save 5%", "$2,268 billed annually".
 * No fake % discounts, no invented deadlines — "Ending Soon" is backed by a
 * real 10,000-slot early-bird cap being implemented in the same release.
 */
type Period = "monthly" | "half" | "yearly";

const PERIODS: { id: Period; label: string; badge?: string }[] = [
  { id: "monthly", label: "Monthly" },
  { id: "half", label: "6 Months", badge: "6 × $199" },
  { id: "yearly", label: "Yearly", badge: "Save 5%" },
];

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

/** Per-period presentation: every card shows its own billing model. */
const PLANS: Record<
  Period,
  {
    badge: string;
    anchor: string;
    rate: string;
    unit: string;
    billing: string;
    total: string;
  }
> = {
  monthly: {
    badge: "Most popular",
    anchor: "$299/mo",
    rate: "$199",
    unit: "/mo",
    billing: "Billed monthly",
    total: "",
  },
  half: {
    badge: "6 × $199",
    anchor: "$299/mo",
    rate: "$199",
    unit: "/mo",
    billing: "Billed every 6 months",
    total: "$1,194 every 6 months",
  },
  yearly: {
    badge: "Save 5%",
    anchor: "$299/mo",
    rate: "$189",
    unit: "/mo",
    billing: "$189/mo equivalent — billed annually",
    total: "$2,268 billed annually",
  },
};

export default function PricingSection() {
  const [period, setPeriod] = useState<Period>("monthly");
  const plan = PLANS[period];
  const active = PERIODS.find((p) => p.id === period)!;

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
        <div className="flex justify-center mb-6">
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
                  <span
                    className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${
                      period === p.id
                        ? "bg-white/15 text-white"
                        : "bg-emerald-500/15 border border-emerald-500/30 text-emerald-300"
                    }`}
                  >
                    {p.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Early-bird banner — owner copy, verbatim (real 10,000-slot cap backing "Ending Soon") */}
        <div className="max-w-2xl mx-auto mb-8">
          <div className="rounded-2xl border border-amber-400/25 bg-gradient-to-r from-amber-500/[0.08] via-purple-500/[0.06] to-amber-500/[0.08] px-5 py-4 text-center">
            <p className="text-[13px] font-semibold text-amber-200 leading-relaxed">
              Early Bird Discount for the first 10,000 users — Ending Soon! Lock in $199/mo for life (No future price increases).
            </p>
          </div>
        </div>

        {/* Plan card — distinct presentation per period */}
        <div className="glass rounded-3xl p-8 md:p-10 max-w-2xl mx-auto relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="text-lg font-bold text-white">
                Sagenify AI
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                For service businesses
              </p>
            </div>
            <span className="inline-flex items-center rounded-full bg-purple-500/10 border border-purple-500/25 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-purple-300">
              {plan.badge}
            </span>
          </div>

          {/* Real list-price anchor, crossed out (tab index 0 so SR users hear the list price first) */}
          <div className="pt-5 pb-0">
            <span className="inline-block text-base font-semibold text-slate-500 line-through decoration-slate-500/70 decoration-2">
              {plan.anchor}
            </span>
          </div>

          <div className="flex items-baseline gap-2">
            <span className="text-5xl font-bold tracking-tight text-white">
              {plan.rate}
            </span>
            <span className="text-lg text-slate-400 font-medium">
              {plan.unit}
            </span>
          </div>

          {plan.total ? (
            <p className="text-sm font-semibold text-emerald-300 mt-2">
              {plan.total}
            </p>
          ) : null}
          <p className="text-xs text-slate-400 mt-1.5 mb-7">{plan.billing}</p>

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
            Subscribe
          </Link>
        </div>
      </div>
    </section>
  );
}