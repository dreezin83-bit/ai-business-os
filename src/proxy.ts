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
    if (!isPublicRoute(req)) {
      if (!auth.userId && isPageNavigation) {
        return NextResponse.redirect(new URL("/sign-in", req.url));
      }
      auth.protect();
    }

    // ── Onboarding redirect ──────────────────────────────────
    // Skip entirely for API routes, static assets, and public routes
    if (isApiOrStaticRoute(req) || isPublicRoute(req)) return;

    const { userId } = auth;
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
