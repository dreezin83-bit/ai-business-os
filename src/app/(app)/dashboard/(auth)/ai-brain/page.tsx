"use client";

import { useState } from "react";
import { BookOpen, Bot, Terminal } from "lucide-react";
import { PageTabs } from "@/components/dashboard/page-tabs";
import { AiCommanderView } from "@/components/dashboard/views/ai-commander-view";
import { AiBrainView } from "@/components/dashboard/views/ai-brain-view";
import { KnowledgeBaseView } from "@/components/dashboard/views/knowledge-base-view";

const TABS = [
  { id: "ai-commander", label: "AI Commander", icon: Terminal },
  { id: "ai-brain", label: "AI Brain", icon: Bot },
  { id: "knowledge-base", label: "Knowledge Base", icon: BookOpen },
] as const;

type TabId = (typeof TABS)[number]["id"];

/**
 * AiBrainPage — unified AI Brain & Knowledge Base tab view combining the
 * former AI Commander, AI Brain and Knowledge Base pages. Each tab mounts the
 * shared extracted view so the old routes keep working untouched.
 */
export default function AiBrainPage() {
  const [active, setActive] = useState<TabId>("ai-brain");

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight dash-heading">
          AI Brain &amp; Knowledge Base
        </h1>
        <p className="mt-1 text-sm dash-muted">
          Command your AI, tune its tone and behavior, and manage everything
          it knows about your business.
        </p>
      </div>

      <PageTabs tabs={TABS} active={active} onChange={setActive} />

      {active === "ai-commander" && <AiCommanderView />}
      {active === "ai-brain" && <AiBrainView />}
      {active === "knowledge-base" && <KnowledgeBaseView />}
    </div>
  );
}