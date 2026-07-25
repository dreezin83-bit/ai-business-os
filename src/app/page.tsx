import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, Bot, Users, Calendar, MessageSquare, Zap, BookOpen, BarChart3, Globe, Star, Shield, ChevronDown, Mail, MessageCircle, Check, Sparkles } from "lucide-react";

const features = [
  { name: "AI Chat Assistant", description: "Answers customer questions 24/7, qualifies leads, and books appointments — like having a sales rep who never sleeps.", icon: Bot },
  { name: "Smart Lead Capture", description: "Every conversation becomes a qualified lead. Name, phone, email, and service request captured automatically.", icon: Users },
  { name: "CRM & Pipeline", description: "Visual pipeline from new lead to won deal. Drag, drop, update status — know exactly where every prospect stands.", icon: BarChart3 },
  { name: "Appointment Booking", description: "Customers book directly through chat. AI checks availability, confirms time, and sends reminders.", icon: Calendar },
  { name: "Instant Notifications", description: "New lead? Contractor gets an email instantly. Customer gets a confirmation. No delays.", icon: Zap },
  { name: "Knowledge Base", description: "Upload PDFs, website URLs, FAQs. Your AI learns your business and answers like an expert.", icon: BookOpen },
  { name: "Analytics Dashboard", description: "See revenue estimates, conversion rates, lead sources. Know exactly how your AI is performing.", icon: BarChart3 },
  { name: "Multi-Tenant Ready", description: "One platform, unlimited contractors. Each with their own AI, their own leads, their own brand.", icon: Globe },
];

const pricing = [
  { name: "Starter", price: "$49", period: "/mo", description: "For small contractors getting started with AI.", features: ["1 Contractor", "AI Chatbot", "Lead Capture", "Email Notifications", "Basic Analytics"], cta: "Start Free Trial", popular: false },
  { name: "Professional", price: "$149", period: "/mo", description: "For growing businesses that want full automation.", features: ["5 Contractors", "Everything in Starter", "Appointment Booking", "WhatsApp Integration", "Advanced Analytics", "Custom AI Training", "Priority Support"], cta: "Start Free Trial", popular: true },
  { name: "Enterprise", price: "Custom", period: "", description: "For agencies managing 50+ contractors.", features: ["Unlimited Contractors", "Everything in Professional", "White Label", "API Access", "Dedicated Support", "Custom Integrations", "SLA Guarantee"], cta: "Contact Sales", popular: false },
];

