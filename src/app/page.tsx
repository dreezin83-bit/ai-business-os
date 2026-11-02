import type { CSSProperties } from "react";
import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Sora } from "next/font/google";

import "./landing-v1.css";
import LandingRuntime from "@/components/landing/v1/landing-runtime";
import ParticleField from "@/components/landing/v1/particle-field";
import DemoChat from "@/components/landing/v1/demo-chat";
import PeopleSection from "@/components/landing/v1/people-section";

/**
 * Sagenify AI — marketing landing page (approved design v1).
 *
 * Source of truth: docs/design/landing-v1.html @ 03ba72f. Layout, colour,
 * spacing and copy are the owner-approved comp; this file reproduces them in
 * production React/Next rather than restyling them. Copy must not be rewritten
 * here — if a word changes, it changes in the comp first.
 *
 * Architecture:
 *   • This page is a Server Component. Everything static — nav, hero copy, orb
 *     markup, proof strip, feature cards, pricing, FAQ, footer — is rendered on
 *     the server and shipped as HTML. The FAQ is native <details>, so it needs
 *     no JS at all.
 *   • Exactly three client islands, all small and all below/behind the fold of
 *     the critical path: LandingRuntime (scroll progress, nav state, reveals),
 *     ParticleField (hero canvas) and DemoChat (the simulated tour).
 *   • landing-v1.css is imported here, so it is route-scoped: the dashboard
 *     never downloads it. Tokens live once in src/app/design-tokens.css and are
 *     shared with the product.
 */

