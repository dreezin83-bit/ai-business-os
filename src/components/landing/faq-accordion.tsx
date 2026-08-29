"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

/**
 * Lightweight accessible accordion — no Radix dependency (radix-accordion is
 * intentionally not installed; package.json is owned by the architect).
 * Implements the WAI-ARIA accordion pattern: button + aria-expanded,
 * aria-controls, and region semantics.
 */
const FAQS = [
  {
    q: "How fast can I get started?",
    a: "Right after subscribing you go through a short onboarding wizard — about 15 minutes — where you add your business details, services, and hours. Your AI assistant is then live on your website and phone number.",
  },
  {
    q: "Does the AI really answer the phone?",
    a: "Yes. Your dedicated phone number is answered by your AI receptionist 24/7. It greets callers, qualifies the lead, answers questions from your knowledge base, and books appointments — handing off to your team whenever the caller asks for a person.",
  },
  {
    q: "What happens when I miss a call or a chat after hours?",
    a: "Nothing gets missed. Every unanswered call and chat is handled by the AI, captured as a lead in your CRM, and you get an instant notification. Follow-ups are automated so a lead is never left hanging.",
  },
  {
    q: "Do I need to know how to code or set anything technical up?",
    a: "No. Setup is wizard-driven: upload or link your business info and the AI learns it. If you want, we can also handle provisioning of your phone number and website widget for you.",
  },
  {
    q: "Can my team still talk to customers directly?",
    a: "Absolutely. You control exactly when the AI hands off — say, when a caller asks for a human, or on high-value leads. All conversations and leads live in one dashboard your team can pick up anytime.",
  },
  {
    q: "What does it cost?",
    a: "The first month is $399, then $199/month recurring. That includes your AI receptionist, website chatbot, CRM, appointment booking, email automation, and reporting — no per-seat fees.",
  },
];

export default function FaqAccordion() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <div className="mx-auto max-w-2xl space-y-3">
      {FAQS.map((faq, i) => {
        const isOpen = open === i;
        return (
          <div
            key={faq.q}
            className={`rounded-xl border transition-colors ${
              isOpen
                ? "border-indigo-500/30 bg-slate-900/80"
                : "border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12]"
            }`}
          >
            <h3>
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : i)}
                aria-expanded={isOpen}
                aria-controls={`faq-panel-${i}`}
                id={`faq-trigger-${i}`}
                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
              >
                <span
                  className={`text-[15px] font-medium transition-colors ${
                    isOpen ? "text-white" : "text-slate-300"
                  }`}
                >
                  {faq.q}
                </span>
                <ChevronDown
                  className={`h-4 w-4 shrink-0 text-slate-500 transition-transform duration-300 ${
                    isOpen ? "rotate-180 text-indigo-400" : ""
                  }`}
                />
              </button>
            </h3>
            <div
              id={`faq-panel-${i}`}
              role="region"
              aria-labelledby={`faq-trigger-${i}`}
              className={`grid transition-all duration-300 ease-out ${
                isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
              }`}
            >
              <div className="overflow-hidden">
                <p className="px-5 pb-5 text-sm leading-relaxed text-slate-400">
                  {faq.a}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
