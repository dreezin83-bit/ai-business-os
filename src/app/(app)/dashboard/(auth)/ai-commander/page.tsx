import { redirect } from "next/navigation";
import { requireDashboardUser } from "@/lib/require-dashboard-user";

/**
 * Legacy route — AI Commander was renamed to Sagenify Business Co-Pilot and
 * now lives at /dashboard/copilot.
 *
 * The PRIMARY redirect for this alias is edge-level: see
 * LEGACY_ROUTE_REDIRECTS in src/proxy.ts. A server redirect() thrown from a
 * page is swallowed at the response boundary on this stack (empty-frame risk),
 * so the proxy emits the 307 before this component ever renders. What remains
 * here is a fallback net only — it should be unreachable in normal operation.
 */
export default async function AiCommanderRedirect() {
  await requireDashboardUser();
  redirect("/dashboard/copilot");
}
