import { NextResponse } from "next/server";

export async function GET() {
  const fs = await import("fs");
  const path = await import("path");
  const widgetPath = path.join(process.cwd(), "public", "widget.js");
  const content = fs.readFileSync(widgetPath, "utf-8");

  return new NextResponse(content, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}