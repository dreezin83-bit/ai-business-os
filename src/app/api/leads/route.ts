import { NextResponse } from "next/server";
import { db } from "@/db";
import { lead } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { ensureBusiness } from "@/lib/business";
import { generateId } from "@/lib/utils";

export async function GET() {
  try {
    const businessId = await ensureBusiness();
    if (!businessId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const leads = await db.select().from(lead).where(eq(lead.businessId, businessId)).orderBy(desc(lead.createdAt));
    return NextResponse.json(leads);
  } catch (error) {
    console.error("Failed to fetch leads:", error);
    return NextResponse.json({ error: "Failed to fetch leads" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const businessId = await ensureBusiness();
    if (!businessId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { name, phone, email, serviceRequest, source } = body;

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const newLead = {
      id: generateId(),
      businessId,
      name,
      phone: phone || "",
      email: email || "",
      serviceRequest: serviceRequest || "",
      source: source || "manual",
      status: "new",
      notes: "",
    };

    await db.insert(lead).values(newLead);
    return NextResponse.json(newLead, { status: 201 });
  } catch (error) {
    console.error("Failed to create lead:", error);
    return NextResponse.json({ error: "Failed to create lead" }, { status: 500 });
  }
}