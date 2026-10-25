# Sagenify AI — 2026-10-23 Build Batch: UX Specification

Scope: standalone app pages (Business Co-Pilot, AI Brain, Chatbot Widget, AI Voice Call), the two dashboard AI-usage bars, and the Knowledge Base trade-presets flow (9 presets × 10 knowledge areas) with verbatim banner/disclaimer copy. Companion file: `docs/TRADE-PRESETS-2026-10-23.md` (all preset content).

This spec follows inspection of the current `main` app (`src/components/dashboard/views/`, `(app)` dashboard routes, `useDashboardStats`, PageTabs, dash-card tokens). **Reuse those surfaces and primitives; do not duplicate Dashboard/Overview, billing destinations, or automation destinations.** Preserve the current commercial offer and Flutterwave billing — **this batch must not change pricing copy, checkout, or subscription semantics** (pricing v3 is a separately-managed, merge-gated stream). All copy below that is marked **VERBATIM** must be used exactly as written; anything unmarked is a design description.

## 1. Design principles (applies to all sections)

- **Tenant-scoped truth.** Every number shown is served from a per-tenant source (usage ledger, subscription state, ai-calls). Defensive fallbacks may show "—" or a retry state; they must **never fabricate numbers**.
- **Non-blocking data.** Keep the instant-load behavior of the rebuilt dashboard: page chrome renders immediately, data regions render skeletons, each independent card fetches on its own and degrades alone (per-card error/retry + `ErrorBoundary` on heavy cards).
- **Reuse primitives.** Card / Button / Input / Textarea / Slider / Badge / PageTabs / toast / ErrorBoundary / dash-card & dash-heading tokens. No new design system.
- **Consistent states everywhere:** loading skeleton → content | empty state (with a next step) | error (retry) | partial (explicit).
- **Gating.** Access and downstream voice provisioning are gated on verified paid subscription state; free trial = chat allowance only, voice locked. Never gate on anything the backend cannot verify.
- **Route-placement constraint.** All new dashboard pages must live under the team's protected dashboard route group convention (the `(auth)` guard segment covering dashboard pages; coordinate with architect — current `main` uses the `(app)` group, the auth-guard layout is the source of truth for where new pages file).
- **Preserve pricing.** Anywhere this spec points at billing, target the existing settings billing surface (SubscribeModal / `/dashboard/settings`), never a new pricing structure.

## 2. Information architecture & navigation changes

| Today (main) | After this batch |
|---|---|
| Sidebar "AI Commander" → `/dashboard/ai-commander` | Sidebar "Co-Pilot" → `/dashboard/copilot` |
| Quick Actions "AI Commander" tile | "Co-Pilot" tile → `/dashboard/copilot` |
| `/dashboard/ai-commander` tab-inside AI Brain page shell (`(app)/dashboard/ai-brain/page.tsx` tab shell) | Split into standalone pages; tab shell retired (see below) |
| `/dashboard/ai-brain` tab shell | Standalone AI Brain page at `/dashboard/ai-brain` |
| `/dashboard/knowledge-base` | Standalone Knowledge Base page (presets flow) — stays at `/dashboard/knowledge-base` |
| `/dashboard/chatbot` | Standalone Chatbot Widget page — stays |
| — (no voice UI) | New **AI Voice Call** section at `/dashboard/voice` |

**Redirects (307) to keep old links alive:** `/dashboard/ai-commander` and `/dashboard/ai-command` → `/dashboard/copilot`. The old combined tab shell at `/dashboard/ai-brain` is replaced by the standalone AI Brain page; keep `/dashboard/knowledge-base` and `/dashboard/chatbot` routes as-is. No other nav groups are introduced; keep sidebar grouping as it is on main.

## 3. Sagenify Business Co-Pilot — standalone workspace (`/dashboard/copilot`)

**Purpose.** The operator-facing conversational assistant: ChatGPT-like workspace chat that has full context of *this tenant's* workspace (leads, appointments, messages, missed calls, automation, knowledge). Success = quick, grounded answers + safe one-click follow-through actions. It is **not** the customer-facing chatbot and **not** the AI Brain configurator — one line of clarifying copy on the page sets that expectation.

