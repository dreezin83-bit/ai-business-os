import { redirect } from "next/navigation";

/**
 * Legacy singular route — the canonical automations route is now plural
 * (/dashboard/automations). Server-side redirect so any old bookmarks or
 * links keep working without a dead end.
 */
export default function AutomationRedirect() {
  redirect("/dashboard/automations");
}