import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowLeft,
  BookOpen,
  Bot,
  CalendarCheck2,
  CreditCard,
  MessageCircle,
  Phone,
  Sparkles,
} from "lucide-react";
import { DISCORD_INVITE_URL } from "@/components/landing/site-links";

export const metadata: Metadata = {
  title: "Docs & Help Center — Sagenify AI",
  description:
    "Get started with Sagenify AI: set up your AI Brain, website chatbot, phone receptionist, CRM, appointment booking and billing.",
};

const SECTIONS = [
  {
    icon: Sparkles,
    title: "Getting started",
    body: "Sign up, complete onboarding, and add your business details. Your workspace comes with an AI Brain, website chatbot, phone receptionist, CRM, appointment booking and email automation — everything in one place.",
  },
  {
    icon: BookOpen,
    title: "Train your AI Brain",
    body: "Upload FAQs, service menus, pricing and policies to the Knowledge Base. The AI Brain answers from your business's own information — no generic responses, no hallucinations of your services.",
  },
  {
    icon: Bot,
    title: "Website chatbot",
    body: "Copy the embed script into your site to add a 24/7 chat widget. The chatbot captures leads, qualifies visitors, and books appointments straight into your CRM.",
  },
  {
    icon: Phone,
    title: "AI phone receptionist",
    body: "Sagenify answers missed calls, qualifies callers, and schedules appointments. Active conversations finish gracefully — new AI work simply pauses if your monthly credit allowance runs out.",
  },
  {
    icon: CalendarCheck2,
    title: "Appointments & follow-up",
    body: "Leads book into your calendar automatically. Email automation sends reminders and follow-ups so no job ever slips through the cracks.",
  },
  {
    icon: CreditCard,
    title: "Billing & credits",
    body: "First month is $399, then $199/month recurring. Every plan includes 10,000 AI credits per month for chat, phone, and AI features. You can pause or cancel anytime from your account settings.",
  },
];

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-black text-slate-50 overflow-x-hidden">
      {/* Walk-up header using the same fixed nav pattern as the landing page */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-black/85 backdrop-blur-xl border-b border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-lg bg-purple-500 flex items-center justify-center text-[10px] font-bold text-white shadow-lg shadow-purple-500/30">
              AI
            </div>
            <span className="font-semibold text-[15px] tracking-tight">
              Sagenify AI
            </span>
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-[13px] text-slate-400">
            <a href="/#features" className="hover:text-white transition-colors">
              Features
            </a>
            <a href="/#pricing" className="hover:text-white transition-colors">
              Pricing
            </a>
            <a href="/docs" className="text-white">
              Docs
            </a>
          </nav>
          <Link
            href="/sign-up"
            className="bg-purple-500 hover:bg-purple-400 text-white font-semibold text-xs h-9 px-5 rounded-full inline-flex items-center justify-center transition-colors"
          >
            Get Started
          </Link>
        </div>
      </header>

      <main className="relative pt-32 pb-24 max-w-3xl mx-auto px-6 lg:px-8">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-[13px] text-slate-500 hover:text-white transition-colors mb-8"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to home
        </Link>

        <p className="text-xs uppercase tracking-[0.2em] text-purple-400 font-semibold mb-3">
          Docs & Help Center
        </p>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
          Everything you need to get started
        </h1>
        <p className="text-slate-400 text-base leading-relaxed mb-12">
          Setup guides for every module of your Sagenify AI workspace. Can't
          find what you need? Join our community on Discord for fast support.
        </p>

        <div className="space-y-5">
          {SECTIONS.map((section) => (
            <div
              key={section.title}
              className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 hover:border-purple-500/25 transition-colors"
            >
              <div className="flex items-start gap-4">
                <div className="h-10 w-10 shrink-0 rounded-xl bg-gradient-to-br from-purple-500/25 to-violet-500/5 border border-purple-500/20 flex items-center justify-center">
                  <section.icon className="h-5 w-5 text-purple-300" />
                </div>
                <div>
                  <h2 className="text-[15px] font-semibold mb-1.5">
                    {section.title}
                  </h2>
                  <p className="text-sm text-slate-400 leading-relaxed">
                    {section.body}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 rounded-2xl border border-purple-500/25 bg-purple-500/[0.06] p-6 text-center">
          <MessageCircle className="h-6 w-6 text-purple-300 mx-auto mb-3" />
          <h2 className="text-lg font-semibold mb-1">
            Still have questions?
          </h2>
          <p className="text-sm text-slate-400 mb-4">
            Get help from the team and other operators in our Discord community.
          </p>
          <a
            href={DISCORD_INVITE_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-10 items-center justify-center rounded-full bg-purple-500 hover:bg-purple-400 text-white font-semibold text-sm px-6 transition-colors"
          >
            Join Discord support
          </a>
        </div>
      </main>

      <footer className="border-t border-white/[0.04] py-10">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-600">
          <span>© 2026 Sagenify AI</span>
          <div className="flex items-center gap-6">
            <Link href="/privacy" className="hover:text-white transition-colors">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-white transition-colors">
              Terms
            </Link>
            <Link href="/docs" className="hover:text-white transition-colors">
              Docs
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}