const faqs = [
  { q: "How quickly can I set up?", a: "Under 5 minutes. Sign up, pick your industry template, paste one line of code on your website — done. Your AI starts working immediately." },
  { q: "Do I need technical skills?", a: "Zero. No coding, no API keys, no configuration. We built this for contractors who barely use email." },
  { q: "Can I white-label this?", a: "Yes. Your contractors see their own branding. You control the platform. They just use it." },
  { q: "What if I need help?", a: "WhatsApp support, email support, video tutorials, documentation. We respond fast." },
  { q: "Is there a free trial?", a: "Yes. 14 days free on any plan. No credit card required to start." },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-14">
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-primary to-blue-400 flex items-center justify-center text-xs font-bold text-white shadow-sm shadow-primary/20">AI</div>
            <span className="font-semibold text-sm tracking-tight">AI Business OS</span>
          </div>
          <div className="flex items-center gap-2">
            <a href="https://wa.me/13057071059" target="_blank" className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1"><MessageCircle className="h-3 w-3" /> WhatsApp</a>
            <Link href="/sign-in" className="text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1">Sign In</Link>
            <Link href="/sign-up"><Button size="sm" className="h-8 text-xs">Get Started</Button></Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="pt-24 pb-16 md:pt-32 md:pb-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="animate-fade-in">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border bg-secondary text-xs text-muted-foreground mb-6">
                <Sparkles className="h-3 w-3 text-primary" /> AI-Powered Contractor OS
              </div>
              <h1 className="h1 mb-4">
                Never Miss Another<br />
                <span className="text-primary">Customer Again</span>
              </h1>
              <p className="body mb-8 max-w-lg">
                Your AI answers customers 24/7, qualifies every lead, books appointments, 
                and sends notifications — so you never lose a single job to a missed call or late reply.
              </p>
              <div className="flex items-center gap-3">
                <Link href="/sign-up"><Button size="lg" className="btn-primary">Get Started <ArrowRight className="h-4 w-4 ml-1" /></Button></Link>
                <Link href="/sign-in"><Button variant="outline" size="lg">Book Demo</Button></Link>
              </div>
              <div className="flex items-center gap-4 mt-6 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Check className="h-3 w-3 text-success" /> No credit card</span>
                <span className="flex items-center gap-1"><Check className="h-3 w-3 text-success" /> 14-day trial</span>
                <span className="flex items-center gap-1"><Check className="h-3 w-3 text-success" /> 5-min setup</span>
              </div>
            </div>
            <div className="animate-slide-up hidden lg:block">
              <div className="relative">
                <div className="glass rounded-2xl p-6 animate-float">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center"><Bot className="h-4 w-4 text-primary" /></div>
                      <div className="text-xs font-medium">AI Assistant</div>
                    </div>
                    <div className="bg-secondary rounded-xl p-3 text-xs">Hi! I need my AC repaired. Can you help?</div>
                    <div className="bg-primary/10 rounded-xl p-3 text-xs ml-4">Of course! I can help with that. Before we continue, may I have your name and phone number?</div>
                    <div className="bg-secondary rounded-xl p-3 text-xs">John Smith, 555-0123</div>
                    <div className="bg-primary/10 rounded-xl p-3 text-xs ml-4">Thanks John! I've created a lead for AC repair. Our team will reach out within the hour. Is there anything else?</div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-success animate-pulse" /> Lead Created</span>
                    <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> Notification Sent</span>
                    <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> Booking Ready</span>
                  </div>
                </div>
                <div className="absolute -top-4 -right-4 h-24 w-24 bg-primary/10 rounded-full blur-3xl animate-pulse-glow" />
                <div className="absolute -bottom-4 -left-4 h-32 w-32 bg-blue-500/5 rounded-full blur-3xl" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 border-t border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="h2 mb-3">Everything Your Business Needs</h2>
            <p className="body max-w-xl mx-auto">AI-powered tools that work together seamlessly — from first message to closed deal.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 stagger">
            {features.map((f) => (
              <div key={f.name} className="glass rounded-xl p-5 hover:border-primary/30 transition-all duration-300 card-hover">
                <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center mb-3"><f.icon className="h-4 w-4 text-primary" /></div>
                <h3 className="text-sm font-semibold mb-1.5">{f.name}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-20 border-t border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="h2 mb-3">Simple, Transparent Pricing</h2>
            <p className="body max-w-xl mx-auto">Start free. Upgrade when you grow. No hidden fees.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto stagger">
            {pricing.map((p) => (
              <div key={p.name} className={`glass rounded-2xl p-6 relative card-hover ${p.popular ? 'gradient-border ring-1 ring-primary/20' : ''}`}>
                {p.popular && <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[10px] font-semibold px-3 py-1 rounded-full">Most Popular</div>}
                <h3 className="text-sm font-semibold mb-1">{p.name}</h3>
                <div className="mb-2"><span className="text-3xl font-bold">{p.price}</span><span className="text-sm text-muted-foreground">{p.period}</span></div>
                <p className="text-xs text-muted-foreground mb-4">{p.description}</p>
                <ul className="space-y-2 mb-5">
                  {p.features.map((f, i) => <li key={i} className="flex items-start gap-2 text-xs"><Check className="h-3 w-3 text-success mt-0.5 shrink-0" />{f}</li>)}
                </ul>
                <Button variant={p.popular ? "default" : "outline"} className="w-full text-xs" size="sm">{p.cta}</Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 border-t border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="h2 mb-3">Trusted by Contractors</h2>
            <p className="body max-w-xl mx-auto">See what our early users are saying.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto stagger">
            {[1,2,3].map((i) => (
              <div key={i} className="glass rounded-xl p-5 card-hover">
                <div className="flex items-center gap-1 mb-3">{[...Array(5)].map((_,j) => <Star key={j} className="h-3 w-3 fill-amber-500 text-amber-500" />)}</div>
                <p className="text-xs text-muted-foreground mb-3 italic">"This is a placeholder testimonial. Real contractor reviews coming soon. We're excited to share their stories."</p>
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-full bg-secondary flex items-center justify-center text-[10px] font-medium">CT</div>
                  <div><p className="text-xs font-medium">Contractor Name</p><p className="text-[10px] text-muted-foreground">HVAC Business Owner</p></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 border-t border-border">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="h2 mb-3">Frequently Asked Questions</h2>
          </div>
          <div className="space-y-2 stagger">
            {faqs.map((f, i) => (
              <details key={i} className="glass rounded-xl group">
                <summary className="flex items-center justify-between px-5 py-4 cursor-pointer text-sm font-medium list-none">
                  {f.q}
                  <ChevronDown className="h-4 w-4 text-muted-foreground group-open:rotate-180 transition-transform" />
                </summary>
                <p className="px-5 pb-4 text-xs text-muted-foreground leading-relaxed">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 border-t border-border">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="h2 mb-3">Ready to Stop Missing Leads?</h2>
          <p className="body mb-8">Join contractors who never miss another customer. Start your free trial today.</p>
          <Link href="/sign-up"><Button size="lg" className="btn-primary">Get Started Free <ArrowRight className="h-4 w-4 ml-1" /></Button></Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid sm:grid-cols-3 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-3"><div className="h-6 w-6 rounded-md bg-gradient-to-br from-primary to-blue-400 flex items-center justify-center text-[10px] font-bold text-white">AI</div><span className="font-semibold text-sm">AI Business OS</span></div>
              <p className="text-xs text-muted-foreground">AI-powered operating system for service businesses.</p>
            </div>
            <div>
              <h4 className="text-xs font-semibold mb-3">Contact</h4>
              <div className="space-y-2 text-xs text-muted-foreground">
                <a href="https://wa.me/13057071059" className="flex items-center gap-2 hover:text-foreground"><MessageCircle className="h-3 w-3" /> WhatsApp</a>
                <a href="mailto:info@ai-business-os.com" className="flex items-center gap-2 hover:text-foreground"><Mail className="h-3 w-3" /> Email</a>
              </div>
            </div>
            <div>
              <h4 className="text-xs font-semibold mb-3">Legal</h4>
              <div className="space-y-2 text-xs text-muted-foreground">
                <span className="block hover:text-foreground cursor-pointer">Privacy Policy</span>
                <span className="block hover:text-foreground cursor-pointer">Terms of Service</span>
              </div>
            </div>
          </div>
          <div className="pt-6 border-t border-border text-center text-xs text-muted-foreground">© 2026 AI Business OS. All rights reserved.</div>
        </div>
      </footer>
    </div>
  );
}