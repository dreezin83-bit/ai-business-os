import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/onboarding(.*)",
  "/api/public(.*)",
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
    if (!isPublicRoute(req)) {
      auth.protect();
    }

    // ── Onboarding redirect ──────────────────────────────────
    // Skip entirely for API routes, static assets, and public routes
    if (isApiOrStaticRoute(req) || isPublicRoute(req)) return;

    const session = await auth;
    const userId = session.userId;
    if (!userId) return;

    // Check cookie cache first — skip DB if already confirmed
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

      if (rows.length === 0 || rows[0].onboarding_complete) {
        // Onboarding done — cache in cookie for 5 minutes
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

      // Not onboarded — redirect
      return NextResponse.redirect(new URL("/onboarding", req.url));
    } catch (err) {
      console.error("[proxy] onboarding check failed:", (err as Error).message);
      // Don't block navigation on DB errors
    }
  },
  { publishableKey: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY }
);

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
