const INDUSTRIES = [
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
  "Home Security",
  "Pest & Termite",
];

/**
 * Scrolling industry ticker — pure CSS marquee (see .animate-marquee /
 * .marquee-mask in globals.css). The list is rendered twice so the
 * translateX(-50%) loop is seamless.
 */
export default function IndustryTicker() {
  return (
    <section className="py-10 border-y border-white/[0.04]">
      <p className="text-center text-xs uppercase tracking-[0.2em] text-slate-500 mb-6">
        Built for service businesses
      </p>
      <div className="marquee-mask overflow-hidden">
        <div className="animate-marquee flex w-max items-center gap-10">
          {[...INDUSTRIES, ...INDUSTRIES].map((industry, i) => (
            <span
              key={`${industry}-${i}`}
              className="flex items-center gap-10 text-[15px] font-semibold text-slate-500 whitespace-nowrap"
            >
              {industry}
              <span className="h-1 w-1 rounded-full bg-purple-500/50" />
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}