**Layout (desktop ≥1024px):** three-column café layout:
- **Left rail (conversation list, ~w-64):** "New chat" button (top), then past sessions (title = first user message, truncated; relative timestamp). Click loads thread; hover reveals Rename / Delete (Delete = confirm dialog). Empty state: "No past chats yet."
- **Center (main thread):** retains the current `ai-commander-view` chat feel (user right, assistant left, amber sparkle avatar, typing dots). Add: **streaming responses when the command API supports it** (flag to architect; until then keep the existing loading dots — the UI must not fake partial text it can't produce), **Copy** and **Regenerate** actions on assistant bubbles, **Stop generating** button while streaming.
- **Right rail (context, ~w-72, `hidden xl:block`):** "Workspace context" card — what the Co-Pilot can see (Leads · Appointments · Messages · Missed calls · Automation), each row linking to its page; a **Usage** mini-card reusing the chat usage bar (see §7) with a "View usage" link; **Suggested actions** card (only as the model proposes them, see below).

**Empty state (first visit / new chat):** greeting message (current copy retained, rename "AI business assistant" → "your Sagenify Business Co-Pilot"), then the suggestion grid (keep the six existing suggestions: leads this month, conversion rate, today's appointments, who to call first, draft follow-up email, missed-calls summary). Chips are labeled + prompt-based exactly as today.

**Messages & grounding:** assistant messages that reference records render a subtle **source chip line** under the answer ("3 leads · 2 appointments viewed"), each chip linking to the filtered page (leads list, appointments list). Only render chips the API actually returns; never invent record links.

**Actions (follow-through, explicit-consent):** when the model proposes a *run* (create lead, book appointment, send email), render an inline action card after the answer with the exact proposed fields shown and a single **Confirm** button (calls the existing write APIs: `/api/leads`, `/api/appointments`, `/api/ai/command/send-email` — coordinate exact endpoints with architect). **Never execute writes implicitly.** After confirm → toast success + link to the created record; on failure → toast error + inline retry. Mark clearly "AI-suggested, not yet applied" until confirmed.

**Input bar:** retains current textarea; Enter=send, Shift+Enter=newline; send button disabled while empty/sending; small footer line: "Co-Pilot knows your leads, appointments, and business data" (replaces "AI Commander knows…").

**Mobile (<768px):** conversation list collapses to a drawer opened from a hamburger in the page header; right rail hidden (context summary available as a collapsible sheet from header). Thread + input stay full-width; input bar is sticky above the keyboard.

**States:** loading thread, send error (current inline assistant error bubble retained), empty conversation list, no subscription (Co-Pilot is chat — still works on the paid plan and on the trial allowance; if credits are exhausted the existing chat-blocked behavior applies, see §7), API error on a write action, delete-confirm.

**Copy — clarifying line (VERBATIM, page subtitle):**
> Ask questions about your business — Co-Pilot has full context of your leads, appointments, messages, and automation. Customer-facing chat is configured in AI Brain and Knowledge Base.

## 4. AI Brain — standalone page with behavior sliders/toggles (`/dashboard/ai-brain`)

**Purpose.** The complete configuration center for the *customer-facing* AI (chatbot + voice share the same persona/rules where it makes sense). Standalone page: header "AI Brain" + subtitle "Complete AI configuration center" (verbatim from current view), **Save Configuration** button top-right, tabs retained: **Business Profile · Knowledge Base · Behavior · Channels** (the 4 existing tabs; `ai-brain-view.tsx` is the base and must simply become the page — split it out of the tab shell without rework).

**Behavior tab — personality sliders (keep + polish):** the three existing sliders **Formality (Casual ↔ Formal), Warmth (Neutral ↔ Empathetic), Conciseness (Detailed ↔ Brief)** stay, with the existing value % readout and end-anchor labels. Add:
- A fourth slider **Proactivity** (left "Reactive — answers questions only", right "Proactive — offers next steps like booking or follow-up"). *Implementation note:* slider states compile into the `responseStyle`/`systemPrompt` payload at save (no new DB columns required); flag to architect if they prefer persisted columns — UI contract above is stable either way.
- **Live tone preview** under the sliders: a sentence synthesized client-side from current values, e.g. Formality 40 / Warmth 80 / Conciseness 30 → "Friendly and casual, warm and reassuring, with detailed answers." Preview is cosmetic only and clearly labeled "Preview".
- **Reset to defaults** link (resets sliders to 60/70/60/40 starting positions shown to the user before save).

**Behavior tab — toggles (new):** a "Capabilities" card with the following **behavior toggles**, each mapping to a drafted instruction appended to the saved persona text (exact mapping table for the architect at the end of this section):
1. **Collect lead details** (name, phone, service needed; confirmation before proceeding) — on by default.
2. **Offer appointment booking** — on by default.
3. **Hand off to a human when unsure** — on by default.
4. **Give price estimates** (uses Pricing Guidance; "for exact pricing, a technician will confirm") — on by default.
5. **Keep answers short** (≤3 sentences unless asked) — off.
6. **Use emojis** — off.

Each toggle shows helper microcopy ("What this does") and a per-toggle saved/unsaved state. Changing a toggle or slider marks the page **unsaved** (Save Configuration becomes the sticky save/discard action; same Save button as today).

**Test Your AI** card stays on all tabs exactly where it is today (it is the single best feedback loop); keep the "New Chat" / message-count affordances.

**Other tabs:** Business Profile, Knowledge Base (industry template selector is replaced by the Knowledge Base presets flow in §6 — the AI Brain Knowledge tab keeps FAQs, Policies, Documents link, and the preset grid is driven by the same 9-preset catalog; see §6), and Channels — all stay as-designed on main; only copy references to "AI Commander" get renamed (e.g., any "Command your AI" strings become Co-Pilot-neutral).

**Mapping table (toggles → prompt text appended to persona at save):**
| Toggle | Drafted rule text |
|---|---|
| Collect lead details | "Collect the customer's name, phone, and the service they need. Always confirm contact details back before ending the chat." |
| Offer appointment booking | "When a customer shows intent to book, offer a specific appointment time from the configured business hours." |
| Hand off when unsure | "If you are not confident about an answer, or the customer asks for someone specific, offer a human handoff rather than guessing." |
| Give price estimates | "Give general price ranges from the configured pricing guidance and always add: 'A technician will confirm the exact price.'" |
| Keep answers short | "Keep answers to three sentences or fewer unless the customer asks for detail." |
| Use emojis | "Use emojis naturally and rarely, one at a time, only when they fit the tone." |

## 5. Chatbot Widget page (`/dashboard/chatbot`)

**Purpose.** One page to configure and install the customer-facing website widget. Keep the existing structure (Enable toggle, Business ID card, Simple + Async embed codes, 4-step Setup Instructions, Live Preview) and **add Appearance + conversation configuration**. Reuse `chatbot-view.tsx` as the base; do not rebuild the preview.

**New — Appearance card (above embed codes):**
- **Accent color:** 5 preset swatches (the brand palette currently used by the preview: e.g. indigo, blue, emerald, amber, rose) + **custom hex** input with a color swatch preview. Selection updates the Live Preview instantly. Persist with the widget config (API: extend settings payload; coordinate with architect).
- **Widget name** (default "AI Assistant"): free text ≤24 chars, shown in the preview header and embed render.
- **Greeting message:** textarea prefilled from the AI Brain greeting config (via `/api/ai/brain` — same source of truth; editing here saves that same field). Placeholder: current default greeting.

**New — Quick replies card:**
- Editable suggested-question chips (the four current defaults: "Book Appointment", "What are your hours?", "Do you offer emergency service?", "How much does it cost?"). Add/remove/reorder chips; cap 6. Preview updates live.

**Embed code integrity (security requirement from the plan):**
- All **newly generated** embed scripts embed a **tenant-specific signed token** (server-issued; the `/api/public/chatbot/widget` script and the async `init` payload carry it). The server always validates the token, resolves and authorizes the tenant, verifies billing state, checks credits, then calls the AI provider.
- Add a **"Regenerate embed code"** control next to the embed cards: one-click, confirmation dialog ("This issues a new signed token for your embed. Any widget code you've already pasted on external sites will need to be updated."), then the displayed snippets swap to the new signed versions. Existing embeds keep working through a server-side transition period per the plan; regeneration is how a tenant moves to the signed version.
- Copy-to-clipboard behavior and toast messages stay as today.

**Live Preview:** already supports enable/disable, message simulation, and a real request to `/api/public/chatbot`. It must now render **accent color, widget name, greeting, and quick replies** from the config above in real time (including while editing hex). Keep the mock-website backdrop.

**Mobile:** keep the current single-column stack (preview below settings), ensure the preview card is not sticky below 1024px (currently `sticky top-6` — make it non-sticky on small screens).

## 6. Knowledge Base presets — 9 trade presets × 10 areas, banner, disclaimer

**Purpose.** First-run and re-configuration speed without a safety trade-off: the tenant picks the closest trade, gets an **editable** AI-written template across **10 core knowledge areas**, reviews it, and applies it. This replaces the current generic add-content duplication on this page.

**Preset catalog (exactly these 9 — do not add dental/law/real-estate/general-contractor to this picker):**

| # | Label | Category key |
|---|---|---|
| 1 | Plumbing | `plumbing` |
| 2 | HVAC | `hvac` |
| 3 | Electrical | `electrical` |
| 4 | Roofing | `roofing` |
| 5 | Cleaning | `cleaning` |
| 6 | Landscaping | `landscaping` |
| 7 | Pest Control | `pest-control` |
| 8 | Med Spas | `med-spas` |
| 9 | Auto Repair | `auto-repair` |

All preset content is in `docs/TRADE-PRESETS-2026-10-23.md` (structed to map 1:1 onto `aiBrainConfig` fields; the existing `lib/ai-templates/*` shape is the porting target — the 9 presets **replace** the current mixed catalog for this UI, and `med-spas` + `auto-repair` are new files).

**Page structure (top → bottom):**
1. **Red alert banner — VERBATIM** (destructive styling, not dismissible by the standard localStorage pattern; it is intentionally persistent while on the page):
   > **Select the closest preset for your business type — then review and edit every answer before going live.** Preset content is AI-generated starting material, not legal, financial, medical, or professional advice. Check every service, price, policy, guarantee, and claim against your real business before you publish or go live. Sagenify AI is not responsible for template content or for replies your AI gives using it.
2. **Preset selection grid:** 9 cards (2/3/4/6-col responsive like the current template grid): icon chip (first letters), label, one-line card copy ("Best fit: residential & commercial plumbing…"), and **Use preset** affordance per card. Selected card shows the highlight ring; applying shows a spinner on that card.
3. **Apply confirmation dialog** (modal) containing:
   - What will happen, neutrally: the 10 knowledge areas listed with a per-area checkbox (all checked by default). Unchecking an area = "keep my current content there".
   - **Liability disclaimer — VERBATIM** (small text block inside the dialog):
     > Preset content is AI-generated starting material, not professional or legal advice. It is your responsibility to review and confirm every service, price, policy, guarantee, coverage area, and claim before going live, and you are responsible for how your AI responds using it. Sagenify AI is not liable for any loss arising from use of preset content or from your AI's responses.
   - **Confirm: "Apply preset"** / **Cancel**. Apply never deletes leads, appointments, documents, or custom knowledge — it writes only the checked areas of the AI Brain config (and inserts preset FAQ entries exactly as the current template apply does). If any existing area content differs from defaults, the row shows "Will replace your current content" so there is no silent overwrite.
4. **Post-apply: editable preset content panel** — an expandable list of the **10 areas**, each a card with the area title, a sourced-from chip ("From Plumbing preset"), and an **editable textarea/fields** with per-card Save (persists to the same `/api/ai/brain` PUT used today; invalidates context cache through the existing flow). A summary banner: "Preset applied — 9 of 10 areas filled. Review and save each area, then test your AI." Areas left unchecked by the user appear as "Kept your current content".
5. **Documents section (existing list) stays**, and the **duplicate generic add-content forms are removed**: delete the standalone **"Paste Content"** form (the generic free-text adder) from this page. Keep **Website URL** and **Upload File** as the two supplemental import paths (they are distinct, single-purpose, and not duplicated elsewhere). The empty state copy updates accordingly ("Add a URL or upload a file, or start from a preset above").

**The 10 core knowledge areas (canonical order and field mapping for the whole batch):**

| # | Area (UI label) | Writes to |
|---|---|---|
| 1 | AI Persona | `systemPrompt` (+ compiled `responseStyle`) |
| 2 | Services & Offerings | `services` (JSON array) |
| 3 | FAQs | `knowledgeDocument` rows, `type:"faq"` |
| 4 | Pricing Guidance | `pricingGuidance` |
| 5 | Company Policies & Guarantees | `companyPolicies` |
| 6 | Business Hours (defaults) | `businessHours` (7-day open/close/closed array shape the AI Brain page already parses) |
| 7 | Greeting Message | `greetingMessage` |
| 8 | Lead Collection Rules | `leadCollectionRules` |
| 9 | Appointment Booking Rules | `appointmentBookingRules` |
| 10 | Escalation & Safety Rules | `escalationRules` |

*Implementation flags for architect:* (a) fix the existing apply route so `businessHours` is stringified from the 7-day array shape, not the template's string-object shape — the AI Brain editor currently `JSON.parse`s day objects; (b) `companyPolicies` in the current apply route is mistakenly fed from `template.pricingGuidance` — map the right field.

**Data source note:** the AI Brain Knowledge tab's template grid currently renders from `/api/ai-templates` which returns an empty `templates: []`; unify it with this 9-preset catalog (one server source of truth for the preset list; see architect's batch).

## 7. AI Voice Call section (`/dashboard/voice`)

**Purpose.** Single consolidated page for the AI phone receptionist: voice selection, phone-number provisioning, conversation configuration, and setup instructions. Backend (Vapi via `/api/voice/*`) is architect-owned; this spec fixes the UI contract.

**Gating — lock overlay (the gate that matters):**
- **Locked state (no verified paid subscription — free trial, lapsed, or never-subscribed):** the whole page body is covered by a lock overlay card: lock icon, heading **"Upgrade to Unlock Voice"** (VERBATIM label), supporting copy ("Answer calls, book appointments, and capture leads with your AI receptionist. Voice calling is included with a paid plan."), and a single primary CTA **Upgrade to Unlock Voice** → the existing billing surface (`SubscribeModal`/`/dashboard/settings`). Trial users additionally see: "You're on the free trial — AI chat is included. Upgrade to unlock voice calling."
- **No flash:** before subscription state resolves, render the overlay (never render the unlocked UI briefly — existing plan requirement).
- **Locked while paid but provisioning incomplete:** number not yet provisioned is *not* a lock; it's an empty state with the Get-number CTA.

**Unlocked layout:** two columns (config left ~3/5, status right ~2/5), stacking on mobile.

**Left column:**
1. **Choose a voice** — 5+ voice cards (actual catalog from DevOps/Vapi research; fields below are the contract): voice name, gender/locale, 2–3 style tags (e.g. "Warm", "Professional", "Fast"), and a **Play Sample** button. Play Sample plays a short pre-baked audition clip ("Hi, thanks for calling — how can we help you today?") — audio is pre-generated OpenAI TTS MP3s served as static assets (no Vapi sample API; per plan research). Selected voice shows a check ring; selection persists per workspace (isolated via the master-key controller). While the voice list loads: skeleton cards (5). If the catalog fails: error + retry card, non-blocking (voice remains unselected).
2. **Get a phone number** — the **Get Phone Number** card:
   - Empty state: explanation ("A dedicated number your AI answers. First number is included with your plan."), **Get Phone Number** primary button. Optional advanced: area-code/city preference (help text, not required).
   - Provisioning state: progress ("Reserving your number…") + cancel.
   - Success state: the assigned number (large, copy-to-clipboard), status chip **Active**, and a "Number ready — forward your calls" pointer to the instructions card. Error states: "No numbers available in your area right now — try another area code" (offer retry with different preference), "Provisioning failed — try again" (retry), and rate-limit ("Please wait a moment before trying again").
   - Replace/Release: once provisioned, a subtle **Release number** action with confirmation ("Your AI will stop answering this number — are you sure?") and a re-provision flow after release.
3. **How your AI answers — three config blocks** (each a card with its own Save + saved/unsaved state; saves hit the voice-config endpoint the architect exposes):
   - **Voice greeting:** what the AI says when it answers a call. Textarea, prefilled from the AI Brain greeting if voice-specific not yet set; placeholder: "Hi, thanks for calling {Business Name}! How can we help you today?"
   - **Objection handling:** list of common objections (e.g., "Too expensive", "Just looking for a quote", "I'll call back later") with per-objection AI handling lines (editable); add/remove rows.
   - **Custom rules:** if/then rules the caller can maintain ("If customer asks about {X}, say {Y}" / "If customer mentions emergency, transfer to {number}"). Simple add/remove list of `when → do` strings, no code.
   - *Note:* an active call is **never** dropped mid-conversation when credits exhaust — it finishes gracefully; new expensive AI work stops (plan decision). Copy this once, softly, under the greeting card ("Your AI always finishes a call in progress, even if credits run out mid-conversation.") — do not repeat it across the page.
4. **Setup instructions card** (3 steps, numbered, matching the current chatbot instructions pattern): **1** Get your number (above), **2** Forward your business line to your AI number (call-forwarding guidance for a typical provider: transfer settings / unconditional forwarding), **3** Test the flow — call your AI number and ask a booking-style question. Optional 4th row: "Review calls in Missed Calls / messages" linking to the existing surfaces.

**Right column (status & activity):**
- **Status card:** number (or "No number yet"), Active/Provisioning/Inactive chip, and a compact **AI Voice Calling Usage** bar (same component/colors as §8 — voice usage from the ledger, `|eventType = voice.call.minutes|` split).
- **Recent calls list** (from `/api/ai-calls`, max 5–8 rows): caller label, outcome chip (`lead_created | appointment_booked | no_action | unknown` — match API), time/date. Empty state: "No AI calls yet — forward your number and make a test call." Error: retry; loading: 5-row skeleton.
- **Link row:** "View all calls" → the calls landing surface the team already has (Missed Calls experience) — do not create a new destination.

**Lock expiry behaviours (paid lapses mid-cycle):** overlay returns; the provisioned number is retained in the tenant record (provisioning is not released by a lapse — surface copy: "Your number is saved. Renew your plan to reactivate it.").

**Mobile:** config blocks stack; status card moves above instructions; Play Sample and Get Number remain full-width tappable.

## 8. Dashboard AI-usage bars (AI Chat Usage, AI Voice Calling Usage)

**Placement:** a new **"AI usage" section on the dashboard home** (`/dashboard`) between the metric tiles and the activity feed — **two bars side-by-side on ≥lg, stacked below 640px**. (Do not bolt onto Overview; if desired later, mirror via the same component.)

**Data contract** (architect owns the endpoint; UI must only consume): per-tenant current billing-period usage from the `usage_event` ledger, split chat vs voice (`eventType = voice.call.minutes` vs everything else). Minimum fields: `{ chatUsed, chatLimit, voiceUsed, voiceLimit, periodStart, periodEnd, remaining, poolLimit }` with `limit` values set by subscription state (trial: chat limit = **50 messages** allowance — the free-trial chat allowance; paid: **4,000 credits/mo** = $20/mo of AI provider cost at $0.005/credit — the owner-ratified allowance). Defensive fallback: if the fetch fails, each bar shows its chrome with "—" and a retry; **never fabricate numbers** (plan requirement). The exact messages/minutes equivalent of the paid allowance is intentionally not promised to customers yet.

**Each bar card:**
- Icon + label: **AI Chat Usage** (MessageSquare), **AI Voice Calling Usage** (Phone).
- Readout: `used / limit` formatted (e.g. "2,840 / 4,000 credits"; trial shows "38 / 50 messages"). A tooltip (ⓘ) defines the unit truthfully: "Credits reflect your AI usage; 4,000 credits are included with your plan each month."
- Progress track with **threshold colors on pool utilization** (single shared pool — the two bars visualize each channel's share of the same pool, and the *fill color* follows the *pool-wide* utilization so both bars turn red together):
  - **0–70% → green;** **71–89% → yellow/amber;** **90–100% → red + lock icon** on the bar.
  - **Warn at 15% remaining** (≥85% used): a thin inline note appears in the card ("You've used 15% or less of your credits.") — this is a note, not the red state.
  - **0 remaining (100%):** red, lock icon, and the grace copy: **"Your AI finished any calls in progress. New AI conversations are paused until your next billing period or a credit top-up."** (short 24-hour grace for active workflows exists per plan; the public copy above is the truthful description).
- **Footer CTA line** per state:
  - Subscribed, green/yellow: "View usage" → settings billing surface (`/dashboard/settings`, billing/usage section) or the architect's planned usage destination if one exists in this batch — do not create a new page.
  - Red / 0 remaining: lock icon + **"Buy more credits"** → **top-up checkout** when top-ups ship (architect's batch); **until top-ups ship, route to `/dashboard/settings`** (the plan's explicit interim link). The CTA never implies a purchase method that doesn't exist yet.
  - Trial state (chat bar): "Free trial — messages included. Upgrade for 4,000 credits/month." (no fake urgency); **voice bar in trial shows the lock state: "Upgrade to Unlock Voice" → billing** (§7 behavior, same label).
- **Resets:** sub-line "Resets in 12 days" (or "Resets <date>") computed from `periodEnd`; tooltip explains the billing cycle.

**Behavior/performance:** bars fetch independently of the stats hook (separate small call), render skeletons only inside their own region, fail → inline retry per card; wrapped in `ErrorBoundary`; never block the instant-load dashboard. **Only on subscription-aware data** — no optimistic/pre-computed values.

**States matrix:**

| State | Bar fill | Note | CTA |
|---|---|---|---|
| 0–70% used | green | normal | View usage |
| 71–89% used | yellow | normal + "15% or less remaining" note ≥85% | View usage |
| 90–99% used | red + lock | "You're almost out of credits." | Buy more credits → top-up (interim: settings) |
| 100% (0 remaining) | red + lock | grace copy above | Buy more credits → top-up (interim: settings) |
| Trial (chat) | color by pool % of 50 messages | "Free trial" framing | Upgrade (subscription) |
| Trial (voice) | locked | voice locked | Upgrade to Unlock Voice → billing |

## 9. Cross-cutting acceptance checklist (share with QA)

1. Signed-out access to any `/dashboard/*` route (incl. new `/dashboard/copilot`, `/dashboard/voice`) redirects to `/sign-in` (auth-guard segment), no 5xx.
2. Old URLs 307: `/dashboard/ai-commander`, `/dashboard/ai-command` → `/dashboard/copilot`.
3. No page in this batch shows payment/pricing copy other than the existing surfaces and the two VERBATIM labels ("Upgrade to Unlock Voice" / "Buy more credits"); Flutterwave semantics untouched.
4. Usage bars: ledger-sourced, thresholds green/yellow/red at 70/89/90, lock ≥90, no fabricated values; trial/paid/grace/lapsed each render the right state.
5. Voice: no flash of unlocked UI before sub-state resolves; overlay on trial/lapsed; provisioning error/empty states present; Play Sample uses static pre-baked clips; active-call grace copy present exactly once.
6. Chatbot: embed regeneration issues a signed token; copy works; preview reflects accent/greeting/name/chips live; old embeds still function through the transition.
7. Knowledge Base: banner + disclaimer render **verbatim**; applying a preset writes only checked areas; leads/appointments/documents never deleted; post-apply panel editable and saved via `/api/ai/brain`; generic Paste Content form removed.
8. Co-Pilot: works on paid and trial; write-actions require explicit Confirm; source chips only when API returns them.
9. AI Brain: sliders + toggles compile to persona text at save; unsaved indicator; Reset to defaults; Test Your AI intact.
10. Mobile: all new pages usable at 375px (drawers/full-screen sheets, non-sticky preview, stacked bars).

## 10. Open items for the team (not UX-blocking)

- Architect: usage endpoint fields + top-up checkout wiring + apply-route field/businessHours fixes (noted in §6); command API streaming support (optional for Co-Pilot §3).
- DevOps: Vapi voice catalog (names/tags/gender) + static sample MP3 assets; number-provisioning availability per area code.
- QA: full matrix passes after backend wave lands (task staged per plan).