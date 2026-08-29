"use client";

import { useEffect, useRef, useState } from "react";
import { Bot, Send } from "lucide-react";

type Message = { role: "ai" | "user"; text: string };

const PROMPTS = [
  {
    label: "Book an appointment",
    reply:
      "I can get that booked for you! We have Tuesday 10:30 AM and Thursday 2:00 PM open this week — which works best?",
  },
  {
    label: "Ask for pricing",
    reply:
      "A standard AC repair visit runs around $150–$250 depending on the unit and the issue. Tell me your model and what's happening and I'll narrow it down.",
  },
  {
    label: "Check availability",
    reply:
      "Today is fully booked, but I can have a technician out tomorrow between 9 AM and 11 AM. Want me to hold that slot for you?",
  },
];

const TYPING_MS = 16; // ms per character

/**
 * Interactive chat simulator for the hero. Pure frontend state machine —
 * tapping a prompt chip shows the question and streams a canned, realistic
 * service-business answer with a typewriter effect. No API calls.
 */
export default function ChatSimulator() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "ai",
      text: "Hi! 👋 I'm your AI receptionist. I answer calls and texts, qualify leads, and book appointments. Try a prompt below:",
    },
  ]);
  const [busy, setBusy] = useState(false);
  const [typing, setTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

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

  const sendPrompt = (prompt: (typeof PROMPTS)[number]) => {
    if (busy) return;
    setBusy(true);
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
          }
        };
        stream();
      }, 550)
    );
  };

  return (
    <div className="glass overflow-hidden rounded-2xl border-white/[0.06] shadow-2xl shadow-indigo-950/40">
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
        <div className="w-10" />
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
                  ? "max-w-[80%] rounded-2xl rounded-br-md bg-indigo-500 px-3.5 py-2 text-[13px] text-white"
                  : "max-w-[85%] rounded-2xl rounded-bl-md border border-white/[0.05] bg-white/[0.04] px-3.5 py-2 text-[13px] leading-relaxed text-white/85"
              }
            >
              {m.text}
              {m.role === "ai" && i === messages.length - 1 && typing && (
                <span className="typing-caret ml-0.5 inline-block h-3.5 w-[2px] translate-y-0.5 bg-indigo-400" />
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

      {/* Prompt chips */}
      <div className="border-t border-white/[0.05] bg-white/[0.02] px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          {PROMPTS.map((p) => (
            <button
              key={p.label}
              onClick={() => sendPrompt(p)}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.07] bg-white/[0.03] px-3 py-1.5 text-xs text-white/60 transition-all hover:border-indigo-500/40 hover:bg-indigo-500/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Send className="h-3 w-3 text-indigo-400" />
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
