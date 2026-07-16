import { NextResponse } from "next/server";
import { db } from "@/db";
import { conversation, message, business } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { auth } from "@clerk/nextjs/server";
import { ensureBusiness } from "@/lib/business";


export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const businessId = await ensureBusiness();
    if (!businessId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const [conv] = await db.select().from(conversation).where(eq(conversation.id, id));
    if (!conv || conv.businessId !== businessId) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    const messages = await db
      .select()
      .from(message)
      .where(eq(message.conversationId, id))
      .orderBy(desc(message.createdAt));

    return NextResponse.json({ ...conv, messages });
  } catch (error) {
    console.error("Failed to fetch conversation:", error);
    return NextResponse.json({ error: "Failed to fetch conversation" }, { status: 500 });
  }
}