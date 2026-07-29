/**
 * GET /api/onboarding/status — check if onboarding is complete
 *
 * Returns { onboardingComplete: boolean }
 */
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { business } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [biz] = await db
    .select({ onboardingComplete: business.onboardingComplete })
    .from(business)
    .where(eq(business.ownerId, userId))
    .limit(1);

  return NextResponse.json(
    { onboardingComplete: biz?.onboardingComplete ?? false },
    {
      headers: {
        "Cache-Control": "private, max-age=30",
      },
    }
  );
}
