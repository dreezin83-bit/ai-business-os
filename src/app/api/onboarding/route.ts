/**
 * POST /api/onboarding — save onboarding data for the current user's business.
 *
 * Creates a business record if one doesn't exist yet (first-time signup flow).
 * Applies AI Brain template defaults based on the selected category.
 */
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { business, aiBrainConfig, knowledgeDocument } from "@/db/schema";
import { eq } from "drizzle-orm";
import { generateId } from "@/lib/utils";
import { getTemplate } from "@/lib/ai-templates/index";
import { invalidateAiContextCache } from "@/lib/ai-context-cache";
import { canProvisionVoice, provisionVapiVoice } from "@/lib/vapi-provisioning";

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, any>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const {
    businessName,
    category,
    phone,
    serviceArea,
    businessHours,
    website,
    email,
    // Page sends these field names (not servicesOffered/greeting/knowledgeContent):
    services: servicesRaw,
    servicesOffered,
    greeting: greetingRaw,
    greetingMessage: greetingMessageRaw,
    knowledgeContent,
    knowledgeItems,
    emergencyAvailable: _emergencyAvailable,
    emergencyNote: _emergencyNote,
    emergencyService,
  } = body;

  // Resolve aliased fields — page may send either name
  const services = servicesOffered ?? servicesRaw ?? emergencyService;
  const greetingMessage = greetingRaw ?? greetingMessageRaw;
  const knowledgeItemsResolved = knowledgeContent ?? knowledgeItems;

  // Load template if category is provided
  const template = category ? getTemplate(category) : undefined;

  // ── Find or create the business ─────────────────────────────
  let [biz] = await db
    .select()
    .from(business)
    .where(eq(business.ownerId, userId))
    .limit(1);

  if (!biz) {
    // First-time signup — create business record
    const bizId = generateId();
    await db.insert(business).values({
      id: bizId,
      ownerId: userId,
      name: businessName || template?.label || "",
      category: category || "other",
      phone: phone || "",
      email: email || "",
      website: website || "",
      address: serviceArea || "",
      onboardingComplete: true,
      updatedAt: new Date(),
    });
    biz = { id: bizId } as typeof business.$inferSelect;
  } else {
    // Update existing business
    const updateData: Record<string, any> = {
      updatedAt: new Date(),
      onboardingComplete: true,
    };
    if (businessName !== undefined) updateData.name = businessName;
    if (category !== undefined) updateData.category = category;
    if (phone !== undefined) updateData.phone = phone;
    if (website !== undefined) updateData.website = website;
    if (email !== undefined) updateData.email = email;
    if (serviceArea !== undefined) updateData.address = serviceArea;

    await db.update(business).set(updateData).where(eq(business.id, biz.id));
  }

  // ── Upsert aiBrainConfig with template defaults ─────────────
  const [existingConfig] = await db
    .select()
    .from(aiBrainConfig)
    .where(eq(aiBrainConfig.businessId, biz.id))
    .limit(1);

  // Start with template defaults, then override with user-provided values
  const servicesValue = services !== undefined
    ? (Array.isArray(services) ? JSON.stringify(services) : services)
    : template ? JSON.stringify(template.services) : "[]";

  const businessHoursValue = businessHours !== undefined
    ? (typeof businessHours === "object" ? JSON.stringify(businessHours) : businessHours)
    : template ? JSON.stringify(template.businessHours) : "{}";

  const greetingValue = greetingMessage !== undefined
    ? greetingMessage
    : template?.greetingMessage ?? "Hello! How can I help you today?";

  const serviceAreaValue = serviceArea !== undefined
    ? (typeof serviceArea === "string" ? serviceArea : JSON.stringify(serviceArea))
    : existingConfig?.serviceAreas ?? "[]";

  if (existingConfig) {
    await db
      .update(aiBrainConfig)
      .set({
        businessId: biz.id,
        services: servicesValue,
        businessHours: businessHoursValue,
        greetingMessage: greetingValue,
        serviceAreas: serviceAreaValue,
        systemPrompt: template?.systemPrompt ?? existingConfig.systemPrompt ?? "",
        leadCollectionRules: template?.leadCollectionRules ?? existingConfig.leadCollectionRules ?? "",
        appointmentBookingRules: template?.appointmentBookingRules ?? existingConfig.appointmentBookingRules ?? "",
        responseStyle: template?.responseStyle ?? existingConfig.responseStyle ?? "",
        companyPolicies: template?.pricingGuidance ?? existingConfig.companyPolicies ?? "",
        escalationRules: existingConfig?.escalationRules ?? "",
        updatedAt: new Date(),
      })
      .where(eq(aiBrainConfig.id, existingConfig.id));
  } else {
    await db.insert(aiBrainConfig).values({
      id: generateId(),
      businessId: biz.id,
      systemPrompt: template?.systemPrompt ?? "",
      services: servicesValue,
      businessHours: businessHoursValue,
      greetingMessage: greetingValue,
      serviceAreas: serviceAreaValue,
      leadCollectionRules: template?.leadCollectionRules ?? "",
      appointmentBookingRules: template?.appointmentBookingRules ?? "",
      responseStyle: template?.responseStyle ?? "",
      companyPolicies: template?.pricingGuidance ?? "",
      escalationRules: "",
    });
  }

  // ── Save knowledge base items (user-provided or template FAQs) ──
  const itemsToSave: { title: string; content: string; type: string }[] = [];

  if (knowledgeItemsResolved) {
    if (Array.isArray(knowledgeItemsResolved) && knowledgeItemsResolved.length > 0) {
      for (const item of knowledgeItemsResolved) {
        if (item.title && item.content) {
          itemsToSave.push({
            title: item.title,
            content: item.content,
            type: item.type || "txt",
          });
        }
      }
    } else if (typeof knowledgeItemsResolved === "string" && knowledgeItemsResolved.trim()) {
      // Page sends knowledgeContent as a plain text string — create a single doc
      itemsToSave.push({
        title: "Knowledge Base Content",
        content: knowledgeItemsResolved.trim(),
        type: "txt",
      });
    }
  } else if (template && template.faqs.length > 0 && !existingConfig) {
    // On first onboarding, auto-create knowledge docs from template FAQs
    for (const faq of template.faqs) {
      itemsToSave.push({
        title: faq.question,
        content: faq.answer,
        type: "faq",
      });
    }
  }

  for (const item of itemsToSave) {
    await db.insert(knowledgeDocument).values({
      id: generateId(),
      businessId: biz.id,
      title: item.title,
      type: item.type,
      content: item.content,
      fileUrl: "",
    });
  }

  // Invalidate cache — onboarding changed business + AI config
  invalidateAiContextCache(biz.id);

  // ── Trigger Vapi provisioning if subscription is active ──
  const ready = await canProvisionVoice(biz.id);
  if (ready) {
    console.log(`[onboarding] Business ${biz.id} ready — triggering voice provisioning`);
    provisionVapiVoice(biz.id)
      .then((result) => {
        console.log(`[onboarding] Voice provisioning for ${biz.id}: ${result.success ? "SUCCESS" : "FAILED — " + result.error}`);
      })
      .catch((err) => {
        console.error(`[onboarding] Voice provisioning threw for ${biz.id}:`, err);
      });
  }

  return NextResponse.json({
    success: true,
    onboardingComplete: true,
    category: category || "other",
    templateApplied: !!template,
  });
}
