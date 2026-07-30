import { NextResponse } from "next/server";
import { db } from "@/db";
import { aiBrainConfig, business } from "@/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@clerk/nextjs/server";
import { ensureBusiness } from "@/lib/business";
import { generateId } from "@/lib/utils";
import { invalidateAiContextCache } from "@/lib/ai-context-cache";


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
        businessHours: JSON.stringify([
          { day: "Monday", open: "09:00", close: "17:00", closed: false },
          { day: "Tuesday", open: "09:00", close: "17:00", closed: false },
          { day: "Wednesday", open: "09:00", close: "17:00", closed: false },
          { day: "Thursday", open: "09:00", close: "17:00", closed: false },
          { day: "Friday", open: "09:00", close: "17:00", closed: false },
          { day: "Saturday", open: "10:00", close: "15:00", closed: false },
          { day: "Sunday", open: "", close: "", closed: true },
        ]),
        greetingMessage: "Hello! How can I help you today?",
        leadCollectionRules: "",
        appointmentBookingRules: "",
        responseStyle: "",
        escalationRules: "",
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
      businessHours: body.businessHours || JSON.stringify([
        { day: "Monday", open: "09:00", close: "17:00", closed: false },
        { day: "Tuesday", open: "09:00", close: "17:00", closed: false },
        { day: "Wednesday", open: "09:00", close: "17:00", closed: false },
        { day: "Thursday", open: "09:00", close: "17:00", closed: false },
        { day: "Friday", open: "09:00", close: "17:00", closed: false },
        { day: "Saturday", open: "10:00", close: "15:00", closed: false },
        { day: "Sunday", open: "", close: "", closed: true },
      ]),
      greetingMessage: body.greetingMessage || "Hello! How can I help you today?",
      leadCollectionRules: body.leadCollectionRules || "",
      appointmentBookingRules: body.appointmentBookingRules || "",
      responseStyle: body.responseStyle || "",
      escalationRules: body.escalationRules || "",
    };

    if (existing) {
      await db.update(aiBrainConfig).set(data).where(eq(aiBrainConfig.businessId, businessId));
    } else {
      await db.insert(aiBrainConfig).values({ id: generateId(), businessId, ...data });
    }

    // Invalidate cached AI context so next request gets fresh config
    invalidateAiContextCache(businessId);

    // Return the data we just saved — no need to re-query
    return NextResponse.json({ id: existing?.id || generateId(), businessId, ...data });
  } catch (error) {
    console.error("Failed to save AI brain config:", error);
    return NextResponse.json({ error: "Failed to save config" }, { status: 500 });
  }
}