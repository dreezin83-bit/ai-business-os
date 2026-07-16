import { NextResponse } from "next/server";
import { db } from "@/db";
import { aiBrainConfig, business } from "@/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@clerk/nextjs/server";
import { ensureBusiness } from "@/lib/business";
import { generateId } from "@/lib/utils";


export async function GET() {
  try {
    const businessId = await ensureBusiness();
    if (!businessId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const [config] = await db.select().from(aiBrainConfig).where(eq(aiBrainConfig.businessId, businessId));
    if (!config) {
      return NextResponse.json({
        id: "",
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
    }
    return NextResponse.json(config);
  } catch (error) {
    console.error("Failed to fetch AI brain config:", error);
    return NextResponse.json({ error: "Failed to fetch config" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const businessId = await ensureBusiness();
    if (!businessId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const [existing] = await db.select().from(aiBrainConfig).where(eq(aiBrainConfig.businessId, businessId));

    const data = {
      systemPrompt: body.systemPrompt || "",
      businessInfo: body.businessInfo || "",
      services: body.services || "[]",
      faqs: body.faqs || "[]",
      pricingGuidance: body.pricingGuidance || "",
      companyPolicies: body.companyPolicies || "",
      serviceAreas: body.serviceAreas || "[]",
      businessHours: body.businessHours || "{}",
      greetingMessage: body.greetingMessage || "Hello! How can I help you today?",
    };

    if (existing) {
      await db.update(aiBrainConfig).set(data).where(eq(aiBrainConfig.businessId, businessId));
    } else {
      await db.insert(aiBrainConfig).values({ id: generateId(), businessId, ...data });
    }

    const [config] = await db.select().from(aiBrainConfig).where(eq(aiBrainConfig.businessId, businessId));
    return NextResponse.json(config);
  } catch (error) {
    console.error("Failed to save AI brain config:", error);
    return NextResponse.json({ error: "Failed to save config" }, { status: 500 });
  }
}