import { DISCORD_INVITE_URL } from "@/components/landing/site-links";

/**
 * Temporary public entry screen shown while Sagenify AI is invite-only.
 * Keep this component shared so sign-in and sign-up have the same pre-launch
 * experience.
 */
export function LaunchingSoon() {
  return (
    <main className="relative isolate flex min-h-screen items-center justify-center overflow-hidden bg-black px-5 py-12 text-center text-white">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute -right-40 -top-40 h-[28rem] w-[28rem] rounded-full bg-blue-500/10 blur-[110px]" />
        <div className="absolute -bottom-40 -left-40 h-[24rem] w-[24rem] rounded-full bg-purple-500/10 blur-[100px]" />
      </div>

      <section className="relative w-full max-w-xl">
        <div
          aria-hidden="true"
          className="mx-auto mb-7 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 text-xl font-bold text-white shadow-lg shadow-purple-500/25"
        >
          S
        </div>
        <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          Sagenify AI is launching soon
        </h1>
        <p className="mx-auto mt-4 max-w-md text-base leading-7 text-slate-400">
          We&apos;re opening to a small group first.
        </p>

        <a
          href={DISCORD_INVITE_URL}
          target="_blank"
          rel="noreferrer"
          className="mt-8 inline-flex min-h-12 items-center justify-center rounded-full bg-white px-7 py-3 text-sm font-semibold text-black shadow-lg shadow-white/10 transition-colors hover:bg-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-black motion-reduce:transition-none"
        >
          Join the waitlist
        </a>
        <p className="mt-6 text-sm text-slate-400">
          <a
            href="/sign-in?form=1"
            className="underline decoration-slate-600 underline-offset-4 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-black motion-reduce:transition-none"
          >
            Already have an account? Sign in
          </a>
        </p>
      </section>
    </main>
  );
}
