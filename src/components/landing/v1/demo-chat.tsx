"use client";

/**
 * The simulated tour — the approved comp's chat demo, as a client island.
 *
 * No network calls, no API, no product state: a scripted sequence of bubbles
 * (typing indicator → "I need an AC repair." → AI reply → booked card) that a
 * contractor recognises as their own Tuesday night.
 *
 * Rules from the brief (§4) and the task:
 *   • runs on scroll into view, pauses when it leaves the viewport or the tab
 *     is hidden, and resumes where it stopped
 *   • holds its end state — it never loops or resets on its own, so the page
 *     never moves under someone reading below it
 *   • under `prefers-reduced-motion` it renders the complete end state with no
 *     timers at all
 *   • never blocks scroll: every timer is a plain setTimeout, cancelled on
 *     unmount, and the pane has a fixed height so nothing shifts
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type Bubble = { id: number; kind: "ai" | "them"; text: string; seed?: boolean };
type Step =
  | { kind: "typing"; ms: number }
  | { kind: "ai" | "them"; text: string }
  | { kind: "booked" };

/** The thread already contains this — so the pane is never an empty box. */
const SEED: { kind: "ai" | "them"; text: string }[] = [
  {
    kind: "ai",
    text: "Northline Air & Heat — you've reached our after-hours assistant. How can I help?",
  },
  { kind: "them", text: "Hi, do you cover Round Rock?" },
  {
    kind: "ai",
    text: "We do — AC repair, tune-ups and installs across Round Rock and Cedar Park.",
  },
];

const SCRIPT: Step[] = [
  { kind: "typing", ms: 1150 },
  { kind: "them", text: "I need an AC repair." },
  { kind: "typing", ms: 1450 },
  {
    kind: "ai",
    text: "Got it — I can get a tech out today. Is it blowing warm air, or not running at all?",
  },
  { kind: "them", text: "Blowing warm. Upstairs is unbearable." },
  { kind: "typing", ms: 1250 },
  {
    kind: "ai",
    text: "Thanks. I have Thursday, 2–4 PM with Marcus — he covers AC repair in Round Rock. Want me to lock that in?",
  },
  { kind: "them", text: "Yes please." },
  { kind: "booked" },
];

/** How many bubbles the 286px pane shows before the top one fades under the
 *  mask — the comp trims by measurement; a fixed window is the same picture
 *  without touching DOM React owns. */
const VISIBLE = 6;

let uid = 0;
const nextId = () => ++uid;

