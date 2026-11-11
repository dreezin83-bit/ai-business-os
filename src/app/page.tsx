import type { Metadata, Viewport } from "next";

import { DISCORD_INVITE_URL } from "@/components/landing/site-links";

export const metadata: Metadata = {
  title: "Sagenify AI — Every call answered. Every job booked.",
  description:
    "Sagenify AI answers your phone and your website chat in your business's voice. Opening to a small group first.",
};

export const viewport: Viewport = {
  themeColor: "#09090B",
  colorScheme: "dark",
};

/**
 * Pre-launch entry page.
 *
 * Replaces the v1 marketing landing (orb hero) on 2026-11-11 at the owner's
 * direction: the page was rejected repeatedly and has been taken down rather
 * than left live. The v1 implementation is still in git history
 * (src/app/page.tsx @ before commit `remove orb landing`) if any of it is
 * wanted later.
 *
 * Deliberately minimal: no product claims beyond what is built and running,
 * no pricing, no testimonials, no imagery. The previous page promised a demo
 * ("Watch it take a call") that did not exist on the page, and carried a
 * gradient orb that communicated nothing.
 */
export default function Home() {
  return (
    <main className="relative isolate flex min-h-screen flex-col bg-[#09090B] text-[#E2E8F0]">
      <header className="px-6 py-7 sm:px-10">
        <span className="text-sm font-semibold tracking-tight text-[#E2E8F0]">
          Sagenify<span className="text-[#8B5CF6]"> AI</span>
        </span>
      </header>

      <div className="flex flex-1 items-center px-6 pb-20 sm:px-10">
        <div className="mx-auto w-full max-w-2xl">
          <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#27272A] px-3 py-1 text-xs text-[#A1A1AA]">
            <span
              aria-hidden="true"
              className="inline-block h-1.5 w-1.5 rounded-full bg-[#8B5CF6]"
            />
            Opening to a small group first
          </p>

          <h1 className="text-4xl font-semibold leading-[1.1] tracking-tight text-white sm:text-5xl md:text-6xl">
            Every call answered.
            <br />
            Every job booked.
          </h1>

          <p className="mt-6 max-w-xl text-base leading-7 text-[#A1A1AA] sm:text-lg">
            Sagenify AI answers your phone and your website chat in your
            business&apos;s voice — so the work you&apos;d have lost to a missed
            call gets booked instead.
          </p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
            <a
              href={DISCORD_INVITE_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-12 items-center justify-center rounded-lg bg-[#E2E8F0] px-6 text-sm font-semibold text-[#09090B] transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8B5CF6] focus-visible:ring-offset-2 focus-visible:ring-offset-[#09090B] motion-reduce:transition-none"
            >
              Join the waitlist
            </a>
            <a
              href="/sign-in?form=1"
              className="inline-flex min-h-12 items-center justify-center rounded-lg border border-[#27272A] px-6 text-sm font-medium text-[#E2E8F0] transition-colors hover:border-[#3F3F46] hover:bg-[#111114] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8B5CF6] focus-visible:ring-offset-2 focus-visible:ring-offset-[#09090B] motion-reduce:transition-none"
            >
              Sign in
            </a>
          </div>
        </div>
      </div>

      <footer className="border-t border-[#18181B] px-6 py-6 sm:px-10">
        <p className="text-xs text-[#52525B]">
          © {new Date().getFullYear()} Sagenify AI
        </p>
      </footer>
    </main>
  );
}
