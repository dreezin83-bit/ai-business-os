"use client";

import { useEffect, useRef, useState } from "react";
import { Bot, Send, RotateCw } from "lucide-react";

type Message = { role: "ai" | "user"; text: string };
type Script = { label: string; reply: string };
type Industry = { id: string; name: string; demo: string; scripts: Script[] };

/**
 * Rotating chat preview. The simulator cycles through scripted conversations
 * across several service industries (HVAC, dental, legal...) so the preview
 * looks universal rather than tied to one vertical. Pure frontend state
 * machine — no API calls. Manual chip clicks yield the auto-loop for 15s.
 *
 * Owner correction (2026-10): no dollar amounts in any copy.
 */
const INDUSTRIES: Industry[] = [
  {
    id: "hvac",
    name: "HVAC company",
    demo: "an HVAC company",
    scripts: [
      {
        label: "Book an AC repair",
        reply:
          "I can get that scheduled! We have Tuesday 10:30 AM and Thursday 2:00 PM open this week — which works best for you?",
      },
      {
        label: "Check availability",
        reply:
          "Today is fully booked, but I can have a technician out tomorrow between 9 AM and 11 AM. Want me to hold that slot for you?",
      },
      {
        label: "Ask about cost",
        reply:
          "A repair visit depends on your unit and what's happening — tell me the model and the issue and I'll have the team confirm a quote before we book anything.",
      },
    ],
  },
  {
    id: "dental",
    name: "dental clinic",
    demo: "a dental clinic",
    scripts: [
      {
        label: "Emergency toothache",
        reply:
          "I'm sorry to hear that! I can get you in for an urgent consultation today at 3:15 PM with Dr. Ellis. Does that work for you?",
      },
      {
        label: "Book a cleaning",
        reply:
          "Great — a hygiene appointment runs about an hour. We have Thursday 9:00 AM and Friday 1:30 PM open this week. Which do you prefer?",
      },
      {
        label: "Ask about insurance",
        reply:
          "We work with most major dental plans. Send us your policy details or bring your card to the visit and we'll verify coverage for you.",
      },
    ],
  },
  {
    id: "legal",
    name: "law firm",
    demo: "a law firm",
    scripts: [
      {
        label: "Request a consultation",
        reply:
          "Of course — we offer an initial consultation to review your matter. Our intake specialist will call you back today. What's the best number to reach you?",
      },
      {
        label: "Case intake",
        reply:
          "I'll note the key details you share and route them to the right attorney. Which practice area does this involve?",
      },
      {
        label: "Ask about fees",
        reply:
          "Fee structures vary by matter type. Our team will walk you through the engagement terms before anything starts — no surprises.",
      },
    ],
  },
];

const TYPING_MS = 14; // ms per character

const GREETING =
  "Hi! 👋 I'm your AI receptionist. I answer calls and chats 24/7, qualify leads, and book appointments.";

