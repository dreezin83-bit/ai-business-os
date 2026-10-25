import { redirect } from "next/navigation";
import { requireDashboardUser } from "@/lib/require-dashboard-user";

/**
 * Legacy singular route — the canonical automations route is now plural
 * (/dashboard/automations). Server-side redirect so any old bookmarks or
 * links keep working without a dead end.
 */
export default async function AutomationRedirect() {
  await requireDashboardUser();
  redirect("/dashboard/automations");
}