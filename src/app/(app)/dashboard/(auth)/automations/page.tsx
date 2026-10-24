import { AutomationView } from "@/components/dashboard/views/automation-view";

/**
 * AutomationsPage — the canonical automations route (/dashboard/automations).
 * Renders the shared automation view; the old singular /dashboard/automation
 * route redirects here.
 */
export default function AutomationsPage() {
  return <AutomationView />;
}