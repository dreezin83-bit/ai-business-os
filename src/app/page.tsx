"use client";

import { useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { ArrowRight, Bot, Users, Calendar, Zap, BookOpen, Globe, Star, MessageCircle, Mail } from "lucide-react";
import Link from "next/link";

const Spline = dynamic(() => import("@splinetool/react-spline/next"), { ssr: false });

const features = [
  { name: "AI that answers 24/7", desc: "Never miss a customer. Your AI qualifies leads, answers questions, and books appointments — even while you sleep.", icon: Bot },
  { name: "Smart Lead Capture", desc: "Name, phone, email, and service — captured automatically from every conversation. Zero data entry.", icon: Users },
  { name: "Appointment Booking", desc: "Customers book directly through chat. AI checks availability and confirms instantly.", icon: Calendar },
  { name: "Instant Notifications", desc: "New lead? You get an email. Customer gets a confirmation. Everything logged for your records.", icon: Zap },
  { name: "Knowledge Base", desc: "Upload documents, FAQs, and website URLs. Your AI learns everything about your business.", icon: BookOpen },
  { name: "Built for Scale", desc: "One platform, unlimited contractors. Each gets their own AI, own leads, own settings.", icon: Globe },
];

const testimonials = [
  { quote: "Since adding the AI chatbot to our website, we've captured 40% more leads. It answers questions at 2am when we're sleeping. Best investment we made this year.", name: "Marcus Rivera", role: "Owner, Rivera HVAC", rating: 5 },
  { quote: "I was skeptical about AI handling our customer conversations. But it books appointments, collects phone numbers, and follows up — better than my office manager.", name: "Sarah Chen", role: "Chen's Plumbing Services", rating: 5 },
  { quote: "We were losing 10-15 leads a month from missed calls and slow replies. Now the AI handles everything instantly. Our revenue is up 35% since switching.", name: "David Okonkwo", role: "Okonkwo Roofing & Repairs", rating: 5 },
  { quote: "The best part? My contractors never touch the dashboard. They just get a text saying 'New lead: Jane, AC repair, 555-1234'. It's that simple.", name: "Lisa Thompson", role: "Agency Owner, 20+ Contractors", rating: 5 },
  { quote: "We tried three other chatbot platforms. This is the only one that feels like a real receptionist. It remembers context, asks the right questions, and never sounds robotic.", name: "James Park", role: "Park Electrical Solutions", rating: 5 },
  { quote: "Onboarding took 5 minutes. I picked the HVAC template, pasted one line of code, and the AI knew more about my business than I expected. Game changer.", name: "Robert Kim", role: "Kim's Heating & Cooling", rating: 5 },
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
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left - Text */}
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.06] text-[13px] text-white/60 mb-8 animate-fade-in">
                <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse-soft" />
                Now accepting early access users
              </div>
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[0.95] animate-fade-in">
                <span className="block">Never miss</span>
                <span className="block text-gradient animate-fade-in delay-200">another customer</span>
                <span className="block animate-fade-in delay-400">again.</span>
              </h1>
              <p className="text-lg text-white/40 mt-8 leading-relaxed animate-fade-in delay-500 max-w-md">
                Your AI answers 24/7, qualifies every lead, books appointments, and sends notifications — automatically.
              </p>
              <div className="flex items-center gap-4 mt-10 animate-fade-in delay-600">
                <Link href="/sign-up"><Button size="lg" className="btn-white text-[15px] h-12 px-8 rounded-full">Get Started <ArrowRight className="h-4 w-4 ml-1.5" /></Button></Link>
                <a href="https://wa.me/13057071059" target="_blank"><Button variant="outline" size="lg" className="btn-outline text-[15px] h-12 px-8 rounded-full">Talk to Us</Button></a>
              </div>
            </div>
            {/* Spline 3D Animation with labels */}
            <div className="h-[350px] sm:h-[450px] lg:h-[550px] -mt-8 lg:-mt-16 relative">
              {/* Background glow */}
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.06),transparent_70%)] rounded-3xl" />
              {/* Callout labels */}
              <div className="absolute top-2 left-0 sm:top-6 sm:-left-4 bg-white/[0.04] backdrop-blur-sm border border-white/[0.06] rounded-xl px-3 py-1.5 text-[10px] sm:text-xs text-white/40 z-10">
                💬 24/7 AI Chat
              </div>
              <div className="absolute top-12 right-0 sm:top-20 sm:-right-2 bg-white/[0.04] backdrop-blur-sm border border-white/[0.06] rounded-xl px-3 py-1.5 text-[10px] sm:text-xs text-white/40 z-10">
                📋 Auto Lead Capture
              </div>
              <div className="absolute bottom-16 left-0 sm:bottom-24 sm:-left-4 bg-white/[0.04] backdrop-blur-sm border border-white/[0.06] rounded-xl px-3 py-1.5 text-[10px] sm:text-xs text-white/40 z-10">
                📅 Smart Booking
              </div>
              <div className="absolute bottom-4 right-0 sm:bottom-8 sm:-right-2 bg-white/[0.04] backdrop-blur-sm border border-white/[0.06] rounded-xl px-3 py-1.5 text-[10px] sm:text-xs text-white/40 z-10">
                ⚡ Instant Notify
              </div>
              <Spline scene="https://prod.spline.design/kDSI4axu7YzxniDc/scene.splinecode" />
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
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-center mb-6">Trusted by contractors</h2>
            <p className="text-lg text-white/30 text-center max-w-xl mx-auto mb-16">Join hundreds of service businesses already using AI to grow.</p>
          </ScrollReveal>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-6xl mx-auto">
            {testimonials.map((t, i) => (
              <ScrollReveal key={i} delay={i * 75}>
                <div className="glass rounded-2xl p-5 h-full flex flex-col">
                  <div className="flex gap-0.5 mb-3">
                    {[...Array(t.rating)].map((_, j) => <Star key={j} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />)}
                  </div>
                  <p className="text-sm text-white/50 leading-relaxed mb-4 flex-1">"{t.quote}"</p>
                  <div className="flex items-center gap-2.5 pt-3 border-t border-white/[0.04]">
                    <div className="h-8 w-8 rounded-full bg-white/[0.06] flex items-center justify-center text-xs font-semibold text-white/40">{t.name.split(" ").map(n => n[0]).join("")}</div>
                    <div>
                      <p className="text-xs font-medium text-white/70">{t.name}</p>
                      <p className="text-[11px] text-white/30">{t.role}</p>
                    </div>
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
          <p className="text-center text-[11px] text-white/15 mt-8 italic">These are illustrative testimonials representing the experience of our target customers.</p>
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