# Sagenify AI — Design Brief v1

**Owner direction, 2026-10-31.** This is the binding brief for the design work. Anyone designing or building against it implements *this*, not their own taste.

**Bar to clear:** breathtaking on first scroll. Futuristic, high-energy, elite — and still trustworthy enough that a 50-year-old HVAC owner hands over $199/month.

**Mobile-first, touch-first.** Design at 390×844 first and make it excellent there. Desktop is the adaptation, not the source. **Hover states are not a design tool here** — every interaction must work with a thumb: tap, swipe, scroll.

---

## 1. Colour system

Five brand colours. Neutrals (white, muted grey) are derived and do not count as brand colours.

| Role | Name | Hex |
|---|---|---|
| Base (primary surface) | Midnight Abyss | `#171F44` |
| Base (secondary surface / cards) | Charcoal Black | `#21232E` |
| Primary action | Royal Blue | `#105BFF` |
| Highlight / CTA | Tangerine Orange | `#FE8500` |
| AI glow accent 1 | Baby Pink | `#FE81D1` |
| AI glow accent 2 | Aqua Jade | `#74FFED` |

### Required tints and shades

**Midnight Abyss**
`900 #0D1229` · `800 #121936` · **`700 #171F44`** · `600 #1E2A5C` · `500 #26356F`

**Charcoal Black**
`900 #14151C` · `800 #1A1C25` · **`700 #21232E`** · `600 #2A2D3A` · `500 #343849`

**Royal Blue**
`700 #0B46CC` · **`500 #105BFF`** · `300 #4A85FF` · `100 #D9E6FF`

**Tangerine Orange**
`700 #CC6A00` · **`500 #FE8500`** · `300 #FFA23D` · `100 #FFEBD1`

**Glow accents (pink / aqua)** — these are *light*, not paint. Use them only as: glow, gradient stop, thin 1px accent line, active-state ring, particle colour. **Never** as body text, button fill, or a large flat area.

**Neutrals**
`text-primary #FFFFFF` · `text-secondary #B9C0D4` · `text-tertiary #7C86A0` · `border rgba(255,255,255,0.08)` · `border-strong rgba(255,255,255,0.16)`

### Hard contrast rules
- Body copy in `#B9C0D4` or lighter on both base colours. Never grey-on-grey.
- **Royal Blue is a fill, not ink.** Blue text on Midnight Abyss fails contrast badly — buttons are blue *blocks* with white labels.
- Tangerine Orange as a button fill pairs with **near-black** (`#14151C`) text, not white.
- Pink and aqua never carry meaning on their own — no text, no icon-only state.
- Every interactive element: visible focus/active ring, minimum 44×44px touch target.

---

## 2. Structure of the landing page (mobile order)

1. **Hero** — 3D AI sphere, headline, one primary CTA, one quiet secondary link. The sphere must never push the headline below the fold.
2. **Proof strip** — what it does in five words: answers calls, qualifies leads, books jobs, follows up.
3. **Interactive demo** — the simulated tour (section 4).
4. **Feature cards** — 3D-tilting glass cards on scroll.
5. **Pricing** — $199/mo early-bird, 6-month $1,194, yearly $2,268, crossed-out $299 anchor.
6. **FAQ** — short, answers real objections.
7. **Final CTA** — one action, repeated.

**One primary CTA per screen.** Competing buttons is what makes a page look cheap. Secondary actions are text links.

---

## 3. Motion and 3D

**Stack:** React Three Fiber for the 3D, Framer Motion for scroll and layout motion.

**Hero 3D sphere** — glowing, floating, slow breathing motion. Reacts to **device tilt on mobile** and **scroll progress**, never to mouse hover. On iOS, device-orientation access requires a permission prompt triggered by a tap, so tilt is an **enhancement behind an unobtrusive "tilt to explore" affordance** — the sphere must be fully alive without it.

**Scroll** — deep parallax with glass cards entering at different speeds and tilting in 3D. Driven by scroll position, not hover. Sticky panel for the demo section.

**Particles** — a glowing particle/matrix field behind the hero. Prefer a **2D canvas or CSS layer over WebGL** for this: it looks identical and costs a fraction of the battery.

### Performance contract (non-negotiable)
These are the numbers this gets built and rejected against, on a mid-range Android on 4G — not on a desktop and not on an iPhone 15:

- **LCP ≤ 2.5s**, CLS < 0.1, INP < 200ms.
- **Initial JS ≤ 250KB gzipped.** The 3D chunk lazy-loads **after first paint** and stays ≤ 180KB gzipped — it must never be in the critical path.
- **Reserve the 3D canvas space with fixed dimensions** so nothing shifts when it loads.
- **Pause all WebGL and particle rendering when the canvas is offscreen or the tab is hidden.**
- Cap device pixel ratio at **1.5** on mobile. No expensive post-processing (no bloom pass on mobile — fake the glow with emissive materials and additive sprites).
- Target 60fps on a Pixel 5 / iPhone 12; accept a graceful drop to 30fps on low-end, with effects automatically reduced rather than stuttering.
- **`prefers-reduced-motion` fully honoured** — static layouts, no parallax, no particles.
- Battery is a real constraint: a contractor viewing this on a site in the sun with 30% battery must still get a fast page.

---

## 4. The interactive demo

A **simulated** product tour. No API calls, no network requests, no real product state.

Sequence, looping, on scroll into view:
1. A polished chat widget UI mockup sits on screen.
2. A typing indicator appears; the visitor watches the "customer" type: **"I need an AC repair."**
3. The AI replies — qualified, specific, believable.
4. A calendar notification card slides in showing an appointment **Booked** with a time slot.

Rules: pause when offscreen, restart cleanly, honour reduced-motion (show the end state instead of animating), and never block the scroll. The copy in the demo must be plausible enough that a contractor recognises their own business in it.

---

## 5. What "premium" means here — do and don't

**Do:** generous spacing and a strict type scale; one accent per section; real depth through layered glass and soft shadow; confident short copy; visible craft in small states (loading, error, empty); speed.

**Don't:** gradient text headlines; five accents competing in one viewport; animations that delay content; glow on everything; emoji as icons; stock-photo people; a wall of features before the visitor has seen the product work.

**The trust test:** the effects carry the *feeling*; the layout, contrast and speed carry the *trust*. If a section would look broken with the animation switched off, it is designed wrong.

---

## 6. Where this gets built

Built **inside the Next.js app** (`dreezin83-bit/ai-business-os`), not as a separate static site — so the landing, the demo and the real product share one component library, one design-token file and one deploy. Marketing pages live in the app's public route group.

Design tokens are defined **once** in a single file and consumed by both the landing page and the dashboard, so the app cannot drift from the marketing site.

---

## 7. Definition of done

- Mobile comps (390×844) approved by the owner **before** any build work starts.
- Every page screenshotted at 390, 768 and 1440 and reviewed against a reference.
- Performance contract in section 3 measured on the deployed build, not locally.
- Zero dead interactions on touch: every tappable element responds, every scroll effect degrades cleanly.
- The owner's test: *"does this make me stop scrolling?"*
