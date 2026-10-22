import { Star } from "lucide-react";

/**
 * "Trusted by Local Pros" — a static, server-rendered testimonials section.
 * Three service-business personas (plumber, HVAC tech, roofing manager) with
 * 5-star ratings, industry badges, and an illustrative disclaimer.
 *
 * The personas and quotes are intentionally fictional — they represent the
 * experience of our target customers, not real user claims (see disclaimer
 * below). Matches the landing page's black/purple theme: `glass` card
 * surfaces, border-white/[0.04] section borders, slate typography, purple
 * accents.
 */
const testimonials = [
  {
    quote:
      "The AI picks up calls at 2am when we're sleeping, books the appointment, and follows up the next morning. We stopped losing jobs to voicemail — best investment we've made this year.",
    name: "Marcus Rivera",
    role: "Owner, Rivera HVAC",
    industry: "HVAC",
    rating: 5,
  },
  {
    quote:
      "I was skeptical about AI handling customer conversations. Now it books appointments, collects the details, and follows up — honestly better than my old office manager.",
    name: "Sarah Chen",
    role: "Owner, Chen's Plumbing Services",
    industry: "Plumbing",
    rating: 5,
  },
  {
    quote:
      "We were losing 10-15 leads a month to missed calls and slow replies. Now every call is answered instantly and the lead lands on my phone. That alone paid for itself.",
    name: "David Okonkwo",
    role: "Roofing Manager, Okonkwo Roofing & Repairs",
    industry: "Roofing",
    rating: 5,
  },
];

export default function Testimonials() {
  return (
    <section id="testimonials" className="py-16 md:py-24 border-t border-white/[0.04]">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="text-center mb-12">
          <p className="text-xs uppercase tracking-[0.2em] text-purple-400 font-semibold mb-3">
            Testimonials
          </p>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
            Trusted by Local Pros
          </h2>
          <p className="text-slate-400 max-w-xl mx-auto">
            Service pros on what changes when every call actually gets
            answered.
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-4 max-w-6xl mx-auto">
          {testimonials.map((t) => {
            const initials = t.name
              .split(" ")
              .map((n) => n[0])
              .join("");
            return (
              <div
                key={t.name}
                className="glass rounded-2xl p-6 h-full flex flex-col group hover:bg-white/[0.05] hover:border-white/[0.1] transition-all duration-500"
              >
                <div className="flex gap-0.5 mb-4">
                  {[...Array(t.rating)].map((_, j) => (
                    <Star
                      key={j}
                      className="h-3.5 w-3.5 fill-amber-400 text-amber-400"
                    />
                  ))}
                </div>
                <p className="text-sm text-slate-400 leading-relaxed flex-1 italic">
                  &ldquo;{t.quote}&rdquo;
                </p>
                <div className="flex items-center gap-2.5 pt-3 border-t border-white/[0.04] mt-5">
                  <div className="h-9 w-9 rounded-full bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-xs font-semibold text-purple-300 shrink-0">
                    {initials}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-200 truncate">
                      {t.name}
                    </p>
                    <p className="text-xs text-slate-400 truncate">
                      {t.role}
                    </p>
                  </div>
                  <span className="ml-auto inline-flex items-center rounded-full bg-purple-500/10 border border-purple-500/20 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-purple-300 shrink-0">
                    {t.industry}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
        <p className="text-center text-[11px] text-slate-500 italic mt-8">
          Illustrative testimonials representing the experience of our target
          customers — personas and quotes are fictional.
        </p>
      </div>
    </section>
  );
}