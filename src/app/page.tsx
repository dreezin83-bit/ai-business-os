import Link from "next/link";
import {
  ArrowRight,
  MessageCircle,
  Mail,
  Sparkles,
  ChevronRight,
  ShieldCheck,
} from "lucide-react";
import ChatSimulator from "@/components/landing/chat-simulator";
import SubscribeCta from "@/components/landing/subscribe-cta";
import RoiCalculator from "@/components/landing/roi-calculator";
import BentoGrid from "@/components/landing/bento-grid";
import PricingCard from "@/components/landing/pricing-card";
import FaqAccordion from "@/components/landing/faq-accordion";

/**
 * Landing page — React Server Component. All interactivity lives in the
 * client islands below (ChatSimulator, RoiCalculator, PricingCard,
 * FaqAccordion, SubscribeCta) so the static shell can be CDN-cached.
 */
export default function HomePage() {
  return (
    <div className="bg-[#0F172A] text-slate-50 overflow-x-hidden">
      {/* ─── Nav ─────────────────────────────────────────────────────── */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#0F172A]/85 backdrop-blur-xl border-b border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 flex items-center justify-between h-16">
          <a href="#top" className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-lg bg-indigo-500 flex items-center justify-center text-[10px] font-bold text-white shadow-lg shadow-indigo-500/30">
              AI
            </div>
            <span className="font-semibold text-[15px] tracking-tight">
              Sagenify AI
            </span>
          </a>
          <nav className="hidden md:flex items-center gap-6 text-[13px] text-slate-400">
            <a href="#features" className="hover:text-white transition-colors">
              Features
            </a>
            <a href="#roi" className="hover:text-white transition-colors">
              ROI Calculator
            </a>
            <a href="#pricing" className="hover:text-white transition-colors">
              Pricing
            </a>
            <a href="#faq" className="hover:text-white transition-colors">
              FAQ
            </a>
          </nav>
          <div className="flex items-center gap-2">
            <a
              href="https://wa.me/13057071059"
              target="_blank"
              rel="noreferrer"
              className="hidden md:flex items-center gap-1.5 text-[13px] text-slate-400 hover:text-white transition-colors px-3 py-1.5 rounded-full hover:bg-white/5"
            >
              <MessageCircle className="h-3.5 w-3.5" /> Support
            </a>
            <Link
              href="/sign-in"
              className="text-[13px] text-slate-400 hover:text-white transition-colors px-3 py-1.5"
            >
              Sign In
            </Link>
            <SubscribeCta
              size="sm"
              className="bg-white hover:bg-white/90 text-black font-semibold text-xs h-9 px-5 rounded-full"
            >
              Subscribe Now
            </SubscribeCta>
          </div>
        </div>
      </header>

      {/* ─── Hero ────────────────────────────────────────────────────── */}
      <section id="top" className="relative pt-32 pb-16 md:pt-40 md:pb-20 overflow-hidden">
        {/* Radial indigo glow */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-900/30 via-slate-900/0 to-transparent"
        />
        {/* Subtle grid */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgba(148,163,184,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(148,163,184,0.05) 1px, transparent 1px)",
            backgroundSize: "56px 56px",
            maskImage:
              "radial-gradient(ellipse 80% 60% at 50% 0%, black 40%, transparent 100%)",
            WebkitMaskImage:
              "radial-gradient(ellipse 80% 60% at 50% 0%, black 40%, transparent 100%)",
          }}
        />

        <div className="relative max-w-7xl mx-auto px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-[13px] text-slate-300 mb-7 animate-fade-in">
              <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
              Your AI receptionist, chatbot &amp; CRM in one platform
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-6xl font-bold tracking-tight leading-[1.05] animate-fade-up">
              Never miss{" "}
              <span className="text-gradient-indigo">another customer</span>{" "}
              again.
            </h1>

            <p className="text-base md:text-lg text-slate-400 mt-6 leading-relaxed max-w-xl mx-auto animate-fade-up delay-100">
              Sagenify answers your calls and chats 24/7, qualifies every lead,
              books appointments, and follows up automatically — so no customer
              ever slips through the cracks.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-9 animate-fade-up delay-200">
              <SubscribeCta
                size="lg"
                className="bg-white hover:bg-white/90 text-black font-semibold text-[15px] h-12 px-8 rounded-full"
              >
                Subscribe Now
                <ArrowRight className="h-4 w-4 ml-1.5" />
              </SubscribeCta>
              <a
                href="#features"
                className="inline-flex items-center gap-1.5 h-12 px-7 rounded-full border border-white/15 text-slate-200 text-[15px] font-medium hover:bg-white/5 hover:border-white/25 transition-colors"
              >
                See how it works
                <ChevronRight className="h-4 w-4" />
              </a>
            </div>

            <p className="mt-4 text-xs text-slate-500 flex items-center justify-center gap-1.5 animate-fade-up delay-300">
              <ShieldCheck className="h-3.5 w-3.5" />
              First month $399, then $199/month · Cancel anytime
            </p>
          </div>

          {/* Interactive chat simulator */}
          <div className="mx-auto max-w-xl mt-14 animate-fade-up delay-300">
            <ChatSimulator />
          </div>
        </div>
      </section>

      {/* ─── ROI Calculator ──────────────────────────────────────────── */}
      <section id="roi" className="py-16 md:py-24 border-t border-white/[0.04]">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-indigo-400 font-semibold mb-3">
              ROI Calculator
            </p>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
              See what a missed call really costs
            </h2>
            <p className="text-slate-400 leading-relaxed mb-6">
              Every unanswered call is a customer your competitor answers. Drag
              the slider to your missed-call volume and pick your average ticket
              — we&apos;ll show the annual revenue an AI receptionist helps you
              recover.
            </p>
            <ul className="space-y-2.5 text-sm text-slate-300">
              {[
                "No more lost calls after hours or during lunch",
                "Every lead captured, qualified & followed up",
                "Booked appointments, not just voicemails",
              ].map((t) => (
                <li key={t} className="flex items-start gap-2.5">
                  <ArrowRight className="h-4 w-4 text-indigo-400 mt-0.5 shrink-0" />
                  {t}
                </li>
              ))}
            </ul>
          </div>
          <RoiCalculator />
        </div>
      </section>

      {/* ─── Bento grid ──────────────────────────────────────────────── */}
      <section id="features" className="py-16 md:py-24 border-t border-white/[0.04]">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-12">
            <p className="text-xs uppercase tracking-[0.2em] text-indigo-400 font-semibold mb-3">
              What you get
            </p>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
              Everything a service business needs to never miss a lead
            </h2>
            <p className="text-slate-400 max-w-xl mx-auto">
              One workspace for your AI receptionist, leads, bookings, and
              follow-ups — no scattered tools.
            </p>
          </div>
          <BentoGrid />
        </div>
      </section>

      {/* ─── Trust ticker ────────────────────────────────────────────── */}
      <section className="py-10 border-y border-white/[0.04]">
        <p className="text-center text-xs uppercase tracking-[0.2em] text-slate-500 mb-6">
          Built for service businesses
        </p>
        <div className="marquee-mask overflow-hidden">
          <div className="animate-marquee flex w-max items-center gap-10">
            {[
              "HVAC",
              "Plumbing",
              "Roofing",
              "Dental",
              "Legal",
              "Electrical",
              "Pest Control",
              "Landscaping",
              "Auto Repair",
              "Cleaning",
            ].map((industry) => (
              <span
                key={industry}
                className="flex items-center gap-10 text-[15px] font-semibold text-slate-500 whitespace-nowrap"
              >
                {industry}
                <span className="h-1 w-1 rounded-full bg-indigo-500/50" />
              </span>
            ))}
            {/* Duplicate for a seamless loop */}
            {[
              "HVAC",
              "Plumbing",
              "Roofing",
              "Dental",
              "Legal",
              "Electrical",
              "Pest Control",
              "Landscaping",
              "Auto Repair",
              "Cleaning",
            ].map((industry) => (
              <span
                key={`${industry}-2`}
                className="flex items-center gap-10 text-[15px] font-semibold text-slate-500 whitespace-nowrap"
              >
                {industry}
                <span className="h-1 w-1 rounded-full bg-indigo-500/50" />
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Pricing ─────────────────────────────────────────────────── */}
      <section id="pricing" className="py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-12">
            <p className="text-xs uppercase tracking-[0.2em] text-indigo-400 font-semibold mb-3">
              Pricing
            </p>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
              Simple, flat pricing
            </h2>
            <p className="text-slate-400 max-w-xl mx-auto">
              One plan, everything included. First month $399, then $199/month
              recurring — cancel anytime.
            </p>
          </div>
          <PricingCard />
        </div>
      </section>

      {/* ─── FAQ ─────────────────────────────────────────────────────── */}
      <section id="faq" className="py-16 md:py-24 border-t border-white/[0.04]">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-12">
            <p className="text-xs uppercase tracking-[0.2em] text-indigo-400 font-semibold mb-3">
              FAQ
            </p>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
              Questions, answered
            </h2>
          </div>
          <FaqAccordion />
        </div>
      </section>

      {/* ─── Footer ──────────────────────────────────────────────────── */}
      <footer className="border-t border-white/[0.04] py-12">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid sm:grid-cols-3 gap-10 mb-10">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="h-6 w-6 rounded-md bg-indigo-500 flex items-center justify-center text-[10px] font-bold text-white">
                  AI
                </div>
                <span className="font-semibold text-sm">Sagenify AI</span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                AI-powered operating system for service businesses.
              </p>
            </div>
            <div>
              <h4 className="text-xs font-semibold text-slate-400 mb-3">
                Contact
              </h4>
              <div className="space-y-2 text-xs text-slate-500">
                <a
                  href="https://wa.me/13057071059"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 hover:text-white transition-colors"
                >
                  <MessageCircle className="h-3 w-3" /> WhatsApp
                </a>
                <a
                  href="mailto:notifications@sagenifyai.com"
                  className="flex items-center gap-2 hover:text-white transition-colors"
                >
                  <Mail className="h-3 w-3" /> Email Support
                </a>
              </div>
            </div>
            <div>
              <h4 className="text-xs font-semibold text-slate-400 mb-3">
                Legal
              </h4>
              <div className="space-y-2 text-xs text-slate-500">
                <Link
                  href="/privacy"
                  className="cursor-pointer hover:text-white transition-colors"
                >
                  Privacy Policy
                </Link>
                <Link
                  href="/terms"
                  className="cursor-pointer hover:text-white transition-colors"
                >
                  Terms of Service
                </Link>
              </div>
            </div>
          </div>
          <div className="pt-8 border-t border-white/[0.04] text-center text-[11px] text-slate-600">
            © 2026 Sagenify AI
          </div>
        </div>
      </footer>
    </div>
  );
}
