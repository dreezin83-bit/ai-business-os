"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Bot } from "lucide-react";

// The Spline runtime (which bundles Three.js) is only fetched once this
// component decides to mount it — after first idle, in view, desktop only.
// It never blocks first paint and it unmounts when scrolled out of view so
// the WebGL render loop stops burning CPU/GPU while the user reads on.
const Spline = dynamic(() => import("@splinetool/react-spline/next"), {
  ssr: false,
  loading: () => null,
});

/** Static gradient visual shown instantly (and always on mobile). */
function StaticFallback() {
  return (
    <div className="absolute inset-0 flex items-center justify-center overflow-hidden rounded-2xl">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(59,130,246,0.14),transparent_65%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_82%,rgba(168,85,247,0.08),transparent_55%)]" />
      <div className="relative h-24 w-24 rounded-3xl border border-white/10 bg-gradient-to-br from-blue-500/20 via-indigo-500/10 to-purple-500/20 flex items-center justify-center shadow-[0_0_60px_rgba(59,130,246,0.25)]">
        <Bot className="h-10 w-10 text-white/60" />
      </div>
    </div>
  );
}

/**
 * Lazy hero 3D scene (replaces the eagerly-mounted Spline + standalone
 * viewer script that made the landing page lag on slower devices):
 * - Static fallback renders immediately — never blocks first paint.
 * - WebGL mounts only after the page goes idle (requestIdleCallback with a
 *   timeout fallback) AND the element is in view, and only on md+ screens.
 * - Mobile (<md) always shows the static visual — no WebGL at all.
 * - Scrolls out of view → unmount → render loop stops.
 */
export default function SplineHero({
  scene,
  height = 380,
}: {
  scene: string;
  height?: number;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;

    // Phones get the static fallback — WebGL is the main lag source there.
    const mq = window.matchMedia("(min-width: 768px)");
    if (!mq.matches) return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let idleHandle: number | null = null;
    let everMounted = false;

    const clearPending = () => {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      if (idleHandle !== null && "cancelIdleCallback" in window) {
        (window as unknown as {
          cancelIdleCallback(handle: number): void;
        }).cancelIdleCallback(idleHandle);
        idleHandle = null;
      }
    };

    const scheduleMount = () => {
      if (cancelled || timer || idleHandle !== null) return;
      if (everMounted) {
        // Bundle already fetched — remount is cheap, do it immediately.
        setMounted(true);
        return;
      }
      if ("requestIdleCallback" in window) {
        idleHandle = (window as unknown as {
          requestIdleCallback(cb: () => void, opts: { timeout: number }): number;
        }).requestIdleCallback(
          () => {
            if (!cancelled) {
              setMounted(true);
              everMounted = true;
            }
          },
          { timeout: 2000 }
        );
      } else {
        timer = setTimeout(() => {
          if (!cancelled) {
            setMounted(true);
            everMounted = true;
          }
        }, 1500);
      }
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          scheduleMount();
        } else {
          // Left the viewport — stop the render loop.
          clearPending();
          setMounted(false);
        }
      },
      // Slightly larger window so the scene is ready before it fully enters.
      { rootMargin: "150px" }
    );
    observer.observe(el);

    return () => {
      cancelled = true;
      observer.disconnect();
      clearPending();
    };
  }, []);

  return (
    <div
      ref={wrapRef}
      className="relative w-full overflow-hidden rounded-2xl"
      style={{ height }}
    >
      <StaticFallback />
      {mounted && (
        <div className="absolute inset-0">
          <Spline scene={scene} />
        </div>
      )}
    </div>
  );
}
