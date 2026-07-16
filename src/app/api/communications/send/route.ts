import { NextResponse } from "next/server";
import { db } from "@/db";
import { communicationLog } from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { ensureBusiness } from "@/lib/business";
import { generateId } from "@/lib/utils";
import { sendEmail, sendSms, sendWhatsApp } from "@/lib/communications";

const validTypes = ["email", "sms", "whatsapp"] as const;
type CommType = (typeof validTypes)[number];

export async function POST(request: Request) {
  try {
    const businessId = await ensureBusiness();
    if (!businessId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { type, to, subject, body: messageBody, leadId } = body;

    // Validate type
    if (!type || !validTypes.includes(type)) {
      return NextResponse.json({ error: "Invalid type. Must be email, sms, or whatsapp" }, { status: 400 });
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
    if (type === "email" && !subject) {
      return NextResponse.json({ error: "Subject is required for email" }, { status: 400 });
    }

    // Send the communication
    let sendResult;
    switch (type as CommType) {
      case "email":
        sendResult = await sendEmail(to, subject || "", messageBody);
        break;
      case "sms":
        sendResult = await sendSms(to, messageBody);
        break;
      case "whatsapp":
        sendResult = await sendWhatsApp(to, messageBody);
        break;
    }

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