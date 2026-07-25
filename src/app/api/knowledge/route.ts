import { NextResponse } from "next/server";
import { db } from "@/db";
import { knowledgeDocument, business } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { auth } from "@clerk/nextjs/server";
import { ensureBusiness } from "@/lib/business";
import { generateId } from "@/lib/utils";


export async function GET() {
  try {
    const businessId = await ensureBusiness();
    if (!businessId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const docs = await db
      .select()
      .from(knowledgeDocument)
      .where(eq(knowledgeDocument.businessId, businessId))
      .orderBy(desc(knowledgeDocument.createdAt));
    return NextResponse.json(docs);
  } catch (error) {
    console.error("Failed to fetch documents:", error);
    return NextResponse.json({ error: "Failed to fetch documents" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const businessId = await ensureBusiness();
    if (!businessId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { title, type, content, fileUrl } = body;

    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    const doc = {
      id: generateId(),
      businessId,
      title,
      type: type || "txt",
      content: content || "",
      fileUrl: fileUrl || "",
    };

    await db.insert(knowledgeDocument).values(doc);
    return NextResponse.json(doc, { status: 201 });
  } catch (error) {
    console.error("Failed to create document:", error);
    return NextResponse.json({ error: "Failed to create document" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const businessId = await ensureBusiness();
    if (!businessId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    // Verify the document belongs to this business
    const [doc] = await db.select().from(knowledgeDocument).where(eq(knowledgeDocument.id, id));
    if (!doc || doc.businessId !== businessId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await db.delete(knowledgeDocument).where(eq(knowledgeDocument.id, id));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete document:", error);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}