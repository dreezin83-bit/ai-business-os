import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Public uptime/health endpoint.
 *
 * Dependency-free by design (no auth, no DB) so uptime monitoring can ping it
 * even when the database or other services are down — that is the point of a
 * health check. Supports the "Platform health and API uptime" KPI.
 *
 * Returns 200 { status: "ok", uptime, timestamp } whenever reachable.
 * Declared public in src/proxy.ts so Clerk auth does not gate it.
 */
export async function GET() {
  return NextResponse.json(
    {
      status: "ok",
      uptime: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}
