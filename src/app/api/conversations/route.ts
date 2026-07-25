import { NextResponse } from "next/server";
import { db } from "@/db";
import { conversation, message, business, lead } from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { auth } from "@clerk/nextjs/server";
import { ensureBusiness } from "@/lib/business";
import { generateId } from "@/lib/utils";

export async function GET(request: Request) {
  try {
    const businessId = await ensureBusiness();
    if (!businessId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const leadId = searchParams.get("leadId");

    // If leadId provided, get conversations linked to that lead with messages
    if (leadId) {
      const conversations = await db
        .select()
        .from(conversation)
        .where(
          and(
            eq(conversation.businessId, businessId),
            eq(conversation.leadId, leadId)
          )
        )
        .orderBy(desc(conversation.createdAt));

      // Fetch messages for each conversation
      const result = await Promise.all(
        conversations.map(async (conv) => {
          const messages = await db
            .select()
            .from(message)
            .where(eq(message.conversationId, conv.id))
            .orderBy(message.createdAt);
          return { ...conv, messages };
        })
      );

      return NextResponse.json(result);
    }

    // Otherwise return all conversations for the business
    const conversations = await db
      .select()
      .from(conversation)
      .where(eq(conversation.businessId, businessId))
      .orderBy(desc(conversation.createdAt));
    return NextResponse.json(conversations);
  } catch (error) {
    console.error("Failed to fetch conversations:", error);
    return NextResponse.json({ error: "Failed to fetch conversations" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const businessId = await ensureBusiness();
    if (!businessId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const newConversation = {
      id: generateId(),
      businessId,
      leadId: body.leadId || null,
      customerName: body.customerName || "",
      customerPhone: body.customerPhone || "",
      customerEmail: body.customerEmail || "",
      source: body.source || "manual",
      status: "active",
    };

    await db.insert(conversation).values(newConversation);
    return NextResponse.json(newConversation, { status: 201 });
  } catch (error) {
    console.error("Failed to create conversation:", error);
    return NextResponse.json({ error: "Failed to create conversation" }, { status: 500 });
  }
}