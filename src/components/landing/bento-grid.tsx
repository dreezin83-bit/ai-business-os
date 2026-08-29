import { CalendarCheck2, BellRing, Rocket } from "lucide-react";

/**
 * Bento grid — server-rendered; the mini-calendar and floating notification
 * cards animate with pure CSS (no client JS, no interaction needed).
 */
const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"];

export default function BentoGrid() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Card 1 — 24/7 AI Booking */}
      <div className="glass rounded-2xl p-6 flex flex-col justify-between min-h-[280px] group hover:bg-white/[0.05] hover:border-white/[0.1] transition-all duration-500">
        <div>
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500/25 to-violet-500/5 border border-indigo-500/20 flex items-center justify-center mb-4">
            <CalendarCheck2 className="h-5 w-5 text-indigo-300" />
          </div>
          <h3 className="text-[15px] font-semibold mb-2">24/7 AI Booking</h3>
          <p className="text-sm text-slate-400 leading-relaxed">
            Customers book straight from chat or a phone call — even at 2 AM. The
            AI checks your calendar and confirms instantly.
          </p>
        </div>
        {/* Mock calendar */}
        <div className="mt-6 rounded-xl border border-white/[0.06] bg-slate-950/50 p-3">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-[11px] font-medium text-slate-300">
              This Week
            </span>
            <span className="text-[10px] text-indigo-400 font-medium">
              3 slots left
            </span>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center">
            {WEEKDAYS.map((d, i) => (
              <span key={`${d}-${i}`} className="text-[9px] text-slate-600">
                {d}
              </span>
            ))}
            {Array.from({ length: 35 }).map((_, i) => {
              const booked = [4, 7, 9, 12, 16, 20, 23].includes(i);
              const today = i === 18;
              return (
                <div
                  key={i}
                  className={`h-6 rounded-md flex items-center justify-center text-[9px] ${
                    today
                      ? "bg-indigo-500 text-white font-semibold glow-pulse"
                      : booked
                        ? "bg-white/[0.06] text-slate-500"
                        : "text-slate-600"
                  }`}
                >
                  {today ? "12" : ""}
                </div>
              );
            })}
          </div>
          <div className="mt-2.5 flex items-center gap-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-pulse-soft" />
            <span className="text-[10px] text-indigo-300">
              New booking confirmed — AC repair, Tue 10:30 AM
            </span>
          </div>
        </div>
      </div>

      {/* Card 2 — Instant Lead Alerts */}
      <div className="glass rounded-2xl p-6 flex flex-col justify-between min-h-[280px] group hover:bg-white/[0.05] hover:border-white/[0.1] transition-all duration-500">
        <div>
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500/25 to-teal-500/5 border border-emerald-500/20 flex items-center justify-center mb-4">
            <BellRing className="h-5 w-5 text-emerald-300" />
          </div>
          <h3 className="text-[15px] font-semibold mb-2">Instant Lead Alerts</h3>
          <p className="text-sm text-slate-400 leading-relaxed">
            Every captured lead pings your team the second it comes in — name,
            service, and contact info already filled in.
          </p>
        </div>
        {/* Floating notifications */}
        <div className="relative mt-6 h-28">
          <div className="absolute left-0 right-0 top-0 rounded-xl border border-white/[0.08] bg-slate-900/90 p-3 shadow-xl shadow-black/40 animate-float">
            <div className="flex items-start gap-2.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-500/20 text-[10px] font-bold text-blue-300">
                AI
              </span>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold text-slate-200">
                  New lead: Jane Cooper
                </p>
                <p className="text-[10px] text-slate-500 truncate">
                  AC Repair · (555) 123-4567 · $400 est.
                </p>
              </div>
              <span className="ml-auto text-[9px] text-slate-600">now</span>
            </div>
          </div>
          <div className="absolute left-4 right-4 bottom-0 rounded-xl border border-white/[0.06] bg-slate-900/80 p-3 shadow-lg shadow-black/40 animate-float-delayed">
            <div className="flex items-start gap-2.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-300">
                <CalendarCheck2 className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold text-slate-200">
                  Appointment booked
                </p>
                <p className="text-[10px] text-slate-500 truncate">
                  Tomorrow · 10:30 AM · Confirmation sent
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Card 3 — Zero Setup Required */}
      <div className="glass rounded-2xl p-6 flex flex-col justify-between min-h-[280px] group hover:bg-white/[0.05] hover:border-white/[0.1] transition-all duration-500">
        <div>
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-500/25 to-orange-500/5 border border-amber-500/20 flex items-center justify-center mb-4">
            <Rocket className="h-5 w-5 text-amber-300" />
          </div>
          <h3 className="text-[15px] font-semibold mb-2">Zero Setup Required</h3>
          <p className="text-sm text-slate-400 leading-relaxed">
            No code, no hardware, no engineering. Live and taking calls in about
            fifteen minutes.
          </p>
        </div>
        {/* 3-step timeline */}
        <div className="mt-6 space-y-0">
          {[
            { n: "01", t: "Subscribe & log in", d: "Create your workspace." },
            { n: "02", t: "Answer a short wizard", d: "Business info, services, hours." },
            { n: "03", t: "Go live", d: "Chat widget + phone number active." },
          ].map((s, i) => (
            <div key={s.n} className="relative flex gap-3 pb-4 last:pb-0">
              {i < 2 && (
                <span className="absolute left-[11px] top-6 h-full w-px bg-white/[0.08]" />
              )}
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-[9px] font-semibold text-indigo-300">
                {s.n}
              </span>
              <div className="pt-0.5">
                <p className="text-[12px] font-medium text-slate-200">{s.t}</p>
                <p className="text-[11px] text-slate-500">{s.d}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
