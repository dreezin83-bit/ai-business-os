import { redirect } from "next/navigation";

/**
 * Legacy route — AI Commander was renamed to Sagenify Business Co-Pilot and
 * now lives at /dashboard/copilot. Redirect keeps old bookmarks/links alive.
 */
export default function AiCommanderRedirect() {
  redirect("/dashboard/copilot");
}