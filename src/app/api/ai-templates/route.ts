/**
 * GET /api/ai-templates — industry AI Brain templates + the business's
 * editable reply templates.
 *
 *   ?category=hvac  (optional — filter templates to one category)
 *
 * Response includes:
 *   templates               — real industry templates from lib/ai-templates,
 *                             shaped for the AI Brain page Template interface
 *                             { category, label, services, emergencyService,
 *                               greetingMessage, serviceCount, faqCount }
 *   total                   — number of templates returned
 *   businessReplyTemplates  — the business's editable reply template text
 *   usingDefaults           — true when no custom reply templates saved yet
 *
 * PUT /api/ai-templates — save the business's editable reply templates.
 *   Body: { replyTemplates: string }  (plain text; used verbatim by the AI)
 *   Auth required (tenant-isolated). Invalidates the cached AI context.
 */
import { NextResponse } from "next/server";
import { db } from "@/db";
import { aiBrainConfig } from "@/db/schema";
import { eq } from "drizzle-orm";
import { ensureBusiness } from "@/lib/business";
import { generateId } from "@/lib/utils";
import { invalidateAiContextCache } from "@/lib/ai-context-cache";
import { TEMPLATE_LIST } from "@/lib/ai-templates";

export async function GET(request: Request) {
  try {
    const businessId = await ensureBusiness();
    if (!businessId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const [config] = await db
      .select({ replyTemplates: aiBrainConfig.replyTemplates })
      .from(aiBrainConfig)
      .where(eq(aiBrainConfig.businessId, businessId))
      .limit(1);

    const businessReplyTemplates = config?.replyTemplates || "";

    // Real industry templates from lib/ai-templates, shaped to the AI Brain
    // page's Template interface (serviceCount/faqCount derived from data).
    const url = new URL(request.url);
    const category = url.searchParams.get("category");
    const templates = TEMPLATE_LIST.filter(
      (t) => !category || t.category === category,
    ).map((t) => ({
      category: t.category,
      label: t.label,
      services: t.services,
      emergencyService: t.emergencyService,
      greetingMessage: t.greetingMessage,
      serviceCount: t.services.length,
      faqCount: t.faqs.length,
    }));

    return NextResponse.json({
      templates,
      total: templates.length,
      businessReplyTemplates,
      usingDefaults: !businessReplyTemplates.trim(),
    });
  } catch (error) {
    console.error("Failed to fetch AI templates:", error);
    return NextResponse.json({ error: "Failed to fetch templates" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const businessId = await ensureBusiness();
    if (!businessId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    if (typeof body.replyTemplates !== "string") {
      return NextResponse.json(
        { error: "replyTemplates must be a string" },
        { status: 400 },
      );
    }
    const replyTemplates = body.replyTemplates;
    if (replyTemplates.length > 8000) {
      return NextResponse.json(
        { error: "replyTemplates is too long (max 8000 chars)" },
        { status: 400 },
      );
    }

    const [existing] = await db
      .select({ id: aiBrainConfig.id })
      .from(aiBrainConfig)
      .where(eq(aiBrainConfig.businessId, businessId))
      .limit(1);

    if (existing) {
      await db
        .update(aiBrainConfig)
        .set({ replyTemplates, updatedAt: new Date() })
        .where(eq(aiBrainConfig.id, existing.id));
    } else {
      await db.insert(aiBrainConfig).values({
        id: generateId(),
        businessId,
        replyTemplates,
      });
    }

    // Fresh templates must reach the AI immediately.
    invalidateAiContextCache(businessId);

    return NextResponse.json({
      success: true,
      businessReplyTemplates: replyTemplates,
      usingDefaults: !replyTemplates.trim(),
    });
  } catch (error) {
    console.error("Failed to save AI templates:", error);
    return NextResponse.json({ error: "Failed to save templates" }, { status: 500 });
  }
}
