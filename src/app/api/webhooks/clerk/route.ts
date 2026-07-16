import { NextResponse } from "next/server";
import { db } from "@/db";
import { business, aiBrainConfig } from "@/db/schema";
import { eq } from "drizzle-orm";
import { generateId } from "@/lib/utils";

// Clerk webhook for user.created event
export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Verify it's a user.created event
    if (body.type !== "user.created") {
      return NextResponse.json({ received: true });
    }

    const { id, email_addresses, phone_numbers, first_name, last_name } = body.data || {};
    if (!id) {
      return NextResponse.json({ error: "Missing user ID" }, { status: 400 });
    }

    const name = [first_name, last_name].filter(Boolean).join(" ") || email_addresses?.[0]?.email_address || "Business Owner";
    const email = email_addresses?.[0]?.email_address || "";
    const phone = phone_numbers?.[0]?.phone_number || "";

    // Check if business already exists for this user
    const [existing] = await db.select().from(business).where(eq(business.ownerId, id));
    if (existing) {
      return NextResponse.json({ business: existing });
    }

    // Create business
    const businessId = generateId();
    const newBusiness = {
      id: businessId,
      name: name + "'s Business",
      ownerId: id,
      phone,
      email,
      website: "",
      address: "",
    };

    await db.insert(business).values(newBusiness);

    // Create default AI brain config
    await db.insert(aiBrainConfig).values({
      id: generateId(),
      businessId,
      systemPrompt: "You are a helpful assistant for a service business. Answer questions about services, pricing, and scheduling.",
      businessInfo: "",
      services: "[]",
      faqs: "[]",
      pricingGuidance: "",
      companyPolicies: "",
      serviceAreas: "[]",
      businessHours: "{}",
      greetingMessage: "Hello! How can I help you today?",
    });

    return NextResponse.json({ business: newBusiness });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}