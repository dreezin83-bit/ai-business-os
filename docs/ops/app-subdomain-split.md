# App subdomain split — app.sagenifyai.com

Owner decision (2026-10-23): split the marketing site from the app portal.

- **Marketing site** stays on the root domain: `sagenifyai.com` / `www.sagenifyai.com`
- **App portal** (dashboard, onboarding, sign-in/up, API, webhooks) moves to **`app.sagenifyai.com`**

This document is the ops/architect handoff for activating the split. The code
side is **dormant by default** — deploying this change does NOT change any
behavior until DevOps sets the env var below and the DNS/Clerk prerequisites
are in place.

---

## How activation works (code side)

All domain knowledge lives in one module: `src/lib/domains.ts`.

| Constant | Source | Notes |
|---|---|---|
| `SITE_URL` | `NEXT_PUBLIC_SITE_URL` ?? `https://www.sagenifyai.com` | Marketing canonical (metadata, robots, sitemap) |
| `APP_URL` | `NEXT_PUBLIC_APP_URL` **|| `SITE_URL`** | App canonical. Until the env is set it equals the site URL → split inactive |
| `SPLIT_ACTIVE` | `APP_HOST !== SITE_HOST` | Gateway for every routing decision |
| `resolveSubdomainRedirect()` | pure fn | Decides 307 redirects; unit-tested |

**Activation = set `NEXT_PUBLIC_APP_URL=https://app.sagenifyai.com`** in the
Vercel project and redeploy. `NEXT_PUBLIC_*` is inlined at build time, so the
env change alone doesn't take effect until the next build.

### Redirect policy (only while `SPLIT_ACTIVE`)

Middleware (`src/proxy.ts`, runs before `auth.protect()`) redirects with 307:

- Marketing path (`/`, `/privacy`, `/terms`, `/docs*`) on **app host** → same
  path on `SITE_URL`.
- App path (`/dashboard*`, `/onboarding*`, `/sign-in*`, `/sign-up*`) on **site
  host** → same path on `APP_URL`.
- `/api/*`, `/_next/*`, static files: **never redirected**. Webhooks and the
  chatbot widget (embedded on customer sites) must keep working from both
  hosts through the transition.
- Unknown hosts (localhost, Vercel previews, ctonew previews): never redirected.

### Cookie behavior

Cookies are deliberately **host-scoped** (no `domain=` attribute) so app
subdomain cookies never leak to the marketing site and vice versa. The
`ob_status` onboarding cookie is `httpOnly + secure + sameSite:lax`,
5-minute TTL, path `/`. Do not add a `domain` attribute.

### URL call sites now env-driven

- Chatbot embed snippets (dashboard page + `chatbot-view`) build from
  `NEXT_PUBLIC_APP_URL ?? www` — regenerated embeds point at the app host once
  activated; existing embedded scripts keep working (the widget route is
  never redirected).
- `public/widget.js` uses a `__SAGENIFY_PLATFORM_URL__` token replaced at
  serve time with the request origin (`/api/public/chatbot/widget` route), so
  the widget always calls the API on the host it was loaded from. Old
  www-hosted embeds keep calling www; app-hosted embeds call the app host.
- Notification email deep-links (`View all leads/appointments`) use `APP_URL`.
- Vapi provisioning webhook base and Flutterwave checkout redirect use
  `APP_URL` (Flutterwave keeps its explicit env-required guard).

---

## Infrastructure prerequisite checklist (DevOps/owner)

1. **DNS (Network Solutions → one CNAME, owner/DevOps):**
   `app` → the Vercel target (same target used by www:
   `1c6479ed97efca31.vercel-dns-017.com`), or the CNAME value Vercel shows for
   the project's domain once `app.sagenifyai.com` is added there.

2. **Vercel (DevOps):**
   - Add the `app.sagenifyai.com` domain to the project that serves
     `www.sagenifyai.com` (single-project host-split) **or** wire a second
     project (routing-decision owned by architect — see below).
   - Add `NEXT_PUBLIC_APP_URL=https://app.sagenifyai.com` to Production env
     and redeploy (activates the split).
   - Existing needed env remains: `NEXT_PUBLIC_SITE_URL`, Clerk keys,
     Flutterwave keys, `VAPI_PRIVATE_KEY`, `DATABASE_URL` (note: the
     owner's 2026-10-23 Flutterwave/Vapi key saves went to the platform-hosted
     env, not Vercel — the Vercel project env gap is tracked separately).

3. **Clerk (owner action):**
   - Add `https://app.sagenifyai.com` as an allowed origin for the instance
     (Clerk Dashboard → Sessions / Security → Allowed origins), alongside the
     existing `https://www.sagenifyai.com`.
   - No code change needed on our side: `ClerkProvider` and middleware use
     relative `/sign-in` `/sign-up` paths, which resolve against whichever
     host serves them.

4. **Routing decision (architect-owned, unresolved):** single Vercel project
   serving both hosts with middleware canonicalization (current code path),
   vs two projects. Current code is written for the single-project path and
   is dormant until activated; if two projects are chosen, the marketing
   project would need its own build of the public routes.

---

## Rollout safety

- Deploying this branch with no env change = **zero behavior change** (the
  8-case unit suite locks pre-split and post-split behavior).
- Use **307 (temporary)** redirects, not 308, until the split is battle-tested
  so browsers never cache a permanent redirect we might need to unwind.
- During transition both hosts serve `/api/*`; invoice/webhook callbacks
  configured against www keep working after the split (they are never
  redirected).

## Verification (post-activation, QA gate)

1. `curl -I https://app.sagenifyai.com/privacy` → 307 → `https://www.sagenifyai.com/privacy`
2. `curl -I https://www.sagenifyai.com/dashboard` → 307 → `https://app.sagenifyai.com/dashboard`
3. `curl -I https://www.sagenifyai.com/api/public/chatbot/widget` → 200 (no redirect)
4. `curl -I https://app.sagenifyai.com/api/health` → 200
5. Signed-out browser hitting `app.sagenifyai.com/dashboard` → redirected to
   `app.sagenifyai.com/sign-in` (Clerk, on the app host).
6. Sign-in on the app host lands on the dashboard; the onboarding cookie is
   host-scoped to the app host.