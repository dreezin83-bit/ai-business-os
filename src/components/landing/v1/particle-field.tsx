"use client";

/**
 * Hero particle field — the approved comp's 2D canvas ported as-is.
 *
 * Behaviour is identical to docs/design/landing-v1.html: ~26–88 soft points
 * drifting upward, proximity links at very low alpha, a scroll offset that
 * makes the field lag the page, device pixel ratio capped at 1.5.
 *
 * Performance contract (DESIGN-BRIEF §3):
 *   • paused when the canvas leaves the viewport (IntersectionObserver)
 *   • paused when the tab is hidden (visibilitychange)
 *   • never runs at all under `prefers-reduced-motion` — it paints one static
 *     dot field instead, so the hero still reads as designed
 *   • no WebGL, no library, no per-frame allocation beyond the stroke paths
 */
import { useEffect, useRef } from "react";

type Point = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  a: number;
  pink: boolean;
};

export default function ParticleField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !canvas.getContext) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const reduceQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    let reduced = reduceQuery.matches;

    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    let w = 0;
    let h = 0;
    let points: Point[] = [];
    let raf = 0;
    let running = false;
    let visible = true;
    let spriteA: HTMLCanvasElement;
    let spriteP: HTMLCanvasElement;

    function makeSprite(rgb: string) {
      const s = document.createElement("canvas");
      s.width = s.height = 32;
      const c = s.getContext("2d");
      if (!c) return s;
      const g = c.createRadialGradient(16, 16, 0, 16, 16, 16);
      g.addColorStop(0, `rgba(${rgb},0.95)`);
      g.addColorStop(0.3, `rgba(${rgb},0.4)`);
      g.addColorStop(1, `rgba(${rgb},0)`);
      c.fillStyle = g;
      c.fillRect(0, 0, 32, 32);
      return s;
    }
    spriteA = makeSprite("180,245,255");
    spriteP = makeSprite("255,190,235");

    function count() {
      const area = window.innerWidth * window.innerHeight;
      return Math.max(26, Math.min(88, Math.round(area / 15000)));
    }

    function build() {
      points = [];
      const n = count();
      for (let i = 0; i < n; i++) {
        points.push({
          x: Math.random() * w,
          y: Math.random() * h,
          vx: (Math.random() - 0.5) * 0.16,
          vy: (Math.random() - 0.5) * 0.16 - 0.04,
          r: 0.7 + Math.random() * 1.9,
          a: 0.25 + Math.random() * 0.6,
          pink: Math.random() < 0.26,
        });
      }
    }

    function paintStatic() {
      ctx!.clearRect(0, 0, w, h);
      for (let i = 0; i < points.length; i++) {
        const p = points[i];
        const s = p.r * 7;
        ctx!.globalAlpha = p.a * 0.7;
        ctx!.drawImage(p.pink ? spriteP : spriteA, p.x - s / 2, p.y - s / 2, s, s);
      }
      ctx!.globalAlpha = 1;
    }

    function size() {
      const rect = canvas!.parentElement!.getBoundingClientRect();
      w = Math.max(1, Math.round(rect.width));
      h = Math.max(1, Math.round(rect.height));
      canvas!.width = Math.round(w * dpr);
      canvas!.height = Math.round(h * dpr);
      canvas!.style.width = `${w}px`;
      canvas!.style.height = `${h}px`;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      build();
      if (reduced) paintStatic();
    }

    function frame() {
      raf = 0;
      if (!running) return;
      const scrollOffset = (window.scrollY || 0) * 0.16;
      ctx!.clearRect(0, 0, w, h);

      const maxD = 128;
      const maxD2 = maxD * maxD;

      for (let i = 0; i < points.length; i++) {
        const p = points[i];
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < -20) p.x = w + 20;
        if (p.x > w + 20) p.x = -20;
        if (p.y < -20) p.y = h + 20;
        if (p.y > h + 20) p.y = -20;
      }

      // proximity links — one accent, very low alpha
      ctx!.lineWidth = 1;
      for (let i = 0; i < points.length; i++) {
        const p = points[i];
        for (let j = i + 1; j < points.length; j++) {
          const q = points[j];
          const dx = p.x - q.x;
          const dy = p.y - q.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < maxD2) {
            const t = 1 - d2 / maxD2;
            ctx!.strokeStyle = `rgba(116,255,237,${(t * 0.1).toFixed(3)})`;
            ctx!.beginPath();
            ctx!.moveTo(p.x, p.y - scrollOffset * 0.25);
            ctx!.lineTo(q.x, q.y - scrollOffset * 0.25);
            ctx!.stroke();
          }
        }
      }

      for (let i = 0; i < points.length; i++) {
        const p = points[i];
        const y = p.y - scrollOffset * 0.25;
        if (y < -40 || y > h + 40) continue;
        ctx!.globalAlpha = p.a;
        const s = p.r * 7;
        ctx!.drawImage(p.pink ? spriteP : spriteA, p.x - s / 2, y - s / 2, s, s);
      }
      ctx!.globalAlpha = 1;
      raf = requestAnimationFrame(frame);
    }

    function start() {
      if (running || !visible || reduced) return;
      running = true;
      if (!raf) raf = requestAnimationFrame(frame);
    }
    function stop() {
      running = false;
      if (raf) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
    }

    size();
    start();

    let resizeTimer: ReturnType<typeof setTimeout> | undefined;
    const onResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => size(), 180);
    };
    window.addEventListener("resize", onResize, { passive: true });

    let io: IntersectionObserver | undefined;
    if ("IntersectionObserver" in window) {
      io = new IntersectionObserver(
        (entries) => {
          visible = entries[0].isIntersecting;
          if (visible) start();
          else stop();
        },
        { threshold: 0.01 },
      );
      io.observe(canvas);
    }

    const onVisibility = () => {
      if (document.hidden) stop();
      else start();
    };
    document.addEventListener("visibilitychange", onVisibility);

    // Live response to the OS reduced-motion setting, like the comp.
    const onReduceChange = (e: MediaQueryListEvent) => {
      reduced = e.matches;
      if (reduced) {
        stop();
        paintStatic();
      } else {
        start();
      }
    };
    reduceQuery.addEventListener?.("change", onReduceChange);

    return () => {
      stop();
      clearTimeout(resizeTimer);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVisibility);
      reduceQuery.removeEventListener?.("change", onReduceChange);
      io?.disconnect();
    };
  }, []);

  return <canvas id="field" ref={canvasRef} aria-hidden="true" />;
}
