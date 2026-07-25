"use client";

import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight, Bot, Users, Calendar, Zap, BookOpen, Globe, Star, MessageCircle, Mail, Shield, Sparkles, ChevronRight, Phone } from "lucide-react";
import Link from "next/link";

const features = [
  { name: "AI that answers 24/7", desc: "Never miss a customer. Your AI qualifies leads, answers questions, and books appointments — even while you sleep.", icon: Bot },
  { name: "Smart Lead Capture", desc: "Name, phone, email, and service — captured automatically from every conversation. Zero data entry.", icon: Users },
  { name: "Appointment Booking", desc: "Customers book directly through chat. AI checks availability and confirms instantly.", icon: Calendar },
  { name: "Instant Notifications", desc: "New lead? You get an email. Customer gets a confirmation. Everything logged for your records.", icon: Zap },
  { name: "Knowledge Base", desc: "Upload documents, FAQs, and website URLs. Your AI learns everything about your business.", icon: BookOpen },
  { name: "Built for Scale", desc: "One platform, unlimited contractors. Each gets their own AI, own leads, own settings.", icon: Globe },
];

const testimonials = [
  { quote: "This is placeholder testimonial text. Real contractor reviews coming soon. We're excited to share authentic stories from our early users.", name: "Coming Soon", role: "HVAC Business Owner" },
  { quote: "Another placeholder testimonial. We're collecting real feedback from contractors who use the platform daily. These will be real reviews.", name: "Coming Soon", role: "Plumbing Contractor" },
  { quote: "Placeholder testimonial. Soon this will feature authentic stories from contractors who transformed their business with AI.", name: "Coming Soon", role: "Roofing Company" },
];

