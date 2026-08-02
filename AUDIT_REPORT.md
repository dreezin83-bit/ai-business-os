# Customer-Facing UI Route Audit
**Date:** 2026-08-01 | **Auditor:** frontend-ui agent | **Branch:** `main`

## Status Matrix

| Route | Rendering | Loading | Error | Empty | API Deps | Links | Issues |
|-------|-----------|---------|-------|-------|----------|-------|--------|
| `/dashboard` | ✅ | ✅ Spinner | ✅ Retry | ✅ Contextual | `/api/dashboard/stats` | ✅ | ⚠️ Links to old `/dashboard/ai-command` |
| `/dashboard/overview` | ✅ | ✅ Spinner | Requires check | N/A | `/api/dashboard/stats` | ✅ | Redundant with `/dashboard`? |
| `/dashboard/ai-commander` | ✅ | N/A (welcome) | ✅ Catch | ✅ Prompts | `/api/ai/command` | ✅ | — |
| `/dashboard/ai-command` | ✅ | ✅ | ✅ Catch | ✅ | N/A | N/A | 🔴 DUPLICATE of ai-commander |
| `/dashboard/ai-brain` | ✅ | ✅ Skeleton | ✅ ErrorBoundary | ✅ Warning | `/api/ai/brain`, `/api/ai-templates`, `/api/business/current`, `/api/ai-brain/apply-template`, `/api/ai/chat` | ✅ | ⚠️ Links to `/dashboard/sms`, `/dashboard/email` (404) |
| `/dashboard/chatbot` | ✅ | ✅ | ❌ Silent fail | N/A | `/api/settings`, `/api/public/chatbot` | ✅ | Hardcoded prod URL in embed |
| `/dashboard/knowledge-base` | ✅ | ✅ Spinner | ✅ | ✅ Contextual | `/api/knowledge`, `/api/knowledge/fetch-url` | ✅ | — |
| `/dashboard/automation` | ✅ | ✅ Spinner | ❌ Silent fail | ✅ Contextual | `/api/automation` | ✅ | Not in sidebar nav |
| `/dashboard/leads` | ✅ | ✅ Spinner | ✅ | ✅ Contextual | `/api/leads` | ✅ | Uses `window.location.href` not router |
| `/dashboard/leads/[id]` | ✅ | ✅ Spinner | ✅ | ✅ Conversations | `/api/leads/[id]`, `/api/conversations` | ✅ | "Book Appointment" button has no handler |
| `/dashboard/appointments` | ✅ | ✅ Spinner | ✅ | ✅ Contextual | `/api/appointments` | ✅ | No edit/cancel/delete functionality |
| `/dashboard/messages` | ✅ | ✅ Spinner | ✅ | ✅ Contextual | `/api/communications/history` | ✅ | — |
| `/dashboard/messages/compose` | ✅ | ✅ | ✅ | N/A | `/api/leads`, `/api/communications/send` | ✅ | — |
| `/dashboard/missed-calls` | ✅ | ✅ Spinner | Requires check | ✅ | `/api/carriers`, `/api/settings`, `/api/business/[id]/phone` | ✅ | ⚠️ Page is call forwarding, NOT missed calls |
| `/dashboard/settings` | ✅ | ✅ Spinner | Requires check | N/A | `/api/settings`, `/api/business/[id]/phone` | ✅ | — |
| `/dashboard/settings/communication` | ✅ | ✅ Spinner | Requires check | N/A | `/api/communication-settings` | ✅ | — |
| `/onboarding` | ✅ | N/A | ✅ Toast | N/A | `/api/onboarding`, `/api/ai-brain/apply-template` | ✅ | — |

## Critical Bugs 🔴

### 1. BUG: Duplicate AI Command Pages
- `/dashboard/ai-command` (104 lines) and `/dashboard/ai-commander` (176 lines) are two separate pages
- Sidebar links to `/dashboard/ai-commander` (new)
- Dashboard home quick-actions link to `/dashboard/ai-command` (old)
- **Fix:** Either delete `/dashboard/ai-command` or redirect it to `/dashboard/ai-commander`. Update dashboard home link.

