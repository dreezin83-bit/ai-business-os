"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Script from "next/script";
import { motion, useInView, useScroll, useTransform } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  ArrowRight, Bot, Users, Calendar, Zap, BookOpen, Globe,
  Star, MessageCircle, Mail, Sparkles, BarChart3, Clock,
} from "lucide-react";
import Link from "next/link";
import SubscribeModal from "@/components/subscribe-modal";

const Spline = dynamic(() => import("@splinetool/react-spline/next"), { ssr: false });

const features = [
  { name: "AI Answers 24/7", desc: "Never miss a customer. Your AI qualifies leads, answers questions, and books appointments — even while you sleep.", icon: Bot, color: "from-blue-500/20 to-cyan-500/5" },
  { name: "Smart Lead Capture", desc: "Name, phone, email, and service — captured automatically from every conversation. Zero data entry.", icon: Users, color: "from-purple-500/20 to-pink-500/5" },
  { name: "Appointment Booking", desc: "Customers book directly through chat. AI checks availability and confirms instantly.", icon: Calendar, color: "from-amber-500/20 to-orange-500/5" },
  { name: "Instant Notifications", desc: "New lead? You get an email. Customer gets a confirmation. Everything logged.", icon: Zap, color: "from-green-500/20 to-emerald-500/5" },
  { name: "Knowledge Base", desc: "Upload documents, FAQs, and website URLs. Your AI learns everything about your business.", icon: BookOpen, color: "from-cyan-500/20 to-blue-500/5" },
  { name: "Built for Scale", desc: "One platform, unlimited contractors. Each gets their own AI, own leads, own settings.", icon: Globe, color: "from-red-500/20 to-rose-500/5" },
];

const productSteps = [
  {
    step: "01",
    title: "AI greets and qualifies",
    desc: "Customer lands on your site. The AI chatbot pops up, asks the right questions, and captures name, phone, email, and service needed — automatically.",
    visual: (
      <div className="glass rounded-2xl p-4 space-y-3 max-w-xs mx-auto">
        <div className="flex items-center gap-2 mb-1">
          <Bot className="h-4 w-4 text-blue-400" />
          <span className="text-xs text-white/40">AI Assistant</span>
        </div>
        <div className="space-y-2">
          <div className="bg-white/[0.04] rounded-xl p-2.5 text-xs text-white/60">Hi! 👋 How can I help you today?</div>
          <div className="flex justify-end">
            <div className="bg-blue-500/20 rounded-xl p-2.5 text-xs text-white/80">I need AC repair</div>
          </div>
          <div className="bg-white/[0.04] rounded-xl p-2.5 text-xs text-white/60">Got it! To book an appointment, I just need a few details. What&apos;s your name?</div>
        </div>
      </div>
    ),
  },
  {
    step: "02",
    title: "Lead captured in CRM",
    desc: "Every conversation is logged. Lead details are auto-filled. No manual data entry, no missed information.",
    visual: (
      <div className="glass rounded-2xl p-4 max-w-xs mx-auto">
        <div className="flex items-center gap-2 mb-3">
          <Users className="h-4 w-4 text-purple-400" />
          <span className="text-xs text-white/40">New Lead</span>
        </div>
        <div className="space-y-1.5">
          {[
            { label: "Name", value: "Jane Cooper" },
            { label: "Phone", value: "(555) 123-4567" },
            { label: "Service", value: "AC Repair" },
          ].map((f) => (
            <div key={f.label} className="flex justify-between text-xs bg-white/[0.03] rounded-lg px-2.5 py-2">
              <span className="text-white/30">{f.label}</span>
              <span className="text-white/70 font-medium">{f.value}</span>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    step: "03",
    title: "Instant notification",
    desc: "You get an email saying 'New lead: Jane, AC repair, 555-1234.' Customer gets a confirmation text. Done.",
    visual: (
      <div className="glass rounded-2xl p-4 max-w-xs mx-auto">
        <div className="flex items-center gap-2 mb-3">
          <Zap className="h-4 w-4 text-amber-400" />
          <span className="text-xs text-white/40">Notifications</span>
        </div>
        <div className="space-y-2">
          <div className="flex items-start gap-2 bg-white/[0.03] rounded-xl p-2.5">
            <Mail className="h-3.5 w-3.5 text-blue-400 mt-0.5 shrink-0" />
            <div className="text-xs">
              <p className="text-white/70 font-medium">New Lead: Jane Cooper</p>
              <p className="text-white/30">AC Repair · (555) 123-4567</p>
            </div>
          </div>
          <div className="flex items-start gap-2 bg-white/[0.03] rounded-xl p-2.5">
            <MessageCircle className="h-3.5 w-3.5 text-green-400 mt-0.5 shrink-0" />
            <div className="text-xs">
              <p className="text-white/70 font-medium">Confirmation sent</p>
              <p className="text-white/30">Appointment booked for tomorrow</p>
            </div>
          </div>
        </div>
      </div>
    ),
  },
];

const stats = [
  { value: 2400, suffix: "+", label: "Leads Captured" },
  { value: 98, suffix: "%", label: "Response Rate" },
  { value: 30, suffix: "s", label: "Avg Reply Time" },
  { value: 35, suffix: "%", label: "Revenue Increase" },
];

// Fade-up reveal component
function Reveal({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}

// Animated counter
function AnimatedCounter({ value }: { value: number }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!isInView) return;
    const duration = 1500;
    const steps = 30;
    const increment = value / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= value) { setCount(value); clearInterval(timer); }
      else setCount(Math.floor(current));
    }, duration / steps);
    return () => clearInterval(timer);
  }, [isInView, value]);

  return <span ref={ref}>{count.toLocaleString()}</span>;
}

