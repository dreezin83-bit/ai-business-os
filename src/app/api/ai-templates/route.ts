/**
 * GET /api/ai-templates — returns all available AI Brain templates
 * Optionally filter by category: ?category=hvac
 */
import { NextResponse } from "next/server";
import { TEMPLATES, TEMPLATE_LIST } from "@/lib/ai-templates";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");

  if (category) {
    const template = TEMPLATES[category];
    if (!template) {
      return NextResponse.json(
        { error: "Template not found", category },
        { status: 404 }
      );
    }
    return NextResponse.json(template);
  }

  // Return summary list (without full prompt text to keep response lean)
  const summary = TEMPLATE_LIST.map((t) => ({
    category: t.category,
    label: t.label,
    services: t.services,
    emergencyService: t.emergencyService,
    greetingMessage: t.greetingMessage,
    serviceCount: t.services.length,
    faqCount: t.faqs.length,
  }));

  return NextResponse.json({ templates: summary, total: summary.length });
}
