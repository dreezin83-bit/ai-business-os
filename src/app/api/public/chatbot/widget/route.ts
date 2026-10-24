import { NextResponse } from "next/server";
/**
 * GET /api/public/chatbot/widget — serves the chatbot embed script.
 *
 * The script contains a `__SAGENIFY_PLATFORM_URL__` token which is replaced
 * with the ORIGIN this request was served from. This keeps the widget
 * host-agnostic under the app subdomain split (owner decision 2026-10-23):
 * embeds loaded from www.sagenifyai.com talk to www, embeds loaded from
 * app.sagenifyai.com talk to the app subdomain — without any CORS or
 * hardcoded-domain coupling. Existing embeds keep working through the
 * transition because /api/* is never redirected by the middleware.
 *
 * Cache is per-URL (CDN cache keys include the host), so `public` is safe
 * even though the body is origin-dependent.
 */
export async function GET(request: Request) {
  const fs = await import("fs");
  const path = await import("path");
  const widgetPath = path.join(process.cwd(), "public", "widget.js");
  const content = fs.readFileSync(widgetPath, "utf-8");
  const origin = new URL(request.url).origin;
  const injected = content.includes("__SAGENIFY_PLATFORM_URL__")
    ? content.replaceAll("__SAGENIFY_PLATFORM_URL__", origin)
    : content;
  return new NextResponse(injected, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
      // Per-host body: make sure proxies key by full URL, not just path.
      "Vary": "Host",
    },
  });
}