"use client";

import { Terminal } from "lucide-react";
import { AiCommanderView } from "@/components/dashboard/views/ai-commander-view";

/**
 * CopilotPage — the Sagenify Business Co-Pilot workspace
 * (/dashboard/copilot). Formerly "AI Commander": a ChatGPT-like workspace
 * that answers with the business's own context (leads, appointments, AI
 * Brain knowledge). The header chrome lives inside AiCommanderView itself so
 * the chat surface keeps full height; this page adds the route heading only.
 */
export default function CopilotPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight dash-heading">
          <Terminal className="h-6 w-6" /> Sagenify Business Co-Pilot
        </h1>
        <p className="mt-1 text-sm dash-muted">
          Ask your business anything — your Co-Pilot answers from your leads,
          appointments, and knowledge base.
        </p>
      </div>
      <AiCommanderView />
    </div>
  );
}