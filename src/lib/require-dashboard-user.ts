import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

/**
 * Server-side dashboard auth guard — call as the FIRST line of any server
 * component that must be signed-in to render.
 *
 * The edge proxy (src/proxy.ts) runs on this stack but ALL of its redirects
 * are swallowed at the Next 16 / Turbopack boundary (protect(), raw
 * NextResponse.redirect, and layout redirects alike return 200 pass-through
 * with the dashboard shell for signed-out visitors — see shared
 * auth-guard-prod-verify-2026-10-24.md). Server-component redirects must
 * therefore execute INSIDE the render. Pages that are "use client" are
 * covered by the (auth) layout, which calls this same helper and is marked
 * force-dynamic so the guard branch can never be served from a generated
 * cached page.
 *
 * Signed-out → real server 307 to /sign-in (NEXT_REDIRECT digest).
 */
export async function requireDashboardUser(): Promise<void> {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }
}
