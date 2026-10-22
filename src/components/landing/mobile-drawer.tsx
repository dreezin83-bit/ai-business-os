"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Menu, MessageCircle, X } from "lucide-react";
import { DISCORD_INVITE_URL } from "@/components/landing/site-links";

const NAV_LINKS = [
  { href: "#features", label: "Features" },
  { href: "#roi", label: "ROI Calculator" },
  { href: "#pricing", label: "Pricing" },
  { href: "#faq", label: "FAQ" },
  { href: "/docs", label: "Docs" },
];

/**
 * Mobile hamburger + slide-over drawer. Visible below md; the desktop nav is
 * hidden on small screens. Body scroll is locked while the drawer is open and
 * Escape closes it (a11y).
 */
export default function MobileDrawer() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        aria-label="Open menu"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className="md:hidden inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-300 hover:bg-white/5 hover:text-white transition-colors"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Backdrop */}
      <div
        aria-hidden
        onClick={() => setOpen(false)}
        className={`fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm transition-opacity duration-300 md:hidden ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      {/* Drawer */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
        className={`fixed top-0 right-0 bottom-0 z-[70] flex w-[85%] max-w-xs flex-col bg-[#050508] border-l border-white/[0.06] p-6 transition-transform duration-300 ease-out md:hidden ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-lg bg-purple-500 flex items-center justify-center text-[10px] font-bold text-white shadow-lg shadow-purple-500/30">
              AI
            </div>
            <span className="font-semibold text-[15px] tracking-tight">
              Sagenify AI
            </span>
          </div>
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-400 hover:bg-white/5 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex flex-col gap-1">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="rounded-xl px-3 py-2.5 text-[15px] text-slate-300 hover:bg-white/5 hover:text-white transition-colors"
            >
              {link.label}
            </Link>
          ))}
          <a
            href={DISCORD_INVITE_URL}
            target="_blank"
            rel="noreferrer"
            onClick={() => setOpen(false)}
            className="mt-1 flex items-center gap-2 rounded-xl px-3 py-2.5 text-[15px] text-slate-300 hover:bg-white/5 hover:text-white transition-colors"
          >
            <MessageCircle className="h-4 w-4 text-purple-400" />
            Support (Discord)
          </a>
        </nav>

        <div className="mt-auto flex flex-col gap-2 pt-8">
          <Link
            href="/sign-in"
            onClick={() => setOpen(false)}
            className="inline-flex h-10 items-center justify-center rounded-full border border-white/15 text-sm text-white transition-colors hover:bg-white/5"
          >
            Sign In
          </Link>
          <Link
            href="/sign-up"
            onClick={() => setOpen(false)}
            className="inline-flex h-10 items-center justify-center rounded-full bg-purple-500 hover:bg-purple-400 text-white font-semibold text-sm transition-colors"
          >
            Get Started
          </Link>
        </div>
      </div>
    </>
  );
}