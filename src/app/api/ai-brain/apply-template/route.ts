/**
 * POST /api/ai-brain/apply-template — apply a category template to the current user's business
 */
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { business, aiBrainConfig, knowledgeDocument } from "@/db/schema";
import { eq } from "drizzle-orm";
import { generateId } from "@/lib/utils";
import { getTemplate } from "@/lib/ai-templates/index";

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { category?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { category } = body;
  if (!category) {
    return NextResponse.json(
      { error: "category is required" },
      { status: 400 }
    );
  }

  const template = getTemplate(category);
  if (!template) {
    return NextResponse.json(
      { error: `No template found for category: ${category}` },
      { status: 404 }
    );
  }

  // Find the user's business
  const [biz] = await db
    .select()
    .from(business)
    .where(eq(business.ownerId, userId))
    .limit(1);

  if (!biz) {
    return NextResponse.json(
      { error: "No business found for this user" },
      { status: 404 }
    );
  }

  // Upsert aiBrainConfig with template values
  const [existingConfig] = await db
    .select()
    .from(aiBrainConfig)
    .where(eq(aiBrainConfig.businessId, biz.id))
    .limit(1);

  const configValues = {
    businessId: biz.id,
    systemPrompt: template.systemPrompt,
    services: JSON.stringify(template.services),
    businessHours: JSON.stringify(template.businessHours),
    greetingMessage: template.greetingMessage,
    leadCollectionRules: template.leadCollectionRules,
    appointmentBookingRules: template.appointmentBookingRules,
    responseStyle: template.responseStyle,
    companyPolicies: template.pricingGuidance,
    updatedAt: new Date(),
  };

  if (existingConfig) {
    await db
      .update(aiBrainConfig)
      .set(configValues)
      .where(eq(aiBrainConfig.id, existingConfig.id));
  } else {
    await db.insert(aiBrainConfig).values({
      id: generateId(),
      ...configValues,
      serviceAreas: "[]",
      escalationRules: "",
    });
  }

  // Upsert knowledge base with template FAQs
  for (const faq of template.faqs) {
    const [existing] = await db
      .select()
      .from(knowledgeDocument)
      .where(eq(knowledgeDocument.businessId, biz.id))
      .limit(1);

    await db.insert(knowledgeDocument).values({
      id: generateId(),
      businessId: biz.id,
      title: faq.question,
      type: "faq",
      content: faq.answer,
      fileUrl: "",
    });
  }

  // Update business category
  await db
    .update(business)
    .set({ category, updatedAt: new Date() })
    .where(eq(business.id, biz.id));

  return NextResponse.json({
    success: true,
    category,
    template: template.label,
  });
}
