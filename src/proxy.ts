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

export default clerkMiddleware(
  async (auth, req) => {
    if (!isPublicRoute(req)) {
      auth.protect();
    }

    // Redirect un-onboarded users to /onboarding
    const session = await auth;
    const userId = session.userId;
    if (
      userId &&
      !isPublicRoute(req) &&
      !req.nextUrl.pathname.startsWith("/onboarding")
    ) {
      try {
        const sql = neon(process.env.DATABASE_URL!);
        const rows = await sql`
          SELECT onboarding_complete FROM business
          WHERE owner_id = ${userId}
          LIMIT 1
        `;
        if (rows.length > 0 && !rows[0].onboarding_complete) {
          return NextResponse.redirect(new URL("/onboarding", req.url));
        }
      } catch (err) {
        // Silently pass — don't block auth on DB errors
        console.error("[proxy] onboarding check failed:", (err as Error).message);
      }
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