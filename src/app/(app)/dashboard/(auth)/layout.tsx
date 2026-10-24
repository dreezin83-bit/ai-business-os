import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

/**
 * Server-side auth enforcement for the entire /dashboard segment.
 *
 * Background: the edge proxy (src/proxy.ts) runs and classifies every request
 * (x-clerk-auth-status headers present) but auth.protect()'s redirect is not
 * firing on Next 16.2.10 — signed-out visitors reached the dashboard shell
 * (200 pass-through). The (app) group layout cannot host the check because it
 * also wraps /sign-in and /sign-up. This layout sits one level below, wraps
 * ONLY dashboard routes, and enforces auth before any client component runs:
 * signed-out visitors get a real server 307 → /sign-in (flight digest
 * NEXT_REDIRECT;replace;/sign-in;307;) instead of a hydrated redirect.
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

  return children;
}