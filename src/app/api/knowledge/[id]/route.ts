import { NextResponse } from "next/server";
import { db } from "@/db";
import { knowledgeDocument, business } from "@/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@clerk/nextjs/server";
import { ensureBusiness } from "@/lib/business";


export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const businessId = await ensureBusiness();
    if (!businessId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const [found] = await db.select().from(knowledgeDocument).where(eq(knowledgeDocument.id, id));
    if (!found || found.businessId !== businessId) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    await db.delete(knowledgeDocument).where(eq(knowledgeDocument.id, id));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete document:", error);
    return NextResponse.json({ error: "Failed to delete document" }, { status: 500 });
  }
}