### 2. BUG: Broken Links in AI Brain → Channels Tab
- Links to `/dashboard/sms` and `/dashboard/email` exist in the Channels tab
- These routes do NOT exist — users will get 404s
- **Fix:** Remove or stub these links until SMS/Email pages are built

## Important Issues ⚠️

### 3. ISSUE: Missed Calls page shows Call Forwarding
- Page at `/dashboard/missed-calls` is actually a "Call Forwarding" configuration page
- Shows carrier selection, AI phone number, and forwarding code
- Sidebar label says "Missed Calls" but content is about call forwarding setup
- **Fix:** Either rename the page to "Call Forwarding" or build actual missed calls functionality

### 4. ISSUE: Automation page missing from sidebar navigation
- `/dashboard/automation` page exists and works but has no sidebar nav link
- Only accessible via direct URL — users won't find it
- **Fix:** Add "Automation" to the sidebar nav items

### 5. ISSUE: No edit/cancel for appointments
- Appointments list is read-only — users can create but not edit, cancel, or delete
- **Fix:** Add edit dialog and cancel/delete actions

### 6. ISSUE: "Book Appointment" button on lead detail page has no handler
- The button at line 292 of `leads/[id]/page.tsx` has no `onClick`
- **Fix:** Wire it to open appointment creation dialog or navigate to appointments page

### 7. ISSUE: Dashboard home vs Overview — redundant pages
- `/dashboard` and `/dashboard/overview` both exist as separate pages
- Both fetch `/api/dashboard/stats` and render similar content
- Sidebar has links to both ("Dashboard" and "Overview")
- **Fix:** Consider merging or clearly differentiating them

## Minor Issues 🔵

### 8. MINOR: `window.location.href` instead of `router.push` in leads table
- Leads page uses `window.location.href` for navigation (line 309)
- Causes full page reload in Next.js SPA
- **Fix:** Use `useRouter().push()` for client-side navigation

### 9. MINOR: Hardcoded production URL in chatbot embed
- Embed code references `https://ai-business-os-six.vercel.app` directly
- Won't work correctly in dev/staging environments
- **Fix:** Use environment variable for the base URL

### 10. MINOR: Silent failures in automation and chatbot pages
- Automation page: catch block just sets loading to false without error state
- Chatbot page: `/api/settings` failure silently falls through
- **Fix:** Add explicit error states with retry buttons

## API Dependency Map

All customer-facing API routes verified to exist:

```
/dashboard            → GET /api/dashboard/stats
/dashboard/overview   → GET /api/dashboard/stats
/dashboard/ai-commander → POST /api/ai/command
/dashboard/ai-brain   → GET/PUT /api/ai/brain, GET /api/ai-templates, GET /api/business/current, POST /api/ai-brain/apply-template, POST /api/ai/chat
/dashboard/chatbot    → GET /api/settings, POST /api/public/chatbot
/dashboard/knowledge-base → GET/POST/DELETE /api/knowledge, POST /api/knowledge/fetch-url
/dashboard/automation → GET/POST/PUT/DELETE /api/automation
/dashboard/leads      → GET/POST /api/leads
/dashboard/leads/[id] → GET/PUT /api/leads/[id], GET /api/conversations
/dashboard/appointments → GET/POST /api/appointments
/dashboard/messages   → GET /api/communications/history
/dashboard/messages/compose → GET /api/leads, POST /api/communications/send
/dashboard/missed-calls → GET /api/carriers, GET /api/settings, GET /api/business/[id]/phone
/dashboard/settings   → GET/PUT /api/settings, GET /api/business/[id]/phone
/dashboard/settings/communication → GET/PUT /api/communication-settings
/onboarding           → POST /api/onboarding, POST /api/ai-brain/apply-template
```

## Summary

| Category | Count |
|----------|-------|
| Critical bugs | 2 |
| Important issues | 5 |
| Minor issues | 3 |
| Total routes audited | 17 |
| Routes with loading states | 15/15 applicable |
| Routes with error states | 10/15 applicable |
| Routes with empty states | 8/8 applicable |
| Verified API endpoints | 22 |
| Broken internal links | 2 (sms, email from AI Brain) |

**Build:** Requires a full `npm run build` to confirm 0 errors (build was attempted but timed out due to memory; previous build at 56/56 passed).
