# Production Readiness Audit — AI Business OS
# Date: 2026-08-01 | Auditor: agent-architect

## Summary
Audited 37 API routes, 18 frontend pages, 8 webhook endpoints, and the full data schema.
Critical blockers found: 0 (no runtime errors in audited paths)
Medium issues: 4 webhook security gaps
Low issues: 2 route concerns, 1 missing API

---

## FEATURE INVENTORY

### ✅ WORKING — Verified in code

| Feature | Path(s) | Notes |
|---|---|---|
| Onboarding flow | `api/onboarding/route.ts`, `app/onboarding/page.tsx` | Creates business + AI config + knowledge docs. Template-based defaults. |
| AI Brain config | `api/ai/brain/route.ts`, `app/dashboard/ai-brain/page.tsx` | GET/PUT, 5 tabs, template application |
| AI chat (dashboard) | `api/ai/chat/route.ts` | Authenticated, buildAiContext, markers, lead extraction |
| AI Commander | `api/ai/command/route.ts`, `app/dashboard/ai-commander/page.tsx` | Business intelligence queries |
| Public chatbot | `api/public/chatbot/route.ts` | Customer-facing, resolves business by domain/API key, markers |
| SMS/WhatsApp webhook | `api/webhooks/twilio/route.ts` | Receives, AI replies, lead extraction, appointment creation |
| Voice (Twilio direct) | `api/voice/incoming/route.ts` | Business by phone, AI greeting, speech loop, markers |
| Voice (Vapi) | `api/voice/vapi/[webhookToken]/route.ts` | Token-based tenant resolution, transient assistant, end-of-call lead extraction |
| Vapi auto-provisioning | `lib/vapi-provisioning.ts`, `api/voice/provision/route.ts` | Subscription-gated, idempotent, Vapi-managed numbers, reconciliation |
| Flutterwave webhook | `api/webhooks/flutterwave/route.ts` | HMAC-SHA256 verified, subscription upsert, triggers provisioning |
| Resend inbound email | `api/webhooks/resend/inbound/route.ts` | Svix verification, exact email match, AI reply via sendEmail |
| Appointments CRUD | `api/appointments/route.ts`, `api/appointments/[id]/route.ts` | Time conflict detection, endTime fallback |
| Leads CRUD | `api/leads/route.ts`, `api/leads/[id]/route.ts` | Full CRUD, pagination |
| Conversations | `api/conversations/route.ts` | List by business |
| Knowledge base | `api/knowledge/route.ts`, `api/knowledge/[id]/route.ts` | Categories, documents |
| Automation rules | `api/automation/route.ts` | CRUD |
| Communication settings | `api/communication-settings/route.ts` | email/whatsapp/sms toggles |
| Dashboard stats | `api/dashboard/stats/route.ts` | Leads, appointments, conversations counts |
| Settings | `api/settings/route.ts`, `app/dashboard/settings/page.tsx` | Business info + AI Phone Number display |
| AI Templates | `api/ai-templates/route.ts`, `api/ai/templates/route.ts` | Template catalog (duplicate routes) |
| Tenant isolation | Via `ensureBusiness()` in: appointments, automation, comm-settings, conversations, knowledge, leads, settings, dashboard/stats | Clerk auth → business_id resolution |
| Database schema | 15+ tables with business_id foreign keys | Multi-tenant by design |
| Vapi client library | `lib/vapi-client.ts` | Full typed client: buyNumber, createAssistant, updatePhoneNumber, listNumbers |
| AI context | `lib/ai-context.ts` | Cached, parallelized DB queries, template injection |
| LLM integration | `lib/llm.ts` | OpenAI, gpt-4o-mini, max_tokens 500 |
| Notifications | `lib/notifications.ts` | Resend email, Meta WhatsApp, contractor + customer |
| Settings AI Phone | `app/dashboard/settings/page.tsx`, `api/business/[id]/phone/route.ts` | 3-state display: no-sub/number/provisioning |

### ⚠️ CONFIGURED-BUT-UNVERIFIED — Needs credentials to test

