/**
 * GET /api/carriers — return US carrier forwarding codes
 *
 * Optional query param: ?type=gsm|cdma to filter by network type.
 */
import { NextResponse } from "next/server";
import { CARRIER_FORWARDING_CODES, getCarriers } from "@/lib/carriers";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const typeParam = searchParams.get("type");

  if (typeParam === "gsm" || typeParam === "cdma") {
    return NextResponse.json({ carriers: getCarriers(typeParam) });
  }

  return NextResponse.json({ carriers: CARRIER_FORWARDING_CODES });
}
