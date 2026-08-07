/**
 * Human handoff / escalation helpers.
 *
 * The AI emits an [ESCALATE] marker when a customer needs a human
 * (asked for a person, has a complex issue, is frustrated, etc.).
 * Chat routes parse the marker and create a `handoff` record that
 * shows up in the business's escalation inbox for assignment/resolution.
 *
 * Marker format:
 *   [ESCALATE]::<reason>[|<summary>]
 *
 * reason  — short category, e.g. "customer requested human"
 * summary — optional; defaults to the last few conversation messages
 */
import { db } from "@/db";
import { handoff, type handoff as HandoffTable } from "@/db/schema";
import { eq } from "drizzle-orm";
import { generateId } from "@/lib/utils";

export const ESCALATE_MARKER = "ESCALATE";

export interface EscalateMarkerData {
  reason: string;
  summary: string;
}

/** Parse an [ESCALATE]::reason|summary marker out of AI output. */
export function parseEscalateMarker(text: string): EscalateMarkerData | null {
  const match = text.match(
    /\[ESCALATE\]::([^|\n]+)(?:\|([\s\S]*?))?(?=\s*(?:$|\[|\n))/,
  );
  if (!match) return null;
  const reason = match[1]?.trim() || "";
  if (!reason) return null;
  return {
    reason,
    summary: (match[2] || "").trim(),
  };
}

/** Remove the marker from a response before showing it to the customer. */
export function cleanEscalateMarker(text: string): string {
  return text.replace(/\[ESCALATE\]::[^\n]*/g, "").trim();
}

/** Build a fallback summary from the last N conversation messages. */
export function buildConversationSummary(
  history: Array<{ role: string; content: string }>,
  maxMessages = 4,
): string {
  return history
    .slice(-maxMessages)
    .map((m) => `${m.role}: ${m.content.substring(0, 120)}`)
    .join(" | ")
    .substring(0, 1000);
}

export interface CreateHandoffInput {
  businessId: string;
  leadId?: string | null;
  conversationId?: string | null;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  reason: string;
  summary?: string;
  priority?: "normal" | "high";
}

/**
 * Create a handoff (escalation) record. Dedupes active handoffs for the
 * same conversation to avoid flooding the inbox with repeats.
 * Returns the created/updated handoff row, or null on failure.
 */
export async function createHandoff(
  input: CreateHandoffInput,
): Promise<typeof HandoffTable.$inferSelect | null> {
  try {
    // Dedupe: if there's already a non-resolved handoff for this
    // conversation, update its summary/reason instead of inserting a twin.
    if (input.conversationId) {
      const [existing] = await db
        .select()
        .from(handoff)
        .where(eq(handoff.conversationId, input.conversationId))
        .limit(1);
      if (existing && existing.status !== "resolved") {
        await db
          .update(handoff)
          .set({
            reason: input.reason || existing.reason,
            summary: input.summary || existing.summary,
            priority: input.priority || existing.priority || "normal",
            updatedAt: new Date(),
          })
          .where(eq(handoff.id, existing.id));
        const [updated] = await db
          .select()
          .from(handoff)
          .where(eq(handoff.id, existing.id));
        return updated;
      }
    }

    const id = generateId();
    const now = new Date();
    const row = {
      id,
      businessId: input.businessId,
      leadId: input.leadId ?? null,
      conversationId: input.conversationId ?? null,
      customerName: input.customerName || "",
      customerPhone: input.customerPhone || "",
      customerEmail: input.customerEmail || "",
      reason: input.reason,
      summary: input.summary || "",
      assignedTo: "",
      status: "pending",
      priority: input.priority || "normal",
      notes: "",
      createdAt: now,
      updatedAt: now,
      resolvedAt: null,
    };
    await db.insert(handoff).values(row);
    console.log(
      `[handoff] Created handoff ${id} for business ${input.businessId} (${input.reason})`,
    );
    return row;
  } catch (err) {
    console.error("[handoff] Failed to create handoff:", err);
    return null;
  }
}