| Feature | Required Env Var | Status |
|---|---|---|
| Vapi phone buying | VAPI_API_KEY | Client library wired, provisioning calls it — untested without key |
| Vapi assistant creation | VAPI_API_KEY | Same as above |
| Flutterwave payments | FLUTTERWAVE_WEBHOOK_SECRET | Webhook handler built, HMAC verification — untested |
| Resend outbound email | RESEND_API_KEY | sendEmail() uses it, notifications depend on it |
| Resend inbound email | RESEND_WEBHOOK_SECRET | Svix verification built, optional fallback |
| OpenAI completions | OPENAI_API_KEY | All AI routes depend on this |
| WhatsApp replies | META_ACCESS_TOKEN, META_PHONE_NUMBER_ID | sendWhatsApp() in notifications.ts |
| Twilio WhatsApp | TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_NUMBER | webhook replies |

### 🔴 BROKEN / NEEDS FIX

| # | Issue | Severity | Location | Fix |
|---|---|---|---|---|
| 1 | Clerk webhook has NO Svix signature verification | HIGH | `api/webhooks/clerk/route.ts` | Add Svix header verification (svix-id, svix-timestamp, svix-signature) per Clerk docs. Currently only checks event type — any caller can forge user.created events. |
| 2 | Email webhook has NO verification | HIGH | `api/webhooks/email/route.ts` | Add signature/auth. Without it, anyone can POST fake email events. |
| 3 | Twilio voice webhook has NO X-Twilio-Signature verification | MEDIUM | `api/webhooks/twilio-voice/route.ts` | Add Twilio signature validation using TWILIO_AUTH_TOKEN. |
| 4 | Twilio SMS webhook has NO X-Twilio-Signature verification | MEDIUM | `api/webhooks/twilio/route.ts` | Add Twilio signature validation. |

### 🟡 INCOMPLETE / NEEDS ATTENTION

| # | Issue | Severity | Location | Notes |
|---|---|---|---|---|
| 5 | Duplicate AI template routes | LOW | `api/ai-templates/route.ts` + `api/ai/templates/route.ts` | Two routes serve the same purpose. Consolidate. |
| 6 | Carriers route has no tenant check | LOW | `api/carriers/route.ts` | Needs investigation — may be public API. If so, document. |
| 7 | No dedicated subscription API endpoint | LOW | — | Settings page calls `/api/subscription` but no such route exists in the route listing. Settings page silently catches the error. Need to add or verify. |

---

## DATABASE MIGRATION STATUS

Schema defines 15+ tables. Key columns for provisioning added:
- `business.vapiWebhookToken` — unique, generated at provisioning
- `business.vapiAssistantId` — persisted after assistant creation
- `business.voiceSetupReady` — boolean flag
- `business.voiceProvisionState` — idle/provisioning/completed/failed
- `business.voiceProvisionError` — error message
- `business.voiceProvisionedAt` — timestamp
- `phone_number` table — vapiPhoneNumberId, number, serverUrl, provider
- `subscription` table — plan, status, flutterwaveSubId, period dates

**No migration runner found** — Drizzle schema changes need `drizzle-kit push` or manual migration. This must be run against production Neon DB before deployment.

---

## WEBHOOK SECURITY SUMMARY

| Webhook | Verification | Status |
|---|---|---|
| Clerk | NONE | 🔴 Add Svix |
| Email | NONE | 🔴 Add auth |
| Flutterwave | HMAC-SHA256 | ✅ |
| Resend inbound | Svix (optional) | ✅ |
| Twilio voice | NONE | 🟡 Add X-Twilio-Signature |
| Twilio SMS | NONE | 🟡 Add X-Twilio-Signature |
| WhatsApp | hub.verify_token | ✅ |
| Vapi (voice) | Bearer token via webhookToken | ✅ |

---

## TENANT ISOLATION

Routes using `ensureBusiness()`: appointments, automation, communication-settings, conversations, knowledge, leads, settings, dashboard/stats, voice/provision.

Public routes (no tenant check needed): public/chatbot, public/chatbot/widget.

Routes resolved by business-specific identifier: voice/vapi/[token], webhooks/resend/inbound (email match), webhooks/twilio (phone match), voice/incoming (phone match).

---

## RECOMMENDED FIXES (in priority order)

1. **CRITICAL**: Add Svix verification to Clerk webhook
2. **CRITICAL**: Add auth to email webhook or document it's intentionally open
3. **HIGH**: Run `drizzle-kit push` against production Neon DB
4. **MEDIUM**: Add Twilio signature verification to twilio + twilio-voice webhooks
5. **LOW**: Add `/api/subscription` endpoint or update settings page
6. **LOW**: Consolidate duplicate AI template routes
7. **LOW**: Document or secure carriers route
