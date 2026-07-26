import { NextResponse } from "next/server";
import { ensureBusiness } from "@/lib/business";
import { sendEmail } from "@/lib/notifications";

export async function POST(request: Request) {
  try {
    const businessId = await ensureBusiness();
    if (!businessId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { to, subject, body } = await request.json();
    if (!to || !subject || !body) {
      return NextResponse.json({ error: "Missing to, subject, or body" }, { status: 400 });
    }

    // Validate email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
      return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
    }

    const result = await sendEmail(to, subject, body);

    if (result.success) {
      return NextResponse.json({ success: true, messageId: result.messageId });
    } else {
      return NextResponse.json({ success: false, error: result.error }, { status: 502 });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err?.message }, { status: 500 });
  }
}
