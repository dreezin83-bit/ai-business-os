# Sagenify AI — Requested Feature UX Specification

Scope: team access, operating hours, AI quality, usage/billing, reporting, presets, and follow-up automation. This specification follows inspection of the existing dashboard routes, sidebar, Settings page, AI Brain, onboarding templates, and Automation CRUD. Reuse those surfaces and primitives; do not create duplicate Dashboard/Overview, AI Command/Commander, or automation destinations. Preserve the current commercial offer: **$399 first month, then $199/month** (and do not invent replacement tier pricing); retain Flutterwave billing.

## Information architecture
Keep primary nav task-oriented. Add an **Automation** item to the existing sidebar (audit found it undiscoverable). Add **Reports** under an Insights section. Add Workspace destinations under Settings: Team, Hours & availability, Industry & AI preset, Billing & usage. Add Quality as a secondary AI Brain destination/linked tab, not permanent sidebar. On mobile, retain drawer, explicit labels, page title, and one primary action. Tables become cards; filters become sheets; dialogs full-screen under 640px. Use skeleton, retry, contextual empty state, inline validation, toast, sticky mobile-safe Save/Discard bar, and confirmation for destructive actions. All data and requests are tenant-scoped and permission-enforced.

## Team members and permissions
New `/dashboard/settings/team`; reuse Settings shell. Table: name/email, role, status, last active, overflow. Invite sheet: email(s), fixed role, optional message; pending rows support resend/revoke. Edit sheet shows permission groups and Remove access confirmation. Ship fixed roles: Owner (billing/workspace/all), Admin (workspace/operations), Staff (assigned operations), Viewer (read-only). States: owner-only empty CTA, pending/expired invite, duplicate email, last-owner removal blocked, seat limit with truthful upgrade CTA, loading/error. Mobile cards with role/status chips. Future custom roles can use permission groups.

## Hours, timezone, holidays
New `/dashboard/settings/hours` with Hours and Holidays tabs. Timezone (IANA city + UTC offset) comes first; seven-day rows have open/closed toggle and multiple intervals, Copy Monday/Apply weekdays, live “AI booking uses these hours” summary and next transition. Validate overlap/order and store timezone-aware values (DST warning). Holidays list date/name/behavior; add date range, recurrence, custom hours/note; past entries muted, delete confirmed. Mobile rows/cards stack controls; date/timezone pickers full-screen. States include no timezone, invalid overlap, unsaved changes, retry, no holidays.

## AI Quality Center
New `/dashboard/ai-quality`, linked from AI Brain. Scorecard: resolution, human handoff, unanswered, feedback, booking conversion with date/channel filters, prior-period comparison, and “based on N conversations.” Review queue opens transcript panel with customer message, response, sources, confidence, and Mark good / Flag issue / Edit answer / Escalate. Flags require category (wrong info, tone, missing knowledge, policy breach) and note; offer Add to KB or Update AI Brain without silently changing production. Admin evaluation set supports test prompts, draft comparison, pass/fail, and explicit publish confirmation/audit. No-data explains signals are pending; never display misleading 0%. Mobile metrics scroll and transcript full-screen. Gate sensitive transcript data by role and define redaction/retention.

## Usage and billing
Extend the existing `/dashboard/settings` page with a Billing & usage section (or anchored settings tab) rather than creating a duplicate billing destination; reuse SubscribeModal and current subscription state. Overview card: **$399 first month, then $199/month**, cadence, renewal, status, Manage plan. Usage cards: AI, SMS, email, voice, storage actual/limit, reset date/trend; 80% amber, limit red, behavior and CTA explicit. Tabs within the settings section: Overview, Usage, Invoices, Payment method. Handle active, no subscription (show the current offer + subscribe), past due, paused, canceled, provider unavailable, feature locked. Failed payment shows grace date and exact auto-pause impact; preserve data while revoking access per plan. Owner/Admin controls; restricted view for others. Exports include scope, tenant, date, timestamp. Never claim payment until provider confirmation.

## Reporting and analytics
New `/dashboard/reports`, reuse KPI cards, Recharts, date/filter controls. Filters: 7/30/90/custom, workspace timezone, channel, source. KPIs: new/qualified leads, conversion, booked/show rate, response time, AI resolution, delivered SMS/email; definition tooltip, comparison, click-through. Charts funnel, trend, channel and appointment outcomes; AI summary labeled generated and linked to data. Filter → chart/table → linked filtered Leads/Appointments/Messages → permissioned export. Empty/partial data is explicit. Mobile stacks cards and uses chart table summaries. Owner must choose attribution (first/last touch), retention, timezone, and attempted-vs-successful AI calls.

## Industry presets
New `/dashboard/settings/industry` or onboarding step, reusing AI Brain templates. Catalog: HVAC, plumbing, roofing, electrical, cleaning, landscaping, pest, dental, law, real estate; search/category filter. Preview shows services, lead fields, hours defaults, AI tone, starter KB, recipe automations. Apply all/selected/cancel with diff; never delete leads/custom KB and mark custom edits. Show progress, error, rollback. Recommended: seed disabled automation drafts; owner activates. Existing users enter via Settings; mobile cards + full-screen preview.

## Automated follow-up sequences
Promote existing `/dashboard/automation`; add Sequences list/detail and use current automation primitives. List draft/active/paused with trigger, audience, next run, enrolled/completed, reply/stop rate. Wizard: trigger (new lead, missed call, appointment, no response), audience, steps, stop rules, review/activate. Steps support delay, email/SMS/WhatsApp if configured, template or AI copy, business-hours sending, preview. Required quiet hours, frequency cap, consent/opt-out. Default stop on reply, booking, opt-out, closed lead. Vertical timeline desktop, stacked mobile; autosave, validation summary, send test to self, activation confirmation with audience/volume. Detail has enrollment timeline, delivery/reply/bounce, per-contact pause; edits create versions. States draft/active/paused/completed, unavailable channel, consent missing, provider/rate failure, no enrollments. Never send promotional messages without consent.

## Owner decisions / acceptance
1. Fixed roles vs custom permissions and seat limits by tier.
2. Overage hard-stop vs metered and exact auto-pause grace period.
3. Attribution, retention, timezone conventions.
4. Preset behavior (recommended disabled drafts, no destructive overwrite).
5. Channels, consent, quiet hours, sequence caps.
6. Quality reviewer roles, transcript retention/redaction, publish approval.
7. Success events: invite accepted, hours saved, preset applied, sequence activated, report export, quality issue resolved.

## Delivery slices
1. Nav + Automation discoverability; Team and Hours. 2. Presets + sequence builder. 3. Billing/usage and subscription endpoint. 4. Reports + Quality with tenant-safe metric contracts and audit trail.
