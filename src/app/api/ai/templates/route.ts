import { NextResponse } from "next/server";
import { getAllTemplates } from "@/lib/industry-templates";

export async function GET() {
  try {
    const templates = getAllTemplates().map((t) => ({
      id: t.id,
      name: t.name,
      icon: t.icon,
      serviceCount: t.services.length,
    }));
    return NextResponse.json(templates);
  } catch (error) {
    console.error("Failed to fetch templates:", error);
    return NextResponse.json({ error: "Failed to fetch templates" }, { status: 500 });
  }
}