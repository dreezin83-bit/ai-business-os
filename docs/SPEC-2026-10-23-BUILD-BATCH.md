# Sagenify AI — Build Batch 2026-10-23: UX Specification (single doc)

Scope: **Sagenify Business Co-Pilot** standalone workspace, **AI Brain** standalone page, **Chatbot Widget** page, **AI Voice Call** section, the **two dashboard AI-usage bars** (bottom of dashboard), and the **Knowledge Base 9-trade-presets flow** (10 editable sections per preset, verbatim banner/disclaimer). Companion content: `TRADE-PRESETS-CONTENT.md` / `TRADE-PRESETS-CONTENT.json` (same directory).

Grounded in current `main` (views in `src/components/dashboard/views/`, `(app)` dashboard routes, `useDashboardStats` instant-load dashboard, PageTabs, dash-card tokens). **Reuse existing surfaces and primitives** — do not duplicate Dashboard/Overview, billing destinations, or automation destinations. **Pricing/billing copy and Flutterwave semantics are untouched by this batch.** Copy marked **VERBATIM** ships exactly as written.

## 0. Verbatim copy register (owner-provided — mandatory)

| ID | Context | Exact string |
|---|---|---|
| KB-1 | Knowledge Base red alert banner | **If you don't see your specific trade or business, select the closest preset to fill automatically and edit below.** |
| KB-2 | Knowledge Base liability disclaimer | **Sagenify AI is not responsible for business configuration errors, incorrect custom pricing, unverified estimates, or call handling miscommunications set by workspace owners.** |
| VO-1 | Voice lock overlay (unpaid) — heading | **Unlock 24/7 AI Phone Receptionist with a Paid Plan** |
| VO-2 | Voice lock overlay — action CTA | **Upgrade to Unlock Voice** (→ billing surface) |
| LAND-1 | Landing early-bird banner — ⚠️ owned by the **pricing-v3 landing stream** (frontend-ui), NOT an app-page string; listed here so no one invents an alternative: | **Early Bird Discount for the first 10,000 users — Ending Soon! Lock in $199/mo for life (No future price increases).** |

## 1. Cross-cutting principles

1. **Tenant-scoped truth.** Every number is server-sourced (usage ledger, subscription state, ai-calls). Fallbacks show "—" or retry; **never fabricate numbers**.
2. **Non-blocking.** Page chrome renders instantly; data regions skeleton; each card fetches and fails alone (`ErrorBoundary` on heavy cards).
3. **Reuse primitives** (Card/Button/Input/Textarea/Slider/Badge/tabs/toast) and dash tokens. No new design system.
4. **Consistent states** everywhere: loading → content | empty (with next step) | error (retry) | partial (explicit).
5. **Gating on verified state.** Voice is gated on verified paid subscription; trial = chat allowance only. Never gate on unverifiable client state.
6. **Route placement.** All new dashboard pages must live under the protected dashboard route group (coordinated with architect; current group is `(app)`).

## 2. Navigation & IA changes

- Sidebar + Quick Actions: **"AI Commander" → "Co-Pilot"** (`/dashboard/copilot`, Terminal→Sparkles-family icon; keep current sidebar item position).
- **307 redirects:** `/dashboard/ai-commander` and `/dashboard/ai-command` → `/dashboard/copilot`.
- **Split the current AI Brain tab shell** (`(app)/dashboard/ai-brain/page.tsx`) into standalone pages: Co-Pilot stays at `/dashboard/copilot`; **AI Brain** standalone at `/dashboard/ai-brain`; **Knowledge Base** standalone at `/dashboard/knowledge-base`; Chatbot already standalone at `/dashboard/chatbot`. Retire the combined tab shell; keep old URLs green via 307 only where a distinct destination exists (ai-commander/ai-command → copilot). No new nav groups.

## 3. Sagenify Business Co-Pilot — standalone workspace (`/dashboard/copilot`)

**Purpose.** ChatGPT-like operator assistant **pre-loaded with this workspace's context** — business name, leads, appointments, missed calls — so the operator can ask revenue questions ("how many leads this month?", "what's my conversion?"), draft follow-ups, and generate estimates. Safe by design: grounded answers + explicit-confirm write actions.

**Pre-loaded workspace context (a.k.a. context chips — the "what it knows" affordance).** A chip row under the page title, always visible, each chip = a context source the Co-Pilot can see. Chip states: available (filled dot, links to source page) vs unavailable (muted, no data yet — still clickable to setup). Chips: **Business Name** (from onboarding/workspace profile) · **Leads** · **Appointments** · **Missed Calls** · **Messages** · **Automation**. The Business Name chip reflects the live workspace name; if unset it reads "Business Name — add in Settings".