function ScrollReveal({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { el.classList.add("visible"); observer.unobserve(el); }
    }, { threshold: 0.1 });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return <div ref={ref} className={`reveal ${className}`} style={{ transitionDelay: `${delay}ms` }}>{children}</div>;
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-black text-white overflow-x-hidden">
      {/* Nav */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-xl border-b border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 flex items-center justify-between h-16">
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-lg bg-white flex items-center justify-center text-[10px] font-bold text-black">AI</div>
            <span className="font-semibold text-[15px] tracking-tight">Business OS</span>
          </div>
          <div className="flex items-center gap-2">
            <a href="https://wa.me/13057071059" target="_blank" className="hidden md:flex items-center gap-1.5 text-[13px] text-white/50 hover:text-white transition-colors px-3 py-1.5 rounded-full hover:bg-white/5">
              <MessageCircle className="h-3.5 w-3.5" /> Support
            </a>
            <Link href="/sign-in" className="text-[13px] text-white/50 hover:text-white transition-colors px-3 py-1.5">Sign In</Link>
            <Link href="/sign-up"><Button size="sm" className="btn-white text-xs h-9 px-5 rounded-full">Get Started</Button></Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative pt-32 pb-20 md:pt-40 md:pb-28 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.03),transparent_70%)]" />
        <div className="max-w-7xl mx-auto px-6 lg:px-8 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.06] text-[13px] text-white/60 mb-8 animate-fade-in">
              <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse-soft" />
              Now accepting early access users
            </div>
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight leading-[0.95] animate-fade-in">
              <span className="block">Never miss</span>
              <span className="block text-gradient animate-fade-in delay-200">another customer</span>
              <span className="block animate-fade-in delay-400">again.</span>
            </h1>
            <p className="text-lg md:text-xl text-white/40 mt-8 max-w-2xl mx-auto leading-relaxed animate-fade-in delay-500">
              Your AI receptionist answers every message, qualifies every lead, and books every appointment — so you never lose business to a missed call or late reply.
            </p>
            <div className="flex items-center justify-center gap-4 mt-10 animate-fade-in delay-600">
              <Link href="/sign-up"><Button size="lg" className="btn-white text-[15px] h-12 px-8 rounded-full">Get Started <ArrowRight className="h-4 w-4 ml-1.5" /></Button></Link>
              <a href="https://wa.me/13057071059" target="_blank"><Button variant="outline" size="lg" className="btn-outline text-[15px] h-12 px-8 rounded-full">Talk to Us</Button></a>
            </div>
          </div>

          {/* Animated demo */}
          <div className="mt-20 max-w-4xl mx-auto animate-fade-in delay-700">
            <div className="glass rounded-2xl p-6 md:p-8 space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <div className="flex gap-1.5"><span className="h-3 w-3 rounded-full bg-red-500/50" /><span className="h-3 w-3 rounded-full bg-amber-500/50" /><span className="h-3 w-3 rounded-full bg-green-500/50" /></div>
                <span className="text-xs text-white/30 ml-2">AI Business OS — Live Demo</span>
              </div>
              <div className="space-y-3">
                {[
                  { role: "user", text: "Hi, I need my water heater fixed. It's leaking everywhere.", delay: "delay-0" },
                  { role: "ai", text: "Oh no — we can help with that! Let me get someone to you quickly. May I have your name and phone number?", delay: "delay-200" },
                  { role: "user", text: "Mark Davis, 555-0147", delay: "delay-400" },
                  { role: "ai", text: "Got it, Mark. I've created a lead for emergency water heater repair. Our team will call you within 15 minutes. Is there anything else?", delay: "delay-600" },
                ].map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} animate-fade-in ${msg.delay}`}>
                    <div className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                      msg.role === "user" ? "bg-white/[0.06] text-white/80" : "bg-white text-black"
                    }`}>
                      {msg.text}
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-3 pt-3 border-t border-white/[0.06]">
                {[
                  { label: "Lead Created", color: "bg-green-500" },
                  { label: "Notification Sent", color: "bg-blue-500" },
                  { label: "Appointment Ready", color: "bg-purple-500" },
                ].map((s) => (
                  <span key={s.label} className="flex items-center gap-1.5 text-[11px] text-white/40">
                    <span className={`h-1.5 w-1.5 rounded-full ${s.color} animate-pulse-soft`} /> {s.label}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Logo bar */}
      <section className="border-y border-white/[0.04] py-10 overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <p className="text-center text-xs text-white/20 mb-6 uppercase tracking-widest">Built for service businesses</p>
          <div className="flex items-center justify-center gap-12 flex-wrap opacity-30">
            {["HVAC", "Plumbing", "Roofing", "Electrical", "Landscaping", "Cleaning", "Pest Control"].map((s) => (
              <span key={s} className="text-sm font-medium text-white">{s}</span>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 md:py-32">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <ScrollReveal>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-center mb-6">Everything you need</h2>
            <p className="text-lg text-white/30 text-center max-w-xl mx-auto mb-16">AI-powered tools built specifically for contractors. No technical skills required.</p>
          </ScrollReveal>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((f, i) => (
              <ScrollReveal key={f.name} delay={i * 75}>
                <div className="glass rounded-2xl p-6 hover:bg-white/[0.05] transition-colors group">
                  <div className="h-9 w-9 rounded-xl bg-white/[0.06] flex items-center justify-center mb-4 group-hover:bg-white/[0.1] transition-colors"><f.icon className="h-4 w-4 text-white/60" /></div>
                  <h3 className="text-[15px] font-semibold mb-2">{f.name}</h3>
                  <p className="text-sm text-white/30 leading-relaxed">{f.desc}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 md:py-32 border-t border-white/[0.04]">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <ScrollReveal>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-center mb-6">Loved by contractors</h2>
            <p className="text-lg text-white/30 text-center max-w-xl mx-auto mb-16">Real feedback from real customers. Coming soon.</p>
          </ScrollReveal>
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {testimonials.map((t, i) => (
              <ScrollReveal key={i} delay={i * 100}>
                <div className="glass rounded-2xl p-6">
                  <div className="flex gap-1 mb-4">{[...Array(5)].map((_, j) => <Star key={j} className="h-3.5 w-3.5 fill-white/10 text-white/10" />)}</div>
                  <p className="text-sm text-white/40 leading-relaxed mb-5 italic">"{t.quote}"</p>
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-white/[0.06] flex items-center justify-center text-[11px] font-medium text-white/50">CS</div>
                    <div><p className="text-xs font-medium text-white/60">{t.name}</p><p className="text-[11px] text-white/30">{t.role}</p></div>
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 md:py-32 border-t border-white/[0.04]">
        <div className="max-w-4xl mx-auto px-6 lg:px-8 text-center">
          <ScrollReveal>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-6">Ready to stop missing leads?</h2>
            <p className="text-lg text-white/30 mb-10 max-w-xl mx-auto">Join contractors who never miss another customer. 14-day free trial. No credit card.</p>
            <Link href="/sign-up"><Button size="lg" className="btn-white text-[15px] h-12 px-8 rounded-full">Get Started Free <ArrowRight className="h-4 w-4 ml-1.5" /></Button></Link>
          </ScrollReveal>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/[0.04] py-12">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid sm:grid-cols-3 gap-10 mb-10">
            <div>
              <div className="flex items-center gap-2 mb-4"><div className="h-6 w-6 rounded-md bg-white flex items-center justify-center text-[10px] font-bold text-black">AI</div><span className="font-semibold text-sm">Business OS</span></div>
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