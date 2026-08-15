import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

const isPublicRoute = createRouteMatcher([
  "/",
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
    // Protect non-public routes
    if (!isPublicRoute(req)) {
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
