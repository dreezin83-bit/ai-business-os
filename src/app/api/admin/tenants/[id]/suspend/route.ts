/**
 * POST /api/admin/tenants/[id]/suspend — suspend a tenant
 * Requires: Clerk admin role
 */
import { NextResponse } from "next/server";
import { db } from "@/db";
import { business } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/admin-auth";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized — admin only" }, { status: 403 });
  }

  const { id } = await params;

  const [biz] = await db.select().from(business).where(eq(business.id, id)).limit(1);
  if (!biz) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }

  await db
    .update(business)
    .set({ status: "suspended", suspendedAt: new Date(), updatedAt: new Date() })
    .where(eq(business.id, id));

  return NextResponse.json({ success: true, id, status: "suspended" });
}
