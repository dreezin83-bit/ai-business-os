import { NextResponse } from "next/server";
import { db } from "@/db";
import { lead } from "@/db/schema";
import { eq, desc, lt } from "drizzle-orm";
import { ensureBusiness } from "@/lib/business";
import { generateId } from "@/lib/utils";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

export async function GET(request: Request) {
  try {
    const businessId = await ensureBusiness();
    if (!businessId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const limit = Math.min(Number(searchParams.get("limit")) || DEFAULT_LIMIT, MAX_LIMIT);
    const cursor = searchParams.get("cursor"); // id of last item from previous page

    const baseConditions = [eq(lead.businessId, businessId)];
    if (cursor) baseConditions.push(lt(lead.id, cursor));

    const leads = await db
      .select({
        id: lead.id,
        name: lead.name,
        phone: lead.phone,
        email: lead.email,
        serviceRequest: lead.serviceRequest,
        source: lead.source,
        status: lead.status,
        notes: lead.notes,
        preferredMethod: lead.preferredMethod,
        contactValue: lead.contactValue,
        createdAt: lead.createdAt,
        updatedAt: lead.updatedAt,
      })
      .from(lead)
      .where(eq(lead.businessId, businessId))
      .orderBy(desc(lead.createdAt))
      .limit(limit + 1); // Fetch one extra to detect next page

    const hasMore = leads.length > limit;
    if (hasMore) leads.pop();

    return NextResponse.json({
      leads,
      hasMore,
      nextCursor: hasMore ? leads[leads.length - 1]?.id : null,
    });
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