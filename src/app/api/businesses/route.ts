import { getAuth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { businesses, users, aiSettings } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  const { userId } = await getAuth(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { name, slug, industry } = body;

    if (!name || !slug) {
      return NextResponse.json({ error: "Name and slug are required" }, { status: 400 });
    }

    // Check if business slug exists
    const existing = await db.select().from(businesses).where(eq(businesses.slug, slug));
    if (existing.length > 0) {
      return NextResponse.json({ error: "Business slug already exists" }, { status: 409 });
    }

    // Create business
    const [business] = await db.insert(businesses).values({
      name,
      slug,
      industry,
      subscriptionTier: "starter",
      subscriptionStatus: "active",
    }).returning();

    // Create user record
    await db.insert(users).values({
      clerkId: userId,
      businessId: business.id,
      email: body.email || "",
      role: "client_owner",
    });

    // Create default AI settings for business
    await db.insert(aiSettings).values({
      businessId: business.id,
    });

    return NextResponse.json({ business }, { status: 201 });
  } catch (error) {
    console.error("Error creating business:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}