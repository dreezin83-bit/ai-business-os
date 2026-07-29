/**
 * GET /api/carriers — return US carrier forwarding codes
 *
 * Optional query param: ?type=gsm|cdma to filter by network type.
 * Data is static — cached aggressively.
 */
import { NextResponse } from "next/server";
import { CARRIER_FORWARDING_CODES, getCarriers } from "@/lib/carriers";

const CACHE_HEADERS = {
  "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const typeParam = searchParams.get("type");

  const body =
    typeParam === "gsm" || typeParam === "cdma"
      ? { carriers: getCarriers(typeParam) }
      : { carriers: CARRIER_FORWARDING_CODES };

  return NextResponse.json(body, { headers: CACHE_HEADERS });
}
