import { NextResponse } from "next/server";
import { db } from "@/db";
import { lead, conversation, message } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { auth } from "@clerk/nextjs/server";
import { ensureBusiness } from "@/lib/business";


export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const businessId = await ensureBusiness();
    if (!businessId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const [found] = await db.select().from(lead).where(eq(lead.id, id));
    if (!found || found.businessId !== businessId) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    // Get conversations for this lead
    const conversations = await db
      .select()
      .from(conversation)
      .where(eq(conversation.leadId, id))
      .orderBy(desc(conversation.createdAt));

    const conversationsWithMessages = await Promise.all(
      conversations.map(async (c) => {
        const messages = await db
          .select()
          .from(message)
          .where(eq(message.conversationId, c.id))
          .orderBy(desc(message.createdAt));
        return { ...c, messages };
      })
    );

    return NextResponse.json({ ...found, conversations: conversationsWithMessages });
  } catch (error) {
    console.error("Failed to fetch lead:", error);
    return NextResponse.json({ error: "Failed to fetch lead" }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const businessId = await ensureBusiness();
    if (!businessId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const [found] = await db.select().from(lead).where(eq(lead.id, id));
    if (!found || found.businessId !== businessId) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    const body = await request.json();
    const updates: Record<string, string> = {};
    if (body.name !== undefined) updates.name = body.name;
    if (body.phone !== undefined) updates.phone = body.phone;
    if (body.email !== undefined) updates.email = body.email;
    if (body.serviceRequest !== undefined) updates.serviceRequest = body.serviceRequest;
    if (body.status !== undefined) updates.status = body.status;
    if (body.notes !== undefined) updates.notes = body.notes;

    await db.update(lead).set(updates).where(eq(lead.id, id));
    const [updated] = await db.select().from(lead).where(eq(lead.id, id));
    return NextResponse.json(updated);
  } catch (error) {
    console.error("Failed to update lead:", error);
    return NextResponse.json({ error: "Failed to update lead" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const businessId = await ensureBusiness();
    if (!businessId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const [found] = await db.select().from(lead).where(eq(lead.id, id));
    if (!found || found.businessId !== businessId) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    await db.delete(lead).where(eq(lead.id, id));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete lead:", error);
    return NextResponse.json({ error: "Failed to delete lead" }, { status: 500 });
  }
}