const sora = Sora({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-sora",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Sagenify AI — Every call answered. Every job booked.",
  description:
    "Sagenify AI answers your phone and your website chat, qualifies the lead, checks your calendar and books the appointment. Built for HVAC, roofing, plumbing and the trades.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "Sagenify AI — Every call answered. Every job booked.",
    description:
      "Sagenify AI answers your phone and your website chat, qualifies the lead, checks your calendar and books the appointment. Built for HVAC, roofing, plumbing and the trades.",
    type: "website",
    siteName: "Sagenify AI",
    url: "/",
    images: [
      {
        url: "/opengraph-image.png",
        width: 1200,
        height: 630,
        alt: "Sagenify AI — your AI office manager",
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Sagenify AI — Every call answered. Every job booked.",
    description:
      "Sagenify AI answers your phone and your website chat, qualifies the lead, checks your calendar and books the appointment. Built for HVAC, roofing, plumbing and the trades.",
    images: ["/opengraph-image.png"],
  },
};

/* The page sits on Midnight Abyss, not the dashboard's black — the browser
   chrome should match the surface the visitor actually lands on. */
export const viewport: Viewport = {
  themeColor: "#0D1229",
};

/** Feature cards: order is the comp's, `--i` drives the reveal stagger. */
const FEATURES = [
  {
    title: "AI phone receptionist",
    body: "Picks up in one ring, day or night. Takes the name, the address, the problem and how urgent it is — then books the slot or hands it to you.",
    icon: (
      <svg width="19" height="19" viewBox="0 0 24 24" fill="none">
        <path
          d="M6.5 3.5h3l1.6 4-2 1.4a12 12 0 0 0 6 6l1.4-2 4 1.6v3a2 2 0 0 1-2.2 2A17 17 0 0 1 4.5 5.7a2 2 0 0 1 2-2.2Z"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    title: "Website chatbot",
    body: "Answers from your services, your pricing rules and your service area. Visitors get a real answer instead of a contact form.",
    icon: (
      <svg width="19" height="19" viewBox="0 0 24 24" fill="none">
        <path
          d="M4 5.5A1.5 1.5 0 0 1 5.5 4h13A1.5 1.5 0 0 1 20 5.5v9a1.5 1.5 0 0 1-1.5 1.5H9l-4 4v-4H5.5A1.5 1.5 0 0 1 4 14.5v-9Z"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    title: "Leads and CRM",
    body: "Every call, chat and form becomes one lead record with the full transcript attached. Nothing lives in a notebook on the dash.",
    icon: (
      <svg width="19" height="19" viewBox="0 0 24 24" fill="none">
        <path d="M4 6.5h16M4 12h16M4 17.5h9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <circle cx="18" cy="17.5" r="2.4" stroke="currentColor" strokeWidth="1.6" />
      </svg>
    ),
  },
  {
    title: "Appointment booking",
    body: "Real availability, not a promise to call back. The customer picks a window, gets a confirmation, and the job shows up on the schedule.",
    icon: (
      <svg width="19" height="19" viewBox="0 0 24 24" fill="none">
        <rect x="3.5" y="5" width="17" height="15" rx="2.5" stroke="currentColor" strokeWidth="1.6" />
        <path
          d="M3.5 9.5h17M8 3.5v3M16 3.5v3M8 14h3"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    title: "Email follow-up",
    body: "Quotes chased, reviews requested, cold leads re-warmed — on a schedule you set once and then stop thinking about.",
    icon: (
      <svg width="19" height="19" viewBox="0 0 24 24" fill="none">
        <rect x="3.5" y="5.5" width="17" height="13" rx="2.5" stroke="currentColor" strokeWidth="1.6" />
        <path
          d="m4.5 7.5 7.5 5.5 7.5-5.5"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    title: "Reporting that answers a question",
    body: "Which calls became jobs, what the AI handled on its own, what it cost you in credits. Not a dashboard of pretty numbers.",
    icon: (
      <svg width="19" height="19" viewBox="0 0 24 24" fill="none">
        <path
          d="M4 19.5V13M9.3 19.5V8M14.7 19.5v-4.5M20 19.5V4.5"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
];

const INCLUDED = [
  "4,000 AI credits each month",
  "AI phone receptionist, 24/7",
  "Website chatbot widget",
  "CRM, leads and transcripts",
  "Appointment booking and reminders",
  "Email follow-up automations",
  "Your own knowledge base",
  "Usage and cost reporting",
];

const FAQ = [
  {
    q: "Do I have to change my phone number?",
    a: "No. Forward your existing line to your Sagenify number, or set it to forward only after hours and at weekends. The number on the van stays the number on the van.",
  },
  {
    q: "What happens when it doesn't know the answer?",
    a: "It says so, takes a message, and hands the call to you by text and email within seconds. It never invents a price, a warranty or a promise on your behalf.",
  },
  {
    q: "How long does setup actually take?",
    a: "About thirty minutes. You enter your services, service area, hours and the questions you get asked every day. The knowledge base does the rest, and it sharpens with every real conversation.",
  },
  {
    q: "What are credits, and will I run out?",
    a: "Credits are AI usage. Every paid workspace includes 4,000 a month — roughly $20 of AI at our cost, which covers several hundred conversations including voice minutes. You get a warning at 15% remaining, then 24 hours of grace before anything is cut off. Top-ups start at $10.",
  },
  {
    q: "Is my customer data separate from other businesses?",
    a: "Yes. Every workspace is isolated — its own knowledge base, call records, leads and number. Nothing is shared between accounts and nothing is trained across them.",
  },
  {
    q: "What is the founding member price lock?",
    a: "$199 a month for as long as your subscription stays active — even after the standard $299 rate applies to new signups. If you cancel and come back later, you rejoin at the current rate.",
  },
];

const Tick = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M4 12.5l5 5L20 6.5"
      stroke="#74FFED"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const Arrow = ({ size = 17, stroke = "#fff" }: { size?: number; stroke?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M5 12h13M13 6l6 6-6 6"
      stroke={stroke}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export default function HomePage() {
  return (
    <div className={`landing ${sora.variable}`}>
      <LandingRuntime />

      {/* ───────────────────────── NAV ───────────────────────── */}
      <header className="nav" id="nav">
        <div className="nav__inner">
          <a className="brand" href="#top" aria-label="Sagenify AI — home">
            <span className="brand__mark" aria-hidden="true" />
            <span className="brand__name">
              Sagenify <span>AI</span>
            </span>
          </a>
          <nav className="nav__links" aria-label="Sections">
            <a href="#demo">How it works</a>
            <a href="#features">Platform</a>
            <a href="#pricing">Pricing</a>
            <a href="#faq">FAQ</a>
          </nav>
          <Link className="btn-quiet" href="/sign-in">
            Sign in
          </Link>
        </div>
      </header>

      <main id="top">
        {/* ─────────────────────── HERO ─────────────────────── */}
        <section className="hero" id="hero">
          <ParticleField />
          <div className="grain hero__grain" aria-hidden="true" />

          <div className="hero__inner">
            <div className="hero__orbwrap">
              {/* AI orb: pure CSS. Three masked conic rings, a breathing sphere
                  and blurred halos. No WebGL, no images, no library. */}
              <div className="orb" id="orb" aria-hidden="true">
                <div className="orb__halo" />
                <div className="orb__halo orb__halo--aqua" />
                <div className="orb__halo orb__halo--pink" />
                <div className="orb__ring orb__ring--b" />
                <div className="orb__ring orb__ring--c" />
                <div className="orb__sphere">
                  <div className="orb__core" />
                  <div className="orb__core orb__core--pink" />
                </div>
                <div className="orb__limb" />
                <div className="orb__iris" />
                <div className="orb__ring orb__ring--a" />
              </div>
            </div>

            <div className="hero__copy">
              <span className="chip">
                <span className="chip__dot" aria-hidden="true" />
                Founding member rate — $199/mo for life
              </span>
              <h1>Every call answered. Every job booked.</h1>
              <p className="hero__sub">
                Sagenify answers your phone and your website chat in your business&apos;s voice
                — qualifies the lead, checks your calendar, and books the appointment while
                you&apos;re still on the roof.
              </p>

              <div className="hero__cta">
                <Link className="btn" href="/sign-up">
                  Start at $199/month
                  <span className="btn__arrow" aria-hidden="true">
                    <Arrow />
                  </span>
                </Link>
                <a className="textlink" href="#demo">
                  Watch it take a call
                  <Arrow size={15} stroke="currentColor" />
                </a>
              </div>

              <p className="hero__micro">
                <span>50 free chat messages to try it</span>
                <i aria-hidden="true" />
                <span>Voice on paid plans</span>
                <i aria-hidden="true" />
                <span>Setup in ~30 min</span>
              </p>
            </div>
          </div>
        </section>

        {/* ──────────────────── PROOF STRIP ──────────────────── */}
        <section className="proof" aria-label="What Sagenify does">
          <div className="wrap">
            <div className="proof__grid">
              <div className="proof__item">
                <span className="proof__k">Answers calls</span>
                <span className="proof__v">24/7, first ring</span>
              </div>
              <div className="proof__item">
                <span className="proof__k">Qualifies leads</span>
                <span className="proof__v">Service, address, urgency</span>
              </div>
              <div className="proof__item">
                <span className="proof__k">Books jobs</span>
                <span className="proof__v">Into your real calendar</span>
              </div>
              <div className="proof__item">
                <span className="proof__k">Follows up</span>
                <span className="proof__v">Quotes, reminders, reviews</span>
              </div>
            </div>
          </div>
        </section>

        {/* ─────────────────────── DEMO ─────────────────────── */}
        <section className="section demo" id="demo">
          <div className="demo__glow" aria-hidden="true" />
          <div className="wrap demo__grid">
            <div className="demo__copy">
              <span className="overline">Simulated tour</span>
              <h2 className="h2">Watch it take a call.</h2>
              <p className="lede">
                A homeowner messages at 9:47 on a Tuesday night. The AI answers from your
                services and your calendar — then puts a booked job on Thursday afternoon with
                a tech&apos;s name on it.
              </p>
              <ul className="demo__list">
                <li>
                  <Tick size={15} />
                  Reads from your services, hours and service area — not a generic model.
                </li>
                <li>
                  <Tick size={15} />
                  Checks real availability before it offers a slot.
                </li>
                <li>
                  <Tick size={15} />
                  Sends the confirmation text, then the reminder the morning of the job.
                </li>
              </ul>
            </div>

            <div>
              <DemoChat />
            </div>
          </div>
        </section>

        {/* ────────────────────── FEATURES ───────────────────── */}
        <section className="section features" id="features">
          <div className="wrap">
            <div className="features__head">
              <span className="overline">The platform</span>
              <h2 className="h2">One workspace for everything the phone used to swallow.</h2>
            </div>

            <div className="cards" id="cards">
              {FEATURES.map((f, i) => (
                <article
                  className="card reveal"
                  key={f.title}
                  style={{ "--i": i } as CSSProperties}
                >
                  <span className="card__line" aria-hidden="true" />
                  <div className="card__icon" aria-hidden="true">
                    {f.icon}
                  </div>
                  <h3>{f.title}</h3>
                  <p>{f.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ─────────────── WHO IT'S FOR (editorial) ─────────────── */}
        <PeopleSection />

        {/* ─────────────────────── PRICING ─────────────────────── */}
        <section className="section pricing" id="pricing">
          <div className="pricing__glow" aria-hidden="true" />
          <div className="wrap">
            <div className="pricing__head">
              <span className="overline">Founding member pricing</span>
              <h2 className="h2">One price. Locked for as long as you stay.</h2>
              <p>
                $199 a month is the founding member rate — and you keep it for life while your
                subscription stays active, even after the standard $299 rate applies to new
                signups.
              </p>
            </div>

            <div className="plans">
              <article className="plan plan--featured">
                <div className="plan__top">
                  <span className="plan__name">Monthly</span>
                  <span className="plan__flag">Early bird</span>
                </div>
                <div className="plan__price">
                  <span className="plan__amount">$199</span>
                  <span className="plan__per">/month</span>
                  <span className="plan__was">$299</span>
                </div>
                <p className="plan__sub">
                  Billed monthly, from month one. Your rate is locked for life.
                </p>
                <Link className="btn btn--wide" href="/sign-up">
                  Start monthly
                </Link>
                <p className="plan__saving">
                  Cancel any time. Your rate never rises while you stay.
                </p>
              </article>

              <article className="plan">
                <div className="plan__top">
                  <span className="plan__name">6 months</span>
                </div>
                <div className="plan__price">
                  <span className="plan__amount">$1,194</span>
                  <span className="plan__per">/6 months</span>
                </div>
                <p className="plan__sub">
                  $199 a month, paid twice a year. Fewer invoices to think about.
                </p>
                <Link className="btn-quiet" href="/sign-up">
                  Start 6-month plan
                </Link>
              </article>

              <article className="plan">
                <div className="plan__top">
                  <span className="plan__name">Yearly</span>
                </div>
                <div className="plan__price">
                  <span className="plan__amount">$2,268</span>
                  <span className="plan__per">/year</span>
                </div>
                <p className="plan__sub">$189 a month — 5% off the monthly rate, paid once.</p>
                <Link className="btn-quiet" href="/sign-up">
                  Start yearly plan
                </Link>
              </article>
            </div>

            <div className="included">
              <h3>Every plan includes</h3>
              <ul>
                {INCLUDED.map((item) => (
                  <li key={item}>
                    <Tick />
                    {item}
                  </li>
                ))}
              </ul>
              <p className="included__foot">
                4,000 credits is roughly $20 of AI usage at our provider cost — several hundred
                conversations a month, voice minutes included. You get a warning at 15%
                remaining, and top-ups start at $10. Prices in USD, billed from month one.
              </p>
            </div>
          </div>
        </section>

        {/* ──────────────────────── FAQ ──────────────────────── */}
        <section className="section faq" id="faq">
          <div className="wrap faq__grid">
            <div className="faq__head">
              <span className="overline">Questions</span>
              <h2 className="h2">The things every owner asks first.</h2>
            </div>

            <div className="faq__list">
              {FAQ.map((item, i) => (
                <details key={item.q} open={i === 0}>
                  <summary>
                    {item.q}
                    <span className="pm" aria-hidden="true" />
                  </summary>
                  <div className="answer">{item.a}</div>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* ───────────────────── FINAL CTA ───────────────────── */}
        <section className="final">
          <div className="final__glow" aria-hidden="true" />
          <div className="wrap final__inner">
            <h2 className="h2">The next call is the one that pays for this.</h2>
            <p>
              Enter your services, your hours and your calendar in about thirty minutes. Then
              go back to the job you were already on.
            </p>
            <Link className="btn" href="/sign-up">
              Start at $199/month
              <span className="btn__arrow" aria-hidden="true">
                <Arrow />
              </span>
            </Link>
            <p className="final__micro">
              Founding member rate locked for life · Billed from month one
            </p>
          </div>
        </section>
      </main>

      {/* ─────────────────────── FOOTER ─────────────────────── */}
      <footer className="foot">
        <div className="wrap foot__inner">
          <div className="foot__brand">
            <span className="brand__mark" aria-hidden="true" />
            <div>
              <div className="brand__name">
                Sagenify <span>AI</span>
              </div>
              <p className="foot__tag">
                AI receptionist, website chat and CRM for service businesses.
              </p>
            </div>
          </div>
          <nav className="foot__links" aria-label="Footer">
            <a href="#demo">How it works</a>
            <a href="#features">Platform</a>
            <a href="#pricing">Pricing</a>
            <a href="#faq">FAQ</a>
            <Link href="/sign-in">Sign in</Link>
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
          </nav>
          <p className="foot__legal">
            © 2026 Sagenify AI. <span>All rights reserved.</span>
          </p>
        </div>
      </footer>
    </div>
  );
}
