import { db } from "@/db";
import { business, aiBrainConfig } from "@/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@clerk/nextjs/server";
import { generateId } from "@/lib/utils";

export async function ensureBusiness() {
  const { userId } = await auth();
  if (!userId) return null;

  // Try to find existing business
  const [existing] = await db.select().from(business).where(eq(business.ownerId, userId)).limit(1);
  if (existing) return existing.id;

  // Auto-create business profile
  const id = generateId();
  const vapiWebhookToken = crypto.randomUUID();
  await db.insert(business).values({
    id,
    name: "My Business",
    ownerId: userId,
    phone: "",
    email: "",
    website: "",
    address: "",
    vapiWebhookToken,
    voiceSetupReady: false,  // Ready for phone provisioning once they upgrade
  });

  // Also create default AI brain config
  await db.insert(aiBrainConfig).values({
    id: generateId(),
    businessId: id,
    systemPrompt: "You are a helpful assistant for a service business. Answer questions about services, pricing, and scheduling.",
    businessInfo: "",
    services: "[]",
    faqs: "[]",
    pricingGuidance: "",
    companyPolicies: "",
    serviceAreas: "[]",
    businessHours: JSON.stringify([
        { day: "Monday", open: "09:00", close: "17:00", closed: false },
        { day: "Tuesday", open: "09:00", close: "17:00", closed: false },
        { day: "Wednesday", open: "09:00", close: "17:00", closed: false },
        { day: "Thursday", open: "09:00", close: "17:00", closed: false },
        { day: "Friday", open: "09:00", close: "17:00", closed: false },
        { day: "Saturday", open: "10:00", close: "15:00", closed: false },
        { day: "Sunday", open: "", close: "", closed: true },
      ]),
    greetingMessage: "Hello! How can I help you today?",
  });

  return id;
}