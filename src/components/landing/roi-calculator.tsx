"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TrendingUp, Info } from "lucide-react";

/**
 * ROI calculator — interactive client island.
 *
 * Owner correction (2026-10): NO dollar amounts anywhere on the marketing
 * site. The calculator therefore measures *recoverable bookings per year*
 * (missed calls × 52 weeks × recovery rate) instead of revenue figures.
 * The result is a forward-looking estimate, labelled as such.
 */
const WEEKS_PER_YEAR = 52;

const RECOVERY_PRESETS = [
  { label: "Conservative (25%)", value: 0.25 },
  { label: "Typical (40%)", value: 0.4 },
  { label: "Aggressive (60%)", value: 0.6 },
];

export default function RoiCalculator() {
  const [missedCalls, setMissedCalls] = useState(8);
  const [recovery, setRecovery] = useState(0.4);
  const [displayed, setDisplayed] = useState(0);

  const annual = Math.round(missedCalls * WEEKS_PER_YEAR * recovery);
  const target = useRef(annual);
  const raf = useRef<number>(0);

  // Animate the counter toward the latest annual figure (rAF, ~900ms ease-out).
  useEffect(() => {
    target.current = annual;
    const start = performance.now();
    const from = displayed;
    const duration = 900;
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplayed(from + (target.current - from) * eased);
      if (t < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [annual]);

  const fillPct = (missedCalls / 50) * 100;

  return (
    <div className="glass rounded-2xl p-6 md:p-8">
      <div className="flex items-center gap-2 mb-1">
        <TrendingUp className="h-4 w-4 text-purple-400" />
        <h3 className="text-sm font-semibold text-slate-100">
          What are missed calls costing you?
        </h3>
      </div>
      <p className="text-xs text-slate-400 mb-6">
        A rough estimate of the bookings Sagenify can help you recover.
      </p>

      {/* Missed calls slider */}
      <label
        htmlFor="roi-missed-calls"
        className="flex items-center justify-between text-[13px] mb-3"
      >
        <span className="text-slate-300">Missed calls per week</span>
        <span className="font-semibold text-purple-300 tabular-nums">
          {missedCalls}
        </span>
      </label>
      <input
        id="roi-missed-calls"
        type="range"
        min={1}
        max={50}
        step={1}
        value={missedCalls}
        onChange={(e) => setMissedCalls(Number(e.target.value))}
        className="roi-slider w-full"
        style={{ "--fill": `${fillPct}%` } as CSSProperties}
        aria-valuetext={`${missedCalls} missed calls per week`}
      />
      <div className="flex justify-between text-[10px] text-slate-500 mt-1.5">
        <span>1</span>
        <span>50</span>
      </div>

      {/* Recovery-rate select */}
      <div className="mt-6">
        <span className="text-[13px] text-slate-300">
          Expected recovery rate
        </span>
        <Select
          value={String(recovery)}
          onValueChange={(v) => setRecovery(Number(v))}
        >
          <SelectTrigger className="mt-2 w-full bg-slate-900/60 border-white/10 text-slate-100 h-10">
            <SelectValue placeholder="Select a recovery rate" />
          </SelectTrigger>
          <SelectContent className="bg-slate-900 border-white/10 text-slate-100">
            {RECOVERY_PRESETS.map((p) => (
              <SelectItem key={p.label} value={String(p.value)}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Glowing counter */}
      <div className="mt-7 rounded-xl border border-purple-500/20 bg-gradient-to-br from-purple-500/[0.12] to-transparent p-5 text-center glow-pulse">
        <div className="text-[10px] uppercase tracking-[0.18em] text-purple-300/80 mb-1">
          Recoverable bookings / year*
        </div>
        <div className="text-4xl md:text-5xl font-bold text-white tabular-nums tracking-tight">
          {Math.round(displayed)}
        </div>
        <div className="mt-1 text-[11px] text-slate-400">
          {missedCalls} missed/wk × {WEEKS_PER_YEAR} wks ×{" "}
          {Math.round(recovery * 100)}% recovery
        </div>
      </div>

      <p className="flex items-start gap-1.5 mt-4 text-[11px] text-slate-500">
        <Info className="h-3.5 w-3.5 shrink-0 mt-px text-slate-600" />
        *Estimate for planning only — actual results vary by business.{" "}
        {annual} bookings/yr at current inputs.
      </p>
    </div>
  );
}