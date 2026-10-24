"use client";

import { useState } from "react";
import { Mail, MessageCircle, MessageSquare, PhoneMissed } from "lucide-react";
import { PageTabs } from "@/components/dashboard/page-tabs";
import { ChatbotView } from "@/components/dashboard/views/chatbot-view";
import { MessagesView } from "@/components/dashboard/views/messages-view";
import { CommunicationSettingsView } from "@/components/dashboard/views/communication-settings-view";
import { MissedCallsView } from "@/components/dashboard/views/missed-calls-view";

const TABS = [
  { id: "chatbot", label: "Chatbot", icon: MessageSquare },
  { id: "messages", label: "Messages", icon: Mail },
  { id: "communication", label: "Communication", icon: MessageCircle },
  { id: "missed-calls", label: "Missed Calls", icon: PhoneMissed },
] as const;

type TabId = (typeof TABS)[number]["id"];

/**
 * CommunicationsPage — unified Inbox & Calls tab view combining the former
 * Chatbot, Messages, Communication and Missed Calls pages. Each tab mounts
 * the shared extracted view so the old routes keep working untouched.
 */
export default function CommunicationsPage() {
  const [active, setActive] = useState<TabId>("chatbot");

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight dash-heading">
          Inbox &amp; Calls
        </h1>
        <p className="mt-1 text-sm dash-muted">
          Every customer conversation — chat, email, follow-ups and missed
          calls — in one place.
        </p>
      </div>

      <PageTabs tabs={TABS} active={active} onChange={setActive} />

      {active === "chatbot" && <ChatbotView />}
      {active === "messages" && <MessagesView />}
      {active === "communication" && <CommunicationSettingsView />}
      {active === "missed-calls" && <MissedCallsView />}
    </div>
  );
}