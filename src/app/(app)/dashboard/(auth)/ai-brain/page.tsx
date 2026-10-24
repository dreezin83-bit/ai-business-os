"use client";

import { Bot } from "lucide-react";
import { AiBrainView } from "@/components/dashboard/views/ai-brain-view";

/**
 * AiBrainPage — standalone AI Brain /dashboard/ai-brain page.
 * The view carries its own tabs (Business Profile, Knowledge Base, Behavior
 * with tone sliders/toggles, Channels) and its own save flow.
 */
export default function AiBrainPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight dash-heading">
          <Bot className="h-6 w-6" /> AI Brain
        </h1>
        <p className="mt-1 text-sm dash-muted">
          Tune your AI&apos;s tone and behavior, manage what it knows about
          your business, and control how it talks to customers.
        </p>
      </div>
      <AiBrainView />
    </div>
  );
}