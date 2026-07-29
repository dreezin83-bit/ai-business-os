/**
 * POST /api/onboarding — save onboarding data for the current user's business
 *
 * Saves all fields and marks business.onboardingComplete = true.
 * Expects the user to have exactly one business (created at sign-up).
 */
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { business, aiBrainConfig, knowledgeDocument } from "@/db/schema";
import { eq } from "drizzle-orm";
import { generateId } from "@/lib/utils";

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Find the user's business (assumes one-to-one for now)
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
    services,
    emergencyService,
    greetingMessage,
    knowledgeItems,
  } = body;

  // ── Update business table ──────────────────────────────────
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

  // ── Upsert aiBrainConfig ───────────────────────────────────
  const [existingConfig] = await db
    .select()
    .from(aiBrainConfig)
    .where(eq(aiBrainConfig.businessId, biz.id))
    .limit(1);

  const configData: Record<string, any> = {
    businessId: biz.id,
    updatedAt: new Date(),
  };
  if (services !== undefined) {
    configData.services = Array.isArray(services)
      ? JSON.stringify(services)
      : services;
  }
  if (businessHours !== undefined) {
    configData.businessHours =
      typeof businessHours === "object"
        ? JSON.stringify(businessHours)
        : businessHours;
  }
  if (greetingMessage !== undefined) configData.greetingMessage = greetingMessage;
  if (serviceArea !== undefined) {
    configData.serviceAreas =
      typeof serviceArea === "string" ? serviceArea : JSON.stringify(serviceArea);
  }
  if (emergencyService !== undefined) {
    configData.companyPolicies = `Emergency service: ${emergencyService}`;
  }

  if (existingConfig) {
    await db
      .update(aiBrainConfig)
      .set(configData)
      .where(eq(aiBrainConfig.id, existingConfig.id));
  } else {
    await db.insert(aiBrainConfig).values({
      id: generateId(),
      businessId: biz.id,
      services: configData.services ?? "[]",
      businessHours: configData.businessHours ?? "{}",
      greetingMessage: configData.greetingMessage ?? "Hello! How can I help you today?",
      serviceAreas: configData.serviceAreas ?? "[]",
      companyPolicies: configData.companyPolicies ?? "",
    });
  }

  // ── Save knowledge base items ──────────────────────────────
  if (Array.isArray(knowledgeItems) && knowledgeItems.length > 0) {
    for (const item of knowledgeItems) {
      if (item.title && item.content) {
        await db.insert(knowledgeDocument).values({
          id: generateId(),
          businessId: biz.id,
          title: item.title,
          type: item.type || "txt",
          content: item.content,
          fileUrl: item.fileUrl || "",
        });
      }
    }
  }

  return NextResponse.json({ success: true, onboardingComplete: true });
}
