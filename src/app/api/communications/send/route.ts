import { NextResponse } from "next/server";
import { db } from "@/db";
import { communicationLog } from "@/db/schema";
import { ensureBusiness } from "@/lib/business";
import { generateId } from "@/lib/utils";
import { sendEmail } from "@/lib/communications";

const validTypes = ["email"] as const;
type CommType = (typeof validTypes)[number];

export async function POST(request: Request) {
  try {
    const businessId = await ensureBusiness();
    if (!businessId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = await request.json();
    const { type, to, subject, body: messageBody, leadId } = body;
    // Validate type (email only — SMS/WhatsApp are out of scope)
    if (!type || !validTypes.includes(type)) {
      return NextResponse.json({ error: "Invalid type. Only email is supported" }, { status: 400 });
    }
    // Validate recipient
    if (!to || typeof to !== "string") {
      return NextResponse.json({ error: "Recipient (to) is required" }, { status: 400 });
    }
    // Validate body
    if (!messageBody || typeof messageBody !== "string") {
      return NextResponse.json({ error: "Body is required" }, { status: 400 });
    }
    // Validate subject for email
    if (!subject) {
      return NextResponse.json({ error: "Subject is required for email" }, { status: 400 });
    }
    // Send the email
    const sendResult = await sendEmail(to, subject, messageBody);
    // Generate log entry
    const logEntry = {
      id: generateId(),
      businessId,
      leadId: leadId || null,
      type,
      toAddress: to,
      subject: subject || "",
      body: messageBody,
      status: sendResult.success ? "sent" : "failed",
      errorMessage: sendResult.error || "",
      externalId: sendResult.externalId || "",
    };
    await db.insert(communicationLog).values(logEntry);
    return NextResponse.json(logEntry, { status: sendResult.success ? 201 : 500 });
  } catch (error) {
    console.error("Failed to send communication:", error);
    return NextResponse.json({ error: "Failed to send communication" }, { status: 500 });
  }
}