export default function LandingPage() {
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const heroScale = useTransform(scrollYProgress, [0, 1], [1, 0.95]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
  const [subscribeOpen, setSubscribeOpen] = useState(false);

  return (
    <div className="bg-black text-white overflow-x-hidden">
      <SubscribeModal open={subscribeOpen} onClose={() => setSubscribeOpen(false)} />
      <Script src="https://unpkg.com/@splinetool/viewer@1.12.98/build/spline-viewer.js" type="module" />
      {/* Nav */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-xl border-b border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 flex items-center justify-between h-16">
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-lg bg-white flex items-center justify-center text-[10px] font-bold text-black">AI</div>
            <span className="font-semibold text-[15px] tracking-tight">Business OS</span>
          </div>
          <div className="flex items-center gap-2">
            <a href="https://wa.me/13057071059" target="_blank" className="hidden md:flex items-center gap-1.5 text-[13px] text-white/40 hover:text-white transition-colors px-3 py-1.5 rounded-full hover:bg-white/5">
              <MessageCircle className="h-3.5 w-3.5" /> Support
            </a>
            <Link href="/sign-in" className="text-[13px] text-white/40 hover:text-white transition-colors px-3 py-1.5">Sign In</Link>
            <Button size="sm" onClick={() => setSubscribeOpen(true)} className="bg-white hover:bg-white/90 text-black font-semibold text-xs h-9 px-5 rounded-full">Subscribe Now</Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <motion.section
        ref={heroRef}
        style={{ scale: heroScale, opacity: heroOpacity }}
        className="relative pt-20 pb-6 md:pt-28 md:pb-10 overflow-hidden"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.04),transparent_70%)]" />
        <div className="max-w-7xl mx-auto px-6 lg:px-8 relative z-10">
          <div className="flex flex-col lg:flex-row gap-6 lg:gap-12 lg:items-center">
            {/* Left - Text */}
            <div className="lg:flex-1">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.06] text-[13px] text-white/50 mb-8"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse-soft" />
                Now accepting early access users
              </motion.div>
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.1 }}
                className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[0.95]"
              >
                <span className="block">Never miss</span>
                <span className="block text-gradient">another customer</span>
                <span className="block">again.</span>
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.3 }}
                className="text-lg text-white/40 mt-8 leading-relaxed max-w-md"
              >
                Your AI answers 24/7, qualifies every lead, books appointments, and sends notifications — automatically.
              </motion.p>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.5 }}
                className="flex items-center gap-4 mt-10"
              >
                <Button size="lg" onClick={() => setSubscribeOpen(true)} className="bg-white hover:bg-white/90 text-black font-semibold text-[15px] h-12 px-8 rounded-full">
                  Subscribe Now <ArrowRight className="h-4 w-4 ml-1.5" />
                </Button>
                <Link href="/sign-up">
                  <Button variant="outline" size="lg" className="btn-outline text-[15px] h-12 px-8 rounded-full">
                    Free Trial
                  </Button>
                </Link>
              </motion.div>
            </div>

            {/* Right - Robot with business copy around it */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1, delay: 0.3 }}
              className="lg:flex-1 flex flex-col items-center gap-4"
            >
              {/* Text above robot */}
              <motion.p
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="text-[13px] text-white/30 text-center max-w-sm"
              >
                Your AI receptionist handles conversations, qualifies leads, and books appointments <span className="text-white/50">while you focus on the work that matters.</span>
              </motion.p>

              {/* Robot + side text row */}
              <div className="flex items-center gap-4 w-full max-w-[520px]">
                {/* Left text */}
                <motion.p
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 }}
                  className="hidden md:block text-[11px] text-white/25 text-right w-24 shrink-0 leading-relaxed"
                >
                  Deploy in 5 minutes. One line of code.
                </motion.p>

                {/* Robot */}
                <div className="flex-1 spline-wrapper overflow-hidden rounded-2xl" style={{ height: '380px' }}>
                  <Spline scene="https://prod.spline.design/kDSI4axu7YzxniDc/scene.splinecode" />
                </div>

                {/* Right text */}
                <motion.p
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.7 }}
                  className="hidden md:block text-[11px] text-white/25 text-left w-24 shrink-0 leading-relaxed"
                >
                  Works 24/7. Never misses a customer.
                </motion.p>
              </div>

              {/* Text below robot */}
              <motion.p
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
                className="text-[12px] text-white/20 text-center max-w-xs"
              >
                AI captures name, phone, service needed — then <span className="text-white/40">emails you instantly.</span> No app to install. No dashboard to watch.
              </motion.p>
            </motion.div>
          </div>
        </div>
      </motion.section>

      {/* Social Proof + Metrics */}
      <section className="border-y border-white/[0.04] py-10">
        <div className="max-w-5xl mx-auto px-6 lg:px-8">
          <Reveal>
            <div className="text-center mb-8">
              <p className="text-[13px] text-white/30 tracking-wide uppercase">Trusted by 500+ service businesses</p>
              <div className="flex flex-wrap items-center justify-center gap-6 mt-4 opacity-30">
                {["HVAC", "PLUMBING", "ROOFING", "ELECTRICAL", "DENTAL", "LEGAL"].map((t) => (
                  <span key={t} className="text-[11px] text-white/40 font-semibold tracking-widest">{t}</span>
                ))}
              </div>
            </div>
          </Reveal>
          <div className="w-full h-px bg-white/[0.04] mb-8" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {stats.map((s, i) => (
              <Reveal key={s.label} delay={i * 0.1}>
                <div>
                  <div className="text-2xl md:text-3xl font-bold text-white mb-1 tabular-nums">
                    <AnimatedCounter value={s.value} />{s.suffix}
                  </div>
                  <div className="text-xs md:text-sm font-medium text-white/50">{s.label}</div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Product Demo - How it Works */}
      <section className="py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <Reveal>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-center mb-4">
              How it works
            </h2>
            <p className="text-lg text-white/30 text-center max-w-xl mx-auto mb-14">
              Three simple steps. Zero technical skills required.
            </p>
          </Reveal>
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {productSteps.map((s, i) => (
              <Reveal key={s.step} delay={i * 0.15}>
                <div className="group relative">
                  {/* Connecting line */}
                  {i < 2 && (
                    <div className="hidden md:block absolute top-1/2 -right-3 w-6 h-px bg-white/[0.06] z-0" />
                  )}
                  <div className="glass rounded-2xl p-6 relative z-10 hover:bg-white/[0.06] hover:border-white/[0.1] transition-all duration-500">
                    <span className="text-[11px] font-bold text-white/20 tracking-widest mb-4 block">{s.step}</span>
                    {s.visual}
                    <h3 className="text-[15px] font-semibold mt-5 mb-2">{s.title}</h3>
                    <p className="text-sm text-white/30 leading-relaxed">{s.desc}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-16 md:py-24 border-t border-white/[0.04]">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <Reveal>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-center mb-4">
              Everything you need
            </h2>
            <p className="text-lg text-white/30 text-center max-w-xl mx-auto mb-14">
              AI-powered tools built specifically for contractors.
            </p>
          </Reveal>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((f, i) => (
              <Reveal key={f.name} delay={i * 0.07}>
                <div className="glass rounded-2xl p-6 group hover:bg-white/[0.06] hover:border-white/[0.1] transition-all duration-500">
                  <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${f.color} border border-white/[0.06] flex items-center justify-center mb-4 group-hover:scale-110 group-hover:shadow-lg transition-all duration-300`}>
                    <f.icon className="h-5 w-5 text-white/70" />
                  </div>
                  <h3 className="text-[15px] font-semibold mb-2">{f.name}</h3>
                  <p className="text-sm text-white/30 leading-relaxed">{f.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative py-20 md:py-28 border-t border-white/[0.04] overflow-hidden">
        {/* Particle background */}
        <div className="absolute inset-0 pointer-events-none">
          {Array.from({ length: 20 }).map((_, i) => (
            <motion.div
              key={i}
              className="absolute h-0.5 w-0.5 rounded-full bg-white/20"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              }}
              animate={{
                opacity: [0, 0.5, 0],
                scale: [0, 1.5, 0],
              }}
              transition={{
                duration: 3 + Math.random() * 4,
                repeat: Infinity,
                delay: Math.random() * 3,
              }}
            />
          ))}
        </div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.05),transparent_70%)]" />
        <div className="max-w-3xl mx-auto px-6 lg:px-8 text-center relative z-10">
          <Reveal>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-6">
              Ready to stop <span className="text-gradient">missing leads</span>?
            </h2>
            <p className="text-lg text-white/30 mb-10 max-w-xl mx-auto">
              Join 500+ service businesses who never miss another customer.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
                <Button size="lg" onClick={() => setSubscribeOpen(true)} className="bg-white hover:bg-white/90 text-black font-semibold text-[15px] h-12 px-8 rounded-full relative overflow-hidden group">
                  <span className="relative z-10 flex items-center">
                    Subscribe Now <ArrowRight className="h-4 w-4 ml-1.5 group-hover:translate-x-0.5 transition-transform" />
                  </span>
                </Button>
              </motion.div>
              <Link href="/sign-up">
                <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
                  <Button variant="outline" size="lg" className="btn-outline text-[15px] h-12 px-8 rounded-full">
                    14-Day Free Trial
                  </Button>
                </motion.div>
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/[0.04] py-12">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid sm:grid-cols-3 gap-10 mb-10">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="h-6 w-6 rounded-md bg-white flex items-center justify-center text-[10px] font-bold text-black">AI</div>
                <span className="font-semibold text-sm">Business OS</span>
              </div>
              <p className="text-xs text-white/25 leading-relaxed">AI-powered operating system for service businesses.</p>
            </div>
            <div>
              <h4 className="text-xs font-semibold text-white/50 mb-3">Contact</h4>
              <div className="space-y-2 text-xs text-white/30">
                <a href="https://wa.me/13057071059" className="flex items-center gap-2 hover:text-white/60 transition-colors"><MessageCircle className="h-3 w-3" /> WhatsApp</a>
                <span className="flex items-center gap-2"><Mail className="h-3 w-3" /> Email Support</span>
              </div>
            </div>
            <div>
              <h4 className="text-xs font-semibold text-white/50 mb-3">Legal</h4>
              <div className="space-y-2 text-xs text-white/30">
                <span className="cursor-pointer hover:text-white/60 transition-colors">Privacy Policy</span>
                <span className="cursor-pointer hover:text-white/60 transition-colors">Terms of Service</span>
              </div>
            </div>
          </div>
          <div className="pt-8 border-t border-white/[0.04] text-center text-[11px] text-white/20">© 2026 AI Business OS</div>
        </div>
      </footer>
    </div>
  );
}