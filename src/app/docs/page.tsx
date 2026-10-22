import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowLeft,
  BookOpen,
  Bot,
  BrainCircuit,
  CalendarCheck2,
  Coins,
  CreditCard,
  Gauge,
  Inbox,
  Mail,
  MessagesSquare,
  Phone,
  Plug,
  Sparkles,
  Users,
} from "lucide-react";
import { DISCORD_INVITE_URL } from "@/components/landing/site-links";

export const metadata: Metadata = {
  title: "Docs & Help Center — Sagenify AI",
  description:
    "Platform documentation for Sagenify AI: AI Brain, website chatbot, voice receptionist, CRM & leads, appointments, email automation, knowledge base, credits, and integrations.",
};

const MODULES = [
  {
    icon: BrainCircuit,
    title: "AI Brain",
    body: "The engine behind everything. Your AI Brain is trained on your business — your services, hours, policies, and answers — so every conversation is grounded in your real information, not generic responses.",
  },
  {
    icon: Bot,
    title: "Website Chatbot",
    body: "An embeddable chat widget for your site that answers visitors 24/7, captures leads, qualifies them, and books appointments directly into your CRM. The embed is secure and tenant-scoped.",
  },
  {
    icon: Phone,
    title: "Voice Receptionist",
    body: "Your own AI phone receptionist answers missed and after-hours calls, greets callers, answers questions, qualifies leads, and schedules appointments — handing off to your team whenever a caller asks for a person.",
  },
  {
    icon: Users,
    title: "CRM & Lead Management",
    body: "Every chat, call, and form submission becomes a lead in one pipeline. Track status, source, notes, and follow-up history, and know exactly which leads need attention.",
  },
  {
    icon: CalendarCheck2,
    title: "Appointments",
    body: "Appointments booked by the chatbot or receptionist land on your calendar automatically. Set availability, staff and services, and let Sagenify fill the gaps.",
  },
  {
    icon: Mail,
    title: "Email Automation",
    body: "Automated emails for reminders, follow-ups, and nurture sequences, built from templates that use your business's variables — so nothing falls through the cracks.",
  },
  {
    icon: BookOpen,
    title: "Knowledge Base",
    body: "Upload FAQs, pricing menus, policies, and how-tos. The knowledge base is what your AI Brain reads from — keep it current and your AI gets smarter automatically.",
  },
  {
    icon: Coins,
    title: "AI Credits",
    body: "Usage is metered in AI credits, included with your plan each month and tracked transparently in your dashboard. See exactly what each conversation consumes and monitor your balance in real time.",
  },
  {
    icon: Plug,
    title: "Integrations",
    body: "Connect the tools you already use — payment provider, calendar, email, and more. Sagenify is built as an open platform so your data flows where you need it.",
  },
  {
    icon: Gauge,
    title: "Reporting",
    body: "Dashboards that show leads, appointments, conversations, and delivery metrics across your business — your KPIs at a glance, updated automatically.",
  },
];

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-black text-slate-50 overflow-x-hidden">
      {/* Walk-up header — same fixed nav pattern as the landing page */}
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
            <a href="/#faq" className="hover:text-white transition-colors">
              FAQ
            </a>
            <Link href="/docs" className="text-white">
              Docs
            </Link>
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
          The Sagenify AI platform, explained
        </h1>
        <p className="text-slate-400 text-base leading-relaxed mb-12">
          Sagenify AI is an AI-powered operating system for service businesses.
          One workspace that answers every call and chat, captures and nurtures
          every lead, and books and follows up on every appointment. Here's how
          each module fits together — honest descriptions, nothing over-promised.
        </p>

        <div className="space-y-5">
          {MODULES.map((module) => (
            <div
              key={module.title}
              className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 hover:border-purple-500/25 transition-colors"
            >
              <div className="flex items-start gap-4">
                <div className="h-10 w-10 shrink-0 rounded-xl bg-gradient-to-br from-purple-500/25 to-violet-500/5 border border-purple-500/20 flex items-center justify-center">
                  <module.icon className="h-5 w-5 text-purple-300" />
                </div>
                <div>
                  <h2 className="text-[15px] font-semibold mb-1.5">
                    {module.title}
                  </h2>
                  <p className="text-sm text-slate-400 leading-relaxed">
                    {module.body}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 rounded-2xl border border-purple-500/25 bg-purple-500/[0.06] p-6 text-center">
          <MessagesSquare className="h-6 w-6 text-purple-300 mx-auto mb-3" />
          <h2 className="text-lg font-semibold mb-1">
            Still have questions?
          </h2>
          <p className="text-sm text-slate-400 mb-4">
            Get help from the team and other operators in our Discord community.
          </p>
          <a
            href={DISCORD_INVITE_URL}
            target="_blank"
            rel="noopener noreferrer"
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