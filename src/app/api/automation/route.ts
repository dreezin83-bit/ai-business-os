import { NextResponse } from "next/server";
import { db } from "@/db";
import { automationRule, missedCall, business } from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { auth } from "@clerk/nextjs/server";
import { ensureBusiness } from "@/lib/business";
import { generateId } from "@/lib/utils";


export async function GET() {
  try {
    const businessId = await ensureBusiness();
    if (!businessId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const [rules, missedCalls] = await Promise.all([
      db.select().from(automationRule).where(eq(automationRule.businessId, businessId)),
      db.select().from(missedCall).where(eq(missedCall.businessId, businessId)).orderBy(desc(missedCall.calledAt)),
    ]);

    return NextResponse.json({ rules, missedCalls });
  } catch (error) {
    console.error("Failed to fetch automation data:", error);
    return NextResponse.json({ error: "Failed to fetch automation data" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const businessId = await ensureBusiness();
    if (!businessId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { type, messageTemplate, channel, delayMinutes, enabled } = body;

    // Check if rule exists for this type
    const [existing] = await db
      .select()
      .from(automationRule)
      .where(and(eq(automationRule.businessId, businessId), eq(automationRule.type, type)));

    if (existing) {
      await db
        .update(automationRule)
        .set({
          messageTemplate: messageTemplate || existing.messageTemplate,
          channel: channel || existing.channel,
          delayMinutes: delayMinutes !== undefined ? delayMinutes : existing.delayMinutes,
          enabled: enabled !== undefined ? enabled : existing.enabled,
        })
        .where(eq(automationRule.id, existing.id));

      const [updated] = await db.select().from(automationRule).where(eq(automationRule.id, existing.id));
      return NextResponse.json(updated);
    }

    const rule = {
      id: generateId(),
      businessId,
      type,
      messageTemplate: messageTemplate || "",
      channel: channel || "sms",
      delayMinutes: delayMinutes || 0,
      enabled: enabled !== undefined ? enabled : true,
    };

    await db.insert(automationRule).values(rule);
    return NextResponse.json(rule, { status: 201 });
  } catch (error) {
    console.error("Failed to save automation rule:", error);
    return NextResponse.json({ error: "Failed to save automation rule" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const businessId = await ensureBusiness();
    if (!businessId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { id, enabled } = body;

    const [found] = await db.select().from(automationRule).where(eq(automationRule.id, id));
    if (!found || found.businessId !== businessId) {
      return NextResponse.json({ error: "Rule not found" }, { status: 404 });
    }

    await db.update(automationRule).set({ enabled }).where(eq(automationRule.id, id));
    const [updated] = await db.select().from(automationRule).where(eq(automationRule.id, id));
    return NextResponse.json(updated);
  } catch (error) {
    console.error("Failed to update rule:", error);
    return NextResponse.json({ error: "Failed to update rule" }, { status: 500 });
  }
}