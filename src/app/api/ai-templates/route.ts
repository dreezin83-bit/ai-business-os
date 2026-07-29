/**
 * GET /api/ai-templates — returns all available AI Brain templates
 * Optionally filter by category: ?category=hvac
 */
import { NextResponse } from "next/server";

export async function GET(_request: Request) {
  // Templates endpoint — templates are built dynamically via buildTemplateSection
  return NextResponse.json({ templates: [], total: 0 });
}