export default function ChatSimulator() {
  const [messages, setMessages] = useState<Message[]>([
    { role: "ai", text: GREETING },
  ]);
  const [busy, setBusy] = useState(false);
  const [typing, setTyping] = useState(false);
  const [industryIdx, setIndustryIdx] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  // Refs read by the auto-rotate loop so it never sees a stale closure.
  const busyRef = useRef(false);
  const industryRef = useRef(0); // active industry for auto-play
  const scriptIdxRef = useRef(0); // next script within that industry
  const lastInteractionRef = useRef(0); // epoch start → demo plays on load

  // Keep the latest message scrolled into view.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, typing]);

  // Clear any pending typewriter timers on unmount.
  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach(clearTimeout);
  }, []);

  const resetDemo = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setMessages([{ role: "ai", text: GREETING }]);
    setTyping(false);
    setBusy(false);
    busyRef.current = false;
  };

  const advanceIndustry = () => {
    industryRef.current = (industryRef.current + 1) % INDUSTRIES.length;
    setIndustryIdx(industryRef.current);
    scriptIdxRef.current = 0;
    resetDemo();
  };

  const sendPrompt = (prompt: Script, manual = false) => {
    if (busyRef.current) return;
    if (manual) lastInteractionRef.current = Date.now();
    setBusy(true);
    busyRef.current = true;
    setMessages((prev) => [...prev, { role: "user", text: prompt.label }]);

    // Small delay, then stream the reply character by character.
    timers.current.push(
      setTimeout(() => {
        setTyping(true);
        const full = prompt.reply;
        let i = 0;
        const stream = () => {
          i += 1;
          setMessages((prev) => {
            const next = [...prev];
            const last = next[next.length - 1];
            if (last && last.role === "ai") {
              next[next.length - 1] = { role: "ai", text: full.slice(0, i) };
            } else {
              next.push({ role: "ai", text: full.slice(0, i) });
            }
            return next;
          });
          if (i < full.length) {
            timers.current.push(setTimeout(stream, TYPING_MS));
          } else {
            setTyping(false);
            setBusy(false);
            busyRef.current = false;
          }
        };
        stream();
      }, 500)
    );
  };

  // Rotating preview: play each scripted conversation of the active industry,
  // then switch to the next industry and loop back to the greeting. Yields to
  // a visitor actively clicking chips and resumes after 15s of idle.
  useEffect(() => {
    const loop = setInterval(() => {
      if (busyRef.current || document.hidden) return;
      if (Date.now() - lastInteractionRef.current < 15000) return;
      const industry = INDUSTRIES[industryRef.current];
      if (scriptIdxRef.current >= industry.scripts.length) {
        advanceIndustry();
        return;
      }
      const prompt = industry.scripts[scriptIdxRef.current];
      scriptIdxRef.current += 1;
      sendPrompt(prompt);
    }, 5000);
    return () => clearInterval(loop);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const active = INDUSTRIES[industryIdx];

  return (
    <div className="glass overflow-hidden rounded-2xl border-white/[0.06] shadow-2xl shadow-purple-950/40">
      {/* Browser chrome */}
      <div className="flex items-center gap-2 border-b border-white/[0.05] bg-white/[0.02] px-4 py-2.5">
        <div className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-red-500/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-500/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/70" />
        </div>
        <div className="mx-auto flex items-center gap-1.5 rounded-full bg-white/[0.04] px-3 py-1 text-[11px] text-white/40">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          yourbusiness.com
        </div>
        <RotateCw className="h-3 w-3 text-purple-400/70" aria-hidden />
      </div>

      {/* Rotating industry context */}
      <div className="flex items-center justify-center gap-1.5 border-b border-white/[0.04] bg-purple-500/[0.05] px-3 py-1.5 text-[10px] tracking-wide text-purple-300/80">
        Demo conversation — now playing: {active.demo}
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex h-56 flex-col gap-3 overflow-y-auto px-4 py-4"
      >
        {messages.map((m, i) => (
          <div
            key={i}
            className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={
                m.role === "user"
                  ? "max-w-[80%] rounded-2xl rounded-br-md bg-purple-500 px-3.5 py-2 text-[13px] text-white"
                  : "max-w-[85%] rounded-2xl rounded-bl-md border border-white/[0.05] bg-white/[0.04] px-3.5 py-2 text-[13px] leading-relaxed text-white/85"
              }
            >
              {m.text}
              {m.role === "ai" && i === messages.length - 1 && typing && (
                <span className="typing-caret ml-0.5 inline-block h-3.5 w-[2px] translate-y-0.5 bg-purple-400" />
              )}
            </div>
          </div>
        ))}
        {busy && !typing && (
          <div className="flex justify-start">
            <div className="flex items-center gap-1 rounded-2xl rounded-bl-md border border-white/[0.05] bg-white/[0.04] px-3.5 py-2.5">
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-white/30 [animation-delay:0ms]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-white/30 [animation-delay:120ms]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-white/30 [animation-delay:240ms]" />
            </div>
          </div>
        )}
      </div>

      {/* Prompt chips for the active industry */}
      <div className="border-t border-white/[0.05] bg-white/[0.02] px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          {active.scripts.map((p) => (
            <button
              key={p.label}
              onClick={() => sendPrompt(p, true)}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.07] bg-white/[0.03] px-3 py-1.5 text-xs text-white/60 transition-all hover:border-purple-500/40 hover:bg-purple-500/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Send className="h-3 w-3 text-purple-400" />
              {p.label}
            </button>
          ))}
        </div>
        <p className="mt-2.5 flex items-center gap-1.5 text-[10px] text-white/25">
          <Bot className="h-3 w-3" />
          Simulated preview — your AI will use your real business info.
        </p>
      </div>
    </div>
  );
}