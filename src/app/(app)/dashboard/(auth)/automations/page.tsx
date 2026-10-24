import { AutomationView } from "@/components/dashboard/views/automation-view";
import { requireDashboardUser } from "@/lib/require-dashboard-user";

/**
 * AutomationsPage — the canonical automations route (/dashboard/automations).
 * Renders the shared automation view; the old singular /dashboard/automation
 * route redirects here.
 */
export default function AutomationsPage() {
  await requireDashboardUser();
  return <AutomationView />;
}