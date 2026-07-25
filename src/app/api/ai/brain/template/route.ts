import { NextResponse } from "next/server";
import { db } from "@/db";
import { aiBrainConfig } from "@/db/schema";
import { eq } from "drizzle-orm";
import { ensureBusiness } from "@/lib/business";
import { generateId } from "@/lib/utils";
import { getTemplate } from "@/lib/industry-templates";

export async function POST(request: Request) {
  try {
    const businessId = await ensureBusiness();
    if (!businessId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { templateId } = await request.json();
    const template = getTemplate(templateId);
    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    const data = {
      systemPrompt: template.systemPrompt,
      businessInfo: template.businessInfo,
      services: JSON.stringify(template.services),
      faqs: JSON.stringify(template.faqs),
      pricingGuidance: template.pricingGuidance,
      companyPolicies: template.companyPolicies,
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
      greetingMessage: template.greetingMessage,
      leadCollectionRules: template.leadCollectionRules,
      appointmentBookingRules: "",
      responseStyle: template.responseStyle,
      escalationRules: "",
    };

    const [existing] = await db.select().from(aiBrainConfig).where(eq(aiBrainConfig.businessId, businessId));
    if (existing) {
      await db.update(aiBrainConfig).set(data).where(eq(aiBrainConfig.businessId, businessId));
    } else {
      await db.insert(aiBrainConfig).values({ id: generateId(), businessId, ...data });
    }

    const [config] = await db.select().from(aiBrainConfig).where(eq(aiBrainConfig.businessId, businessId));
    return NextResponse.json(config);
  } catch (error) {
    console.error("Failed to apply template:", error);
    return NextResponse.json({ error: "Failed to apply template" }, { status: 500 });
  }
}