import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { business } from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic"; // never serve a generated/cached page past the guard

/**
 * Server-side auth + onboarding enforcement for the entire /dashboard segment.
 *
 * AUTH: the edge proxy (src/proxy.ts) runs and classifies every request
 * (x-clerk-auth-status headers present) but auth.protect()'s redirect is not
 * firing on Next 16.2.10 — signed-out visitors reached the dashboard shell
 * (200 pass-through). This layout sits one level below the (app) group (which
 * also wraps /sign-in and /sign-up), wraps ONLY dashboard routes, and enforces
 * auth before any client component runs: signed-out visitors get a real server
 * 307 → /sign-in (flight digest NEXT_REDIRECT;replace;/sign-in;307;) instead
 * of a hydrated redirect.
 *
 * ONBOARDING GATE: a signed-in tenant whose business row is missing OR whose
 * onboarding is not complete is redirected to /onboarding HERE, inside the
 * render. This is the reliable redirect mechanism on this stack (verified for
 * /sign-in above). Doing it at the edge instead is unsafe in practice: the
 * proxy's raw onboarding 307 is in the documented swallow-prone redirect class
 * (Next 16.2 + Turbopack boundary), and a fresh tenant that gets served the
 * dashboard anyway dies with a server-render error (production outage
 * 2026-10-27, digest 783175523 — the dashboard render tree throws for an
 * unconfigured tenant, and the client-side onboarding guard (#69) never runs
 * because the server render dies before hydration). This gate guarantees an
 * unconfigured tenant can never render the dashboard shell, regardless of
 * what the edge does.
 *
 * "(auth)" is a route group — URLs are unchanged (/dashboard, /dashboard/leads,
 * /dashboard/settings, /dashboard/voice, ...).
 *
 * The client-side guard in dashboard/layout.tsx remains as a redundancy net.
 */
export default async function DashboardAuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  // Onboarding gate — read the tenant's onboarding state defensively, then
  // redirect OUTSIDE the try: redirect() throws NEXT_REDIRECT, so wrapping
  // it would swallow the gate. A DB error fail-opens (mirror of the edge
  // check): never strand a signed-in user because the check itself errored.
  let onboardingComplete = true;
  try {
    const [biz] = await db
      .select({ onboardingComplete: business.onboardingComplete })
      .from(business)
      .where(eq(business.ownerId, userId))
      .limit(1);
    onboardingComplete = !!(biz && biz.onboardingComplete);
  } catch (err) {
    console.error(
      "[dashboard/(auth)] onboarding gate check failed — allowing render",
      err instanceof Error ? err.message : String(err)
    );
  }

  if (!onboardingComplete) {
    redirect("/onboarding");
  }

  return children;
}
