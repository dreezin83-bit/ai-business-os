import { redirect } from "next/navigation";
import { requireDashboardUser } from "@/lib/require-dashboard-user";

/**
 * Legacy route — AI Commander was renamed to Sagenify Business Co-Pilot and
 * now lives at /dashboard/copilot. Redirect keeps old bookmarks/links alive.
 */
export default async function AiCommanderRedirect() {
  await requireDashboardUser();
  redirect("/dashboard/copilot");
}