export default function DemoChat() {
  const chatRef = useRef<HTMLDivElement>(null);
  const [bubbles, setBubbles] = useState<Bubble[]>(() =>
    SEED.map((m) => ({ ...m, id: nextId(), seed: true })),
  );
  const [typing, setTyping] = useState(false);
  const [booked, setBooked] = useState(false);
  const [step, setStep] = useState(0);
  const [active, setActive] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [mounted, setMounted] = useState(false);

  const endState = useCallback(() => {
    const messages = SCRIPT.filter(
      (s): s is { kind: "ai" | "them"; text: string } => s.kind === "ai" || s.kind === "them",
    );
    setBubbles([
      ...SEED.map((m) => ({ ...m, id: nextId(), seed: true })),
      ...messages.map((m) => ({ ...m, id: nextId() })),
    ]);
    setTyping(false);
    setBooked(true);
    setStep(SCRIPT.length);
  }, []);

  // Client-only motion preference + viewport gating.
  useEffect(() => {
    setMounted(true);
    const q = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(q.matches);
    if (q.matches) endState();

    const onChange = (e: MediaQueryListEvent) => {
      setReduced(e.matches);
      if (e.matches) {
        setActive(false);
        endState();
      } else {
        setBubbles(SEED.map((m) => ({ ...m, id: nextId(), seed: true })));
        setBooked(false);
        setStep(0);
      }
    };
    q.addEventListener?.("change", onChange);
    return () => q.removeEventListener?.("change", onChange);
  }, [endState]);

  // Pause offscreen / on tab hide. The sequence resumes where it stopped.
  useEffect(() => {
    if (!mounted) return;
    const chat = chatRef.current;
    if (!chat) return;

    let inView = false;
    let io: IntersectionObserver | undefined;

    if ("IntersectionObserver" in window) {
      io = new IntersectionObserver(
        (entries) => {
          const e = entries[0];
          inView = e.isIntersecting && e.intersectionRatio > 0.3;
          setActive(inView);
        },
        { threshold: [0, 0.3, 0.6] },
      );
      io.observe(chat);
    } else {
      setActive(true);
    }

    const onVisibility = () => {
      if (document.hidden) setActive(false);
      else if (inView) setActive(true);
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      io?.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [mounted]);

  // The scripted sequence. One timer at a time; the effect cleanup cancels it,
  // which is what makes "pause offscreen, resume on return" free.
  useEffect(() => {
    if (!mounted || reduced || !active) return;
    if (step >= SCRIPT.length) return;

    const s = SCRIPT[step];
    // The first bubble after a typing indicator lands immediately; every other
    // bubble gets the comp's 520ms beat.
    const afterTyping = step > 0 && SCRIPT[step - 1].kind === "typing";

    if (s.kind === "typing") {
      setTyping(true);
      const t = setTimeout(() => {
        setTyping(false);
        setStep((i) => i + 1);
      }, s.ms);
      return () => clearTimeout(t);
    }

    if (s.kind === "booked") {
      const t = setTimeout(() => {
        setBooked(true);
        setStep((i) => i + 1);
      }, 700);
      return () => clearTimeout(t);
    }

    const t = setTimeout(
      () => {
        setBubbles((b) => [...b, { id: nextId(), kind: s.kind, text: s.text }]);
        setStep((i) => i + 1);
      },
      afterTyping ? 0 : 520,
    );
    return () => clearTimeout(t);
  }, [mounted, reduced, active, step]);

  const replay = useCallback(() => {
    setBubbles(SEED.map((m) => ({ ...m, id: nextId(), seed: true })));
    setTyping(false);
    setBooked(false);
    setStep(0);
    setActive(true);
    if (reduced) endState();
  }, [reduced, endState]);

  const visible = useMemo(() => bubbles.slice(-VISIBLE), [bubbles]);

  return (
    <>
      <div className="chat" ref={chatRef}>
        <div className="chat__head">
          <div className="chat__avatar" aria-hidden="true">
            NH
          </div>
          <div className="chat__who">
            <span className="chat__name">Northline Air &amp; Heat</span>
            <span className="chat__status">
              <i aria-hidden="true" />
              AI receptionist · replies instantly
            </span>
          </div>
          <span className="chat__tag">Demo</span>
        </div>

        <div className="chat__body" aria-live="polite" aria-label="Simulated conversation">
          {visible.map((m) => (
            <div
              key={m.id}
              className={`msg ${m.kind === "them" ? "msg--them" : "msg--ai"}${
                m.seed ? " msg--seed" : ""
              }`}
            >
              {m.text}
            </div>
          ))}
          {typing && !reduced ? (
            <div className="typing" aria-hidden="true">
              <i />
              <i />
              <i />
            </div>
          ) : null}
        </div>

        <div className={`bookcard${booked ? " is-in" : ""}`}>
          <div className="bookcard__badge" aria-hidden="true">
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none">
              <path
                d="M4 12.5l5 5L20 6.5"
                stroke="currentColor"
                strokeWidth="2.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div className="bookcard__body">
            <div className="bookcard__title">
              Thursday · 2:00–4:00 PM <em>Booked</em>
            </div>
            <div className="bookcard__meta">Marcus D. · AC repair · confirmation text sent</div>
          </div>
        </div>
      </div>

      <div className="demo__foot">
        <span className="demo__note">Simulated on this page — no data leaves your browser.</span>
        <button className="replay" type="button" onClick={replay}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M20 12a8 8 0 1 1-2.34-5.66M20 4v5h-5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Replay
        </button>
      </div>
    </>
  );
}