**Layout (desktop ≥1024px):** left conversation rail (~w-64) · center thread · right context rail (~w-72, details of a selected chip's source: e.g. recent leads table fragment; `hidden xl:block`). Below 768px: left rail → drawer, right rail → header sheet.

**Empty state (first visit / new chat):** centered greeting — "👋 Hey! I'm your Sagenify Business Co-Pilot. I know your business — ask about leads, appointments, revenue, or ask me to draft follow-ups and estimates." — then the suggestion grid (six chips, kept from today's `ai-commander-view`): "How many leads this month?", "What's my conversion rate?", "Today's appointments", "Who should I call first?", "Draft a follow-up email", "Missed calls summary". Each chip carries a label + prompt template exactly as today.

**Message actions (hover on assistant bubbles):** **Copy** / **Regenerate** / (when model offers reasoning sources) **View sources**. Source chips under an answer link to filtered pages (leads list, appointments) only when the API returns them — never invented.

**Follow-through actions (estimates, follow-ups, leads, bookings) — explicit consent.** When the model proposes a *run* (draft email, estimate summary, create lead, book appointment), render an inline action card after the answer showing the **exact proposed contents** (draft text, estimate line items, lead fields, appointment slot) plus **Confirm** / **Edit** / **Dismiss**. Confirm calls the existing write APIs (`/api/leads`, `/api/appointments`, `/api/ai/command/send-email` — final endpoints per architect). **Never execute writes implicitly.** Success → toast + link to created record; failure → toast + inline retry. Card header marks: "AI-suggested — not yet applied".

**Thread behavior:** Enter=send, Shift+Enter=newline; Stop button while generating; streaming token-by-token only when the command API streams (flag to architect; otherwise keep the existing typing dots — never fake partial text). Workspace-context line under input: "Co-Pilot knows your leads, appointments, and business data" (renamed from "AI Commander knows…").

**States:** loading thread · send error (inline assistant bubble, kept) · empty conversation list · delete-confirm for sessions · API error on write actions · credits-exhausted chat behavior (shared with usage bars §7; the Co-Pilot shows the same "new conversations paused" treatment). Co-Pilot works on trial chat allowance and paid — no separate gate.

## 4. AI Brain — standalone page (`/dashboard/ai-brain`)

**Purpose.** Complete configuration center for customer-facing AI (chatbot + voice persona). Header "AI Brain" + subtitle "Complete AI configuration center"; **Save Configuration** top-right; tabs: **Business Profile · Knowledge Base · Behavior · Channels**. The existing `ai-brain-view.tsx` becomes the page directly (no rework), with the Behavior tab extended:

**Behavior sliders (Formality · Warmth · Conciseness · Empathy).** Keep the existing three (Formality Casual↔Formal, Warmth Neutral↔Empathetic, Conciseness Detailed↔Brief) with value% readout and end anchors. **Add the 4th slider: Empathy** (left "Matter-of-fact", right "Deeply understanding") per the owner-directed spec. Add **Proactivity** as an optional 5th (left "Reactive — answers only", right "Proactive — offers next steps") — include if the team wants it; it is not required. Under the sliders: a **live tone preview** sentence synthesized client-side (e.g. "Friendly and casual, warm, concise, and understanding.") labeled "Preview (cosmetic)" and a **Reset to defaults** link.

**Behavior toggles — Fallback behaviors (new card "Fallbacks").** What the AI does when it cannot answer or is out of its configured knowledge:
1. **Graceful fallback copy** (on): "I don't have that information yet — I'll have [Business Name] follow up with you." (off → generic "I can't answer that" phrasing).
2. **Suggest alternatives** (on): offer hours, a phone call, or a handoff when the question is off-topic.
3. **Stay in scope** (on): decline unrelated topics politely without inventing answers.
4. **Ask clarifying questions** (on): 1 follow-up question when the request is ambiguous; (off → best-effort answer).

**Behavior toggles — Human-handoff triggers (new card "Handoff to a human").** When any rule fires, offer live transfer/callback — never fake a transfer:
1. **Price above threshold** (on; threshold editable, e.g. $[2,500] — default per trade from the preset; see content package guardrails).
2. **Customer asks for a manager/owner** (on).
3. **Legal, insurance, or medical questions** (on for all trades; on by default).
4. **Customer requests it / expresses frustration** (on).
5. **Emergency keywords detected** (on; keyword list seeds from the applied trade preset's triage section).
Each toggle maps to a drafted instruction appended to the persona text at save (mapping table pattern preserved from the prior spec); saves reuse the existing `/api/ai/brain` PUT. **Test Your AI** card stays on all tabs as-is.

## 5. Chatbot Widget page (`/dashboard/chatbot`)

Reuse `chatbot-view.tsx`. Keep: Enable toggle, Business ID card, Simple + Async embed snippets, 4-step Setup Instructions, Live Preview.

**Embed code snippet block (copy button).** A single **"Embed code"** card containing both snippets (Simple / Async tabs or stacked), each with an explicit Code block + **Copy** button (clipboard + toast — behavior already exists; keep). Where the signed-token embed (server-issued, per chatbot-security rule) is in place, copy ships the signed snippet; add a **Regenerate embed code** control with a confirmation dialog ("This issues a new signed token — update any widget code already pasted on external sites."). Existing embeds keep working through the server-side transition period.

**Accent color picker.** 5 preset swatches (current brand palette) + custom hex input + swatch preview; updates the Live Preview instantly; persisted with widget config.

**Greeting message config.** Textarea prefilled from the AI Brain greeting (same source of truth via `/api/ai/brain`); edits save that same field.

**LIVE PREVIEW pane (sticky right column ≥1024px, non-sticky below).** Renders accent color, greeting, default quick-reply chips, and widget name live while editing. Keep the mock-website backdrop and send-to-`/api/public/chatbot` behavior.

## 6. AI Voice Call section (`/dashboard/voice`)

**Gating — lock overlay (unpaid state).** Until the verified paid-subscription state resolves, the page body is covered by a lock card — **no flash of the unlocked UI**. Contents: lock icon; heading **VERBATIM VO-1: "Unlock 24/7 AI Phone Receptionist with a Paid Plan"**; supporting copy ("Answer calls, book appointments, and capture leads even when you can't pick up. Voice calling is included with a paid plan."); trial variant adds: "You're on the free trial — AI chat is included. Upgrade to unlock voice calling."; primary action **VERBATIM VO-2: "Upgrade to Unlock Voice"** → existing billing surface (`/dashboard/settings` / SubscribeModal).

**Unlocked layout:** config column left (~3/5), status column right (~2/5); stacks on mobile.

1. **Choose a voice (≥5 voices, each with Play Sample).** Voice cards: name, gender/locale, 2–3 style tags, **Play Sample** button (short pre-baked audition clip — "Hi, thanks for calling — how can we help you today?"; static pre-generated audio, no live sample API). Selected voice = check ring; per-workspace persisted (Vapi isolation via architect's master-key controller). Catalog values supplied by DevOps/Vapi research. Loading: 5 skeleton cards. Error: retry card, non-blocking.
2. **One-tap "Get Phone Number".** Empty state card: "A dedicated number your AI answers. The first number is included with your plan." + primary **Get Phone Number** button (optional advanced: area-code/city preference). Provisioning state: progress + cancel. Success: assigned number (large, copy button), status chip **Active**, pointer to forwarding instructions. Errors: "No numbers available in your area — try another area code" (retry), "Provisioning failed — try again" (retry), rate-limit wait message. **Release number** = subtle action + confirm ("Your AI will stop answering this number — are you sure?") → re-provision available.
3. **Config blocks (each card with its own Save + saved/unsaved state):**
   - **Voice greeting script** — what the AI says on answering. Textarea; prefills from AI Brain greeting when voice-specific not set; placeholder: "Hi, thanks for calling {Business Name}! How can we help you today?"
   - **Objection handling** — editable list of common objections ("Too expensive", "Just getting quotes", "I'll call later") with per-objection AI handling lines; add/remove rows.
   - **Custom conversational rules** — add/remove `when → do` strings ("If customer mentions emergency, say X" / "If customer asks for {service}, offer {next step}"); plain language, no code.
   - Note under greeting (appears once): "Your AI always finishes a call in progress, even if credits run out mid-conversation."
4. **Setup instructions card:** **1** Get your number · **2** Forward your business line to your AI number (unconditional call-forwarding guidance) · **3** Test the flow — call your AI number and ask a booking question · optional **4**: review calls in Missed Calls / Messages.

**Right column (status & activity):**
- **Status card:** number (or "No number yet"), Active/Provisioning/Inactive chip, compact **AI Voice Calling Usage** mini-bar (same component/colors as §7).
- **Recent calls** (from `/api/ai-calls`, max 5–8): caller label, outcome chip (`lead_created | appointment_booked | no_action | unknown`), time/date. Empty: "No AI calls yet — forward your number and make a test call." Error: retry; loading: row skeletons.
- **"View all calls"** → existing Missed Calls surface (no new destination).

**Lapsed mid-cycle:** overlay returns; number is retained ("Your number is saved. Renew your plan to reactivate it.").

## 7. Dashboard — two AI-usage bars (AT THE BOTTOM)

**Placement (explicit):** a final **"AI usage"** section at the **bottom** of the dashboard home (`/dashboard`) — below the activity feed, nothing after it. Two bars, side-by-side on ≥lg, stacked below 640px. (No mirror on Overview.)

**Bars:** **AI Chat Usage** (MessageSquare) and **AI Voice Calling Usage** (Phone).

**Data contract (architect-owed; UI consumes only):** per-tenant current-billing-period usage from the `usage_event` ledger, split chat vs voice (`eventType = voice.call.minutes` vs everything else): `{ chatUsed, chatLimit, voiceUsed, voiceLimit, periodStart, periodEnd, remaining, poolLimit }`. Limits by subscription state — trial: chat limit = **50 messages** (owner-ratified trial chat allowance); paid: **4,000 credits/mo** ($20/mo AI-cost ceiling at $0.005/credit — owner-ratified). The exact messages/minutes equivalent of the paid allowance is intentionally **not** promised to customers. On fetch failure: chrome renders, values "—", per-card retry; **never fabricate numbers**.

**Threshold behavior (pool-wide single pool):** the two bars visualize each channel's share of one pool; the **fill color follows pool-wide utilization** (both bars turn red together):
- **0–70% → green** · **71–89% → yellow/amber** · **90–100% → red + lock icon** on the bar.
- **Warn at 15% remaining** (≥85% used): thin inline note in-card ("You've used 15% or less of your credits.").
- **0 remaining (100%):** red + lock + grace copy: **"Your AI finished any calls in progress. New AI conversations are paused until your next billing period or a credit top-up."**

**Readout & tooltip:** `used / limit` (e.g. "2,840 / 4,000 credits"; trial "38 / 50 messages"); tooltip (ⓘ): "Credits reflect your AI usage; 4,000 credits are included with your plan each month." Sub-line: "Resets in N days" from `periodEnd`.

**Footer CTA per state:**
| State | Fill | Note | CTA |
|---|---|---|---|
| 0–70% | green | normal | View usage → settings/billing |
| 71–89% | yellow | + "15% or less remaining" note ≥85% | View usage |
| 90–99% | red + lock | "You're almost out of credits." | **Buy more credits** → top-up checkout when shipped; **interim: `/dashboard/settings`** (never imply a purchase method that doesn't exist) |
| 100% / 0 remaining | red + lock | grace copy above | Buy more credits → top-up (interim: settings) |
| Trial (chat) | color by pool % of 50 msgs | "Free trial" framing; on-by-default | Upgrade (subscription) |
| Trial (voice) | locked | voice gated | **Upgrade to Unlock Voice** → billing |

**Empty states:** no usage yet → bar at 0% green, readout "0 / 4,000 credits", copy "No usage yet — start an AI conversation to see it here." Voice with no number → "No AI calls yet" (link to Voice section).

**Performance:** bars fetch independently (separate small call), own skeleton region, per-card retry, `ErrorBoundary`; never block instant-load dashboard; subscription-aware data only.

## 8. Knowledge Base — 9-trade presets flow (`/dashboard/knowledge-base`)

**Purpose.** Pick the closest trade → preset **auto-fills an editable 10-section template** → review/edit → save. Removes generic free-text duplication on this page.

**Page structure (top → bottom):**
1. **Red alert banner — VERBATIM KB-1** (destructive styling, persistent while on page):
   > **If you don't see your specific trade or business, select the closest preset to fill automatically and edit below.**
2. **Preset grid:** exactly 9 cards — Plumbing, HVAC, Electrical, Roofing, Cleaning, Landscaping, Pest Control, Med Spas, Auto Repair — icon chip, label, card copy (`trade-presets-content.json` `cardCopy`). **Clicking a card auto-fills the 10-section editable template below** (leads' own wording: "clicking a preset auto-fills the editable template (10 sections)") — no separate preview modal: click → fill → page scrolls to the editor with the card showing the selected ring.
3. **Editable 10-section template** (the core destination): a stacked list of the **10 core knowledge areas in canonical order** (§ of TRADE-PRESETS-CONTENT): 1 Business Name & Official Identity · 2 Core Services & Descriptions · 3 Service Areas & Zip Codes · 4 Pricing & Estimate Guidance · 5 Business Hours & Holiday Schedule · 6 Emergency vs Routine Triage · 7 Escalation & Call Handoff Protocols · 8 FAQs · 9 AI Guardrails & Response Rules · 10 Business Owner Direct Routing.
   - Each section = a card: area title, "From <Preset>" chip, and the preset content in editable fields (`services` = tag/list editor; `faqs` = Q/A rows; remaining = textareas). Per-section **Save** + unsaved dot; page-level **Save all** reusing `/api/ai/brain` PUT (tenant-context cache invalidation through the existing flow).
   - **Overwrite safety:** clicking a preset fills sections; sections where the owner already has custom content show "Will replace your current content" on the affected card(s) with a per-section **Keep mine / Replace** choice (default Keep mine for **Business Name & Official Identity** — never clobber the tenant's real name/license; default Replace for template-only sections like Pricing and FAQs).
4. **Disclaimer — VERBATIM KB-2**, non-dismissible, rendered as a footer strip directly under the 10-section editor (and inside the first application of a preset when the fill happens):
   > **Sagenify AI is not responsible for business configuration errors, incorrect custom pricing, unverified estimates, or call handling miscommunications set by workspace owners.**
5. **Documents list stays** (view/manage/delete existing docs). **All three duplicate generic "Add Content" forms are removed — Website URL, Paste Content, and Upload File are deleted from this page** per the owner-directed batch. Empty-state copy updates: "Start from a trade preset above, or manage your existing documents here."

**Post-fill confirmation:** after auto-fill, a non-blocking summary strip: "Plumbing preset applied — 10 sections filled. Review and edit before going live." (Section 1 default filled only if empty.)

**States:** no preset selected (grid + editor empty state) · selected/filled · custom content present (Keep/Replace per section) · saving/invalid/error per section · saving-all · offline/retry. The 9 preset keys: `plumbing, hvac, electrical, roofing, cleaning, landscaping, pest-control, med-spas, auto-repair`.

## 9. Acceptance checklist (for QA)

1. Signed-out access to all new/renamed dashboard routes → `/sign-in` (guard route group), no 5xx. Old URLs 307 → copilot.
2. Verbatim copy present byte-exact: KB-1, KB-2, VO-1, VO-2 (LAND-1 is landing-owned — verify separately with frontend-ui).
3. No page in this batch changes pricing/billing/flutterwave copy or flow. New billing-adjacent labels: VO-2, "Buy more credits".
4. Usage bars: at the **bottom** of `/dashboard`; colors green/yellow/red at exactly 70/89/90; lock ≥90; no fabricated values; 50-message trial chat vs 4,000-credit paid; grace copy at 0; empty/error states per §7.
5. Voice: no unlocked flash before sub-state resolves; overlay + CTA on trial/lapsed; ≥5 voices with Play Sample; get-number states; release-with-confirm; active-call grace copy once.
6. Chatbot: copy buttons work; accent/greeting change the preview live; Regenerate issues new signed snippet with confirm.
7. Knowledge Base: banner + disclaimer verbatim; clicking a preset auto-fills exactly the 10 sections; Keep/Replace behavior; section 1 never clobbered; all three generic forms absent; docs still viewable.
8. Co-Pilot: context chips reflect real data; suggestions on empty state; copy/regenerate actions; write actions require Confirm; source chips only from API.
9. AI Brain: 4 sliders (Formality, Warmth, Conciseness, **Empathy**); Fallbacks + Human-handoff cards present; saves via existing endpoint; Test Your AI intact.
10. Mobile 375px pass on all pages above.

## 10. Open items for the team / owner input (flagged)

1. **Document ingestion home (owner input).** Removing Website URL / Paste Content / Upload File from Knowledge Base leaves no self-serve import surface for new documents in this UI. Recommend: existing documents stay manageable (list/edit/delete); a future import surface (e.g., within AI Brain → Knowledge tab) is a follow-up — confirm acceptable for this batch.
2. **Overwrite semantics (owner preference).** Default = Replace for template-only sections, Keep mine for Business Name & Official Identity. Confirm.
3. **Voice library & numbers (DevOps/architect).** Actual Vapi voice catalog + availability per area code; static sample clips needed for Play Sample.
4. **Landing early-bird banner (LAND-1)** belongs to the landing pricing stream (frontend-ui / pricing-v3) — listed here only so app pages never reuse or alter it.
5. **Config fields (architect).** The 10 preset sections map partially to existing `aiBrainConfig` fields (identity→business + systemPrompt, pricing→pricingGuidance, hours→businessHours, faqs→knowledgeDocument, triage/escalation/guardrails/owner_routing→escalationRules or new voice-config fields). New columns/voice-config storage may be required — architect decides, UI contract above is stable.