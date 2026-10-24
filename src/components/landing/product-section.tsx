import {
  ArrowRight,
  Brain,
  CalendarCheck,
  Mail,
  MessageSquare,
  PhoneCall,
  Users,
  BarChart3,
} from "lucide-react";

/**
 * ProductSection — replaces the old (fictional) testimonials block with a
 * factual, product-focused description of what Sagenify actually does for a
 * service business. Server component: no interactivity, fully indexable.
 */
const steps = [
  {
    icon: PhoneCall,
    title: "Answers every call, 24/7",
    body: "Your AI phone receptionist picks up after hours, during lunch, and on holidays — qualifies the caller, books the appointment, and hands you the leads that matter.",
  },
  {
    icon: MessageSquare,
    title: "Chats with website visitors",
    body: "A chatbot on your site answers questions from your business knowledge, captures contact details, and turns visitors into leads instead of bounces.",
  },
  {
    icon: Users,
    title: "Keeps every lead in one pipeline",
    body: "Every call, chat, and form submission lands in your CRM with source, status, and notes — no more sticky notes or lost text threads.",
  },
  {
    icon: CalendarCheck,
    title: "Books appointments automatically",
    body: "Sagenify checks availability and schedules appointments on your calendar without you lifting a finger, then reminds customers before they show up.",
  },
  {
    icon: Mail,
    title: "Follows up on autopilot",
    body: "Automated email follow-ups chase quotes, unanswered messages, and no-shows so opportunities don't go cold while you're on a job.",
  },
  {
    icon: Brain,
    title: "Teaches your AI what you know",
    body: "Build a knowledge base from your services, pricing, service areas, and policies. Your AI answers from that — never from a generic script.",
  },
  {
    icon: BarChart3,
    title: "Shows you the numbers",
    body: "A reporting dashboard tracks leads, appointments, conversations, and follow-ups, so you can see exactly what your AI front office is recovering.",
  },
];

export default function ProductSection() {
  return (
    <section id="product" className="py-16 md:py-24 border-t border-white/[0.04]">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="text-center mb-12">
          <p className="text-xs uppercase tracking-[0.2em] text-purple-400 font-semibold mb-3">
            How it works
          </p>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
            Your AI front office for service businesses
          </h2>
          <p className="text-slate-400 max-w-2xl mx-auto">
            Sagenify answers your calls and chats, qualifies every lead, books
            appointments, and follows up automatically — built for how HVAC,
            plumbing, roofing, electrical, and other service companies actually
            win jobs.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-6xl mx-auto">
          {steps.map((s, i) => (
            <div
              key={s.title}
              className="glass rounded-2xl p-6 flex flex-col group hover:bg-white/[0.05] hover:border-white/[0.1] transition-all duration-500"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="h-10 w-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shrink-0">
                  <s.icon className="h-5 w-5 text-purple-300" />
                </div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  {String(i + 1).padStart(2, "0")}
                </span>
              </div>
              <h3 className="text-sm font-semibold text-slate-100 mb-1.5 flex items-center gap-1.5">
                {s.title}
              </h3>
              <p className="text-[13px] text-slate-400 leading-relaxed">
                {s.body}
              </p>
            </div>
          ))}
        </div>

        <div className="text-center mt-10">
          <a
            href="#pricing"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-purple-400 hover:text-purple-300 transition-colors"
          >
            See plans &amp; pricing
            <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </div>
    </section>
  );
}