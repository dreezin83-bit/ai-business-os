"use client";

import { useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";
import { Check, ChevronDown, Palette } from "lucide-react";

/**
 * ThemeSwitcher — 4-theme picker for the dashboard.
 *
 * Wired through the existing next-themes ThemeProvider (attribute="class"):
 * selecting a theme swaps the class on <html> (dark / light /
 * midnight-purple / cyber-emerald) and next-themes persists the choice in
 * localStorage automatically. "dark" (Pitch Black) stays the default, so
 * existing users are unchanged until they pick another theme. The marketing
 * site never mounts the ThemeProvider and keeps its hardcoded `dark` class.
 */
const THEMES = [
  {
    id: "dark",
    label: "Pitch Black",
    dot: "bg-[#000] ring-1 ring-white/30",
  },
  {
    id: "light",
    label: "Light Mode",
    dot: "bg-white ring-1 ring-slate-400",
  },
  {
    id: "midnight-purple",
    label: "Midnight Purple",
    dot: "bg-gradient-to-br from-indigo-600 to-purple-700",
  },
  {
    id: "cyber-emerald",
    label: "Cyber Emerald",
    dot: "bg-[#34d399]",
  },
] as const;

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const active = THEMES.find((t) => t.id === theme) ?? THEMES[0];

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Change dashboard theme"
        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-[var(--dash-muted)] transition-colors hover:bg-[var(--dash-hover)] hover:text-[var(--dash-heading)]"
      >
        <Palette className="h-4 w-4 shrink-0" />
        <span className="flex-1 text-left">Theme</span>
        <span
          className={`h-3.5 w-3.5 rounded-full ${active.dot}`}
          aria-hidden
        />
        <ChevronDown
          className={`h-3.5 w-3.5 transition-transform ${
            open ? "rotate-180" : ""
          }`}
          aria-hidden
        />
      </button>

      {open && mounted && (
        <div
          role="listbox"
          aria-label="Dashboard themes"
          className="absolute bottom-full left-0 z-50 mb-1 w-56 overflow-hidden rounded-xl border border-[var(--dash-card-border)] bg-[var(--dash-sidebar)] shadow-2xl backdrop-blur-xl"
        >
          {THEMES.map((t) => {
            const isActive = t.id === theme;
            return (
              <button
                key={t.id}
                role="option"
                aria-selected={isActive}
                type="button"
                onClick={() => {
                  setTheme(t.id);
                  setOpen(false);
                }}
                className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm text-[var(--dash-text)] transition-colors hover:bg-[var(--dash-hover)]"
              >
                <span className={`h-3.5 w-3.5 rounded-full ${t.dot}`} aria-hidden />
                <span className="flex-1">{t.label}</span>
                {isActive && (
                  <Check className="h-4 w-4 text-[var(--dash-green)]" aria-hidden />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}