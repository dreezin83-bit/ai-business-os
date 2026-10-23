import { Check, X } from "lucide-react";

/**
 * "Without Sagenify vs With Sagenify" — a two-column before/after contrast.
 *
 * Static server component (no client JS), mirroring `testimonials.tsx`:
 * `glass` card surfaces, border-white/[0.04] section border, purple-eyebrow
 * header pattern, slate typography. LEFT column is muted/slate with X icons;
 * RIGHT column carries the purple/green accents with Check icons. The four
 * rows per column are structurally identical so they align exactly.
 *
 * All claims describe real product capabilities (24/7 call/chat answering,
 * lead qualification, automatic booking, automatic follow-up) — no invented
 * stats, and nothing about cost or plans.
 */

const withoutRows = [
  "Missed calls after hours",
  "Voicemail and endless call-backs",
  "Manual follow-up",
  "Leads slip through the cracks",
];

const withRows = [
  "Every call answered 24/7",
  "Calls and chats qualified instantly",
  "Appointments booked automatically",
  "Leads followed up before you wake up",
];

function WithoutCard() {
  return (
    <div className="glass rounded-2xl p-6 md:p-8 h-full flex flex-col">
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 rounded-lg bg-white/[0.04] border border-white/[0.08] flex items-center justify-center shrink-0">
          <X className="h-4 w-4 text-slate-500" />
        </div>
        <h3 className="text-base md:text-lg font-semibold text-slate-400">
          Without Sagenify
        </h3>
      </div>
      <ul className="flex flex-col mt-2">
        {withoutRows.map((row, i) => (
          <li
            key={row}
            className={`flex items-start gap-3 py-3.5 ${
              i > 0 ? "border-t border-white/[0.04]" : ""
            }`}
          >
            <X className="h-4 w-4 text-slate-500/70 mt-0.5 shrink-0" />
            <span className="text-sm text-slate-400 leading-relaxed">
              {row}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function WithCard() {
  return (
    <div className="glass rounded-2xl p-6 md:p-8 h-full flex flex-col relative overflow-hidden">
      {/* subtle purple accent line across the top of the "With" card */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-purple-500/70 to-transparent"
      />
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 rounded-lg bg-purple-500/10 border border-purple-500/25 flex items-center justify-center shrink-0">
          <Check className="h-4 w-4 text-emerald-400" />
        </div>
        <h3 className="text-base md:text-lg font-semibold text-slate-100">
          With Sagenify
        </h3>
      </div>
      <ul className="flex flex-col mt-2">
        {withRows.map((row, i) => (
          <li
            key={row}
            className={`flex items-start gap-3 py-3.5 ${
              i > 0 ? "border-t border-white/[0.04]" : ""
            }`}
          >
            <Check className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
            <span className="text-sm text-slate-200 leading-relaxed">
              {row}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function Comparison() {
  return (
    <section
      id="comparison"
      className="py-16 md:py-24 border-t border-white/[0.04]"
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="text-center mb-12">
          <p className="text-xs uppercase tracking-[0.2em] text-purple-400 font-semibold mb-3">
            The Difference
          </p>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
            Service businesses don&rsquo;t miss leads anymore
          </h2>
          <p className="text-slate-400 max-w-xl mx-auto">
            The same calls, chats, and leads — handled automatically instead
            of falling through the cracks.
          </p>
        </div>
        <div className="grid md:grid-cols-2 gap-4 max-w-4xl mx-auto">
          <WithoutCard />
          <WithCard />
        </div>
      </div>
    </section>
  );
}