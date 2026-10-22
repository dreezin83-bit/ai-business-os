const INDUSTRIES = [
  "Plumbing",
  "HVAC",
  "Roofing",
  "Electrical",
  "Pest Control",
  "Med Spas",
  "Dental",
  "Legal",
  "Landscaping",
  "Auto Repair",
];

/**
 * Scrolling industry ticker — pure CSS marquee (see .animate-marquee /
 * .marquee-mask in globals.css). Heading is prominent and centered; the list
 * renders twice so the translateX(-50%) loop is seamless, and the marquee
 * pauses on hover (see .marquee-mask:hover rule in globals.css).
 */
export default function IndustryTicker() {
  return (
    <section className="py-12 border-y border-white/[0.04] bg-white/[0.01]">
      <h2 className="text-center text-[13px] font-semibold uppercase tracking-[0.28em] text-white/80 mb-7">
        Built for service businesses
      </h2>
      <div className="marquee-mask overflow-hidden">
        <div className="animate-marquee flex w-max items-center gap-10">
          {[...INDUSTRIES, ...INDUSTRIES].map((industry, i) => (
            <span
              key={`${industry}-${i}`}
              className="flex items-center gap-10 text-[15px] font-semibold text-slate-400 whitespace-nowrap"
            >
              {industry}
              <span className="h-1 w-1 rounded-full bg-purple-500/60" />
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}