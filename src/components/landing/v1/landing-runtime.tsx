"use client";

/**
 * The landing's only always-on client island: scroll progress bar, nav
 * "stuck" state, hero parallax variable and the feature-card reveals.
 *
 * Ported from the comp's scrollFx + reveals blocks. One rAF-throttled passive
 * scroll listener for the whole page — not one per section. Everything here is
 * additive: with JS off the page is complete, and under
 * `prefers-reduced-motion` the parallax never runs and every card is simply
 * visible (the CSS arms the reveal state only when
 * `html[data-motion="full"]`).
 */
import { useEffect, useRef } from "react";

export default function LandingRuntime() {
  const progressRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const reduceQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    let reduced = reduceQuery.matches;

    const progress = progressRef.current;
    const nav = document.getElementById("nav");
    const hero = document.getElementById("hero");

    document.documentElement.setAttribute("data-motion", reduced ? "reduced" : "full");

    let ticking = false;

    function apply() {
      ticking = false;
      const y = window.scrollY || window.pageYOffset;
      const docH = document.documentElement.scrollHeight - window.innerHeight;
      if (progress) progress.style.width = `${docH > 0 ? (y / docH) * 100 : 0}%`;
      if (nav) nav.classList.toggle("is-stuck", y > 12);
      if (hero && !reduced) {
        const rect = hero.getBoundingClientRect();
        const p = Math.min(1, Math.max(0, -rect.top / (rect.height || 1)));
        hero.style.setProperty("--hero-y", p.toFixed(3));
      }
    }

    function onScroll() {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(apply);
      }
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    apply();

    // ── Feature-card reveals (scroll only — never hover) ──────────────────
    const items = Array.from(document.querySelectorAll<HTMLElement>(".reveal"));
    let io: IntersectionObserver | undefined;
    const timers: ReturnType<typeof setTimeout>[] = [];

    if (!items.length) {
      /* nothing to reveal */
    } else if (reduced || !("IntersectionObserver" in window)) {
      items.forEach((el) => el.classList.add("is-in"));
    } else {
      io = new IntersectionObserver(
        (entries) => {
          entries.forEach((e) => {
            if (!e.isIntersecting) return;
            const el = e.target as HTMLElement;
            const idx = parseInt(el.style.getPropertyValue("--i") || "0", 10);
            timers.push(setTimeout(() => el.classList.add("is-in"), idx * 70));
            io?.unobserve(el);
          });
        },
        { threshold: 0.2, rootMargin: "0px 0px -8% 0px" },
      );
      items.forEach((el) => io?.observe(el));
    }

    const onChange = (e: MediaQueryListEvent) => {
      reduced = e.matches;
      document.documentElement.setAttribute("data-motion", reduced ? "reduced" : "full");
      if (reduced) {
        items.forEach((el) => el.classList.add("is-in"));
        hero?.style.removeProperty("--hero-y");
      }
    };
    reduceQuery.addEventListener?.("change", onChange);

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      reduceQuery.removeEventListener?.("change", onChange);
      io?.disconnect();
      timers.forEach(clearTimeout);
    };
  }, []);

  return <div className="progress" ref={progressRef} aria-hidden="true" />;
}
