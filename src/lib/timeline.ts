/**
 * Status Timeline Service — append-only event log for billing and
 * Vapi provisioning milestones, surfaced to the business owner in the
 * dashboard (e.g. "Setup payment received", "AI phone number provisioned").
 *
 * Events are immutable audit records: once inserted they are never
 * updated. No dedup is needed — each call represents a real occurrence.
 */
import { db } from "@/db";
import { statusTimeline } from "@/db/schema";
import { generateId } from "@/lib/utils";

export type TimelineScope = "billing" | "provisioning";
export type TimelineStatus = "success" | "pending" | "failed" | "info";

export interface TimelineEventInput {
  businessId: string;
  scope: TimelineScope;
  event: string;
  detail?: string;
  status?: TimelineStatus;
}

/** Record a single timeline event for a business. Never throws. */
export async function recordTimelineEvent(
  input: TimelineEventInput,
): Promise<void> {
  try {
    await db.insert(statusTimeline).values({
      id: generateId(),
      businessId: input.businessId,
      scope: input.scope,
      event: input.event,
      detail: input.detail || "",
      status: input.status || "info",
    });
    console.log(
      `[timeline] ${input.scope}:${input.event} (${input.status || "info"}) business=${input.businessId}`,
    );
  } catch (err) {
    // Timeline recording must never break the primary flow.
    console.error("[timeline] Failed to record event:", err);
  }
}

/** Human-readable label for a timeline event (for UI display). */
export function timelineEventLabel(event: string): string {
  const labels: Record<string, string> = {
    setup_payment_received: "Setup payment received",
    setup_payment_failed: "Setup payment failed",
    subscription_created: "Subscription created",
    subscription_creation_failed: "Subscription setup failed",
    subscription_canceled: "Subscription canceled",
    provisioning_started: "Voice provisioning started",
    phone_number_bought: "AI phone number purchased",
    assistant_created: "AI assistant created",
    provisioning_completed: "Voice provisioning complete",
    provisioning_failed: "Voice provisioning failed",
  };
  return labels[event] || event.replace(/_/g, " ");
}
