import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { resolveSubdomainRedirect } from "@/lib/domains";

const isPublicRoute = createRouteMatcher([
  "/",
  // Marketing/legal pages — must be public so signed-out visitors can read
  // them without being pushed to /sign-in (owner-reported routing bug).
  "/docs(.*)",
  "/privacy",
  "/terms",
  "/sign-in(.*)",
  "/sign-up(.*)",
  // NOTE: /onboarding is intentionally NOT public — signed-out visitors
  // hitting /onboarding must be redirected to /sign-in (QA issue 004).
  // Signed-in users are handled by the onboarding DB check below, and the
  // redirect loop-guard prevents bouncing them away from /onboarding.
  "/api/public(.*)",
  "/api/health(.*)",
  "/api/webhooks(.*)",
  "/api/voice(.*)",
  "/api/onboarding(.*)",
]);

/** API / static paths that never need an onboarding check */
const isApiOrStaticRoute = createRouteMatcher([
  "/api/(.*)",
  "/_next/(.*)",
]);

/** Cookie name for onboarding-status cache (5 min TTL) */
const ONBOARDING_COOKIE = "ob_status";

/**
 * Legacy dashboard aliases → canonical routes.
 *
 * These must be redirected HERE, at the edge, and not by a page-level
 * `redirect()` (next/navigation). On this stack (Next 16.2 + Turbopack on
 * Vercel) a server `redirect()` thrown from a page is swallowed at the
 * response boundary — the browser receives an app shell with no navigation
 * and renders an empty frame (same class of failure as auth.protect()'s
 * redirect, fixed at the edge in PR #79). A raw 307 emitted by the proxy
 * reaches the browser intact.
 *
 * Exact-match only, on the normalized pathname, so a query string or a
 * trailing slash still resolves. Never a capturing-group rewrite rule.
 */
const LEGACY_ROUTE_REDIRECTS: Record<string, string> = {
  // AI Commander was renamed to Sagenify Business Co-Pilot.
  "/dashboard/ai-commander": "/dashboard/copilot",
  // Singular legacy alias for the (real, canonical) automations page.
  // Deliberately NOT sent to /dashboard/copilot: /dashboard/automations
  // renders AutomationView and is a live sidebar destination.
  "/dashboard/automation": "/dashboard/automations",
};

/** Trailing-slash-insensitive pathname lookup for the legacy alias table. */
function resolveLegacyRedirect(pathname: string): string | null {
  const normalized = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  return LEGACY_ROUTE_REDIRECTS[normalized] ?? null;
}

export default clerkMiddleware(
  async (auth, req) => {
    // ── Subdomain canonicalization (marketing site ↔ app portal) ────────
    // Runs BEFORE auth.protect() so signed-out visitors on the wrong host are
    // moved to the canonical host first (Clerk then redirects to sign-in on
    // the correct host). No-op until NEXT_PUBLIC_APP_URL activates the split;
    // /api/* and /_next/* are never redirected (webhooks + chatbot embeds
    // must keep working from both hosts during the transition).
    const canonical = resolveSubdomainRedirect({
      host: req.headers.get("host") ?? req.nextUrl.host,
      pathname: req.nextUrl.pathname,
      search: req.nextUrl.search,
    });
    if (canonical) {
      return NextResponse.redirect(new URL(canonical), 307);
    }

    // Protect non-public routes — explicit signed-out redirect (belt-and-braces).
    // Clerk's auth.protect() redirect is swallowed on this stack (Next 16.2 +
    // Turbopack on Vercel): the proxy runs (x-clerk-auth-status: signed-out IS
    // set on responses) but the redirect it emits disappears at the boundary —
    // verified 2026-10-24 across /dashboard/* pages and even raw
    // NextResponse.redirect() rewrites. `auth` here is the middleware helper
    // object (NOT a function), so the check is auth.userId — the same property
    // the onboarding block below already reads. Page navigations (document or
    // RSC state-tree request) get a raw 307 to /sign-in; API/data requests
    // (sec-fetch-dest !== document, no router header) intentionally fall
    // through to auth.protect() and the route-handler guards, which keep
    // returning their 401s instead of an HTML redirect.
    const isPageNavigation =
      req.headers.get("sec-fetch-dest") === "document" ||
      req.headers.get("next-router-state-tree") !== null;
    // Clerk v7's typings model this callback argument as an AuthFn; at runtime
    // it is the auth helper object. Read userId through one explicit cast so
    // the mismatch is stated once instead of surfacing as a type error on
    // every read.
    const clerkUserId = (auth as unknown as { userId: string | null }).userId;
    if (!isPublicRoute(req)) {
      if (!clerkUserId && isPageNavigation) {
        return NextResponse.redirect(new URL("/sign-in", req.url));
      }
      auth.protect();
    }

    // ── Legacy dashboard alias redirects (edge-level) ───────────────────
    // Placed AFTER the auth gate so the signed-out behaviour is unchanged:
    // a signed-out page navigation to a legacy alias still 307s to /sign-in
    // (the gate above returns first), and only an authenticated visitor is
    // moved on to the canonical route. Done at the edge because a page-level
    // redirect() is swallowed on this stack (empty-frame risk).
    const legacyTarget = resolveLegacyRedirect(req.nextUrl.pathname);
    if (legacyTarget && (clerkUserId || isPageNavigation)) {
      const legacyUrl = new URL(legacyTarget, req.url);
      // Preserve the original query string (?tab=… deep links keep working).
      legacyUrl.search = req.nextUrl.search;
      const redirectRes = NextResponse.redirect(legacyUrl, 307);
      // Aliases must never be cached — a stale 307 would strand a visitor on
      // a retired path (and would make QA cache-busted probes lie).
      redirectRes.headers.set("Cache-Control", "no-store, must-revalidate");
      return redirectRes;
    }

    // ── Onboarding redirect ──────────────────────────────────
    // Skip entirely for API routes, static assets, and public routes
    if (isApiOrStaticRoute(req) || isPublicRoute(req)) return;

    const userId = clerkUserId;
    if (!userId) return;

    // Check cookie cache first — skip DB if already confirmed for this user
    const cookie = req.cookies.get(ONBOARDING_COOKIE);
    if (cookie?.value === `1:${userId}`) return;

    try {
      const start = Date.now();
      const sql = neon(process.env.DATABASE_URL!);
      const rows = await sql`
        SELECT onboarding_complete FROM business
        WHERE owner_id = ${userId}
        LIMIT 1
      `;

      const elapsed = Date.now() - start;
      if (elapsed > 50) {
        console.warn(`[proxy] slow onboarding check: ${elapsed}ms for user ${userId}`);
      }

      // Business exists AND onboarding is complete → cache + allow
      if (rows.length > 0 && rows[0].onboarding_complete) {
        const res = NextResponse.next();
        res.cookies.set(ONBOARDING_COOKIE, `1:${userId}`, {
          httpOnly: true,
          secure: true,
          sameSite: "lax",
          maxAge: 300, // 5 minutes
          path: "/",
        });
        return res;
      }

      // No business yet, or onboarding NOT complete → redirect
      console.log(`[proxy] redirecting user ${userId} to /onboarding — business=${rows.length > 0}, complete=${rows[0]?.onboarding_complete}`);
      const redirectUrl = new URL("/onboarding", req.url);
      // Ensure we're not already on onboarding to avoid redirect loops
      if (req.nextUrl.pathname === "/onboarding") return;
      return NextResponse.redirect(redirectUrl);
    } catch (err) {
      console.error("[proxy] onboarding check failed:", (err as Error).message);
      // Don't block navigation on DB errors — let them through
    }
  },
  {
    publishableKey: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
    // Explicit sign-in/up URLs so auth.protect() redirects signed-out
    // visitors to the app's own pages (QA issue 004: /dashboard and
    // /onboarding rendered the app shell instead of redirecting).
    // protect() only inherits ClerkProvider props client-side; the
    // middleware needs these set here to build the correct redirect.
    signInUrl: "/sign-in",
    signUpUrl: "/sign-up",
  }